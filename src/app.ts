import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import {
  fetchTimeTable,
  NeisClient,
  Neispy,
} from "@timeforschool/client";
import { Elysia, type Static, t } from "elysia";
import { CORS_ORIGINS, NEIS_API_KEY } from "./config.js";
import { ApiError, ErrorCode } from "./errors/api-error.js";
import {
  ApiErrorSchema,
  ClassNo,
  DateYmd,
  Grade,
  SchoolCode,
  SchoolName,
  Week,
} from "./schemas/common.js";
import {
  ApiMetaSchema,
  MealListSchema,
  ScheduleListSchema,
  SchoolInfoListSchema,
  TimetableResponseSchema,
} from "./schemas/responses.js";
import {
  assertSingleSchoolParam,
  lookupSchoolNameByCode,
  requireSchoolParam,
  resolveSchool,
} from "./services/school.js";
import { normalizeTimetablePeriod, omitNullsFromRows } from "./utils/json.js";

const REMOVE_PAREN_PATTERN = /\([^)]*\)/g;

const API_DESCRIPTION = `
TimeForSchool wraps the Korean **NEIS Open API** (school info, classes, meals, calendar) and **Comcigan** (weekly class timetables).

### School identifier
Use **either** \`schoolname\` **or** \`schoolcode\` (NEIS 7-digit code)—never both.

### Dates
\`startdate\` / \`enddate\` use **YYYYMMDD** (e.g. \`20250526\`).

### Errors
Failed requests return \`{ ok: false, error: { code, message, details? } }\` with an appropriate HTTP status.
`.trim();

function handleRoute<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error) => {
    throw ApiError.fromUnknown(error);
  });
}

export const app = new Elysia({ name: "timeforschool" })
  .use(
    cors({
      origin: CORS_ORIGINS,
      credentials: true,
    }),
  )
  .use(
    openapi({
      path: "/docs",
      documentation: {
        info: {
          title: "TimeForSchool API",
          version: "0.0.1",
          description: API_DESCRIPTION,
        },
        tags: [
          { name: "Meta", description: "Service metadata" },
          { name: "School", description: "NEIS school profile" },
          { name: "Classes", description: "Class numbers by grade" },
          { name: "Timetable", description: "Weekly timetable (Comcigan)" },
          { name: "Lunch", description: "Meal menus (NEIS)" },
          { name: "Schedule", description: "School calendar (NEIS)" },
        ],
      },
    }),
  )
  .onError(({ error, set, code }) => {
    if (code === "VALIDATION") {
      const apiError = ApiError.validation(
        "One or more query parameters are invalid.",
        {
          summary:
            error instanceof Error
              ? error.message
              : "See /docs for required formats.",
        },
      );
      set.status = apiError.status;
      return apiError.toJSON();
    }

    const apiError =
      error instanceof ApiError ? error : ApiError.fromUnknown(error);

    set.status = apiError.status;
    return apiError.toJSON();
  })
  .get(
    "/",
    () => ({
      name: "TimeForSchool",
      version: "0.0.1",
      docs: "/docs",
      openapi: "/docs/json",
    }),
    {
      detail: {
        tags: ["Meta"],
        summary: "API info",
        description: "Service name, version, and links to interactive documentation.",
      },
      response: {
        200: ApiMetaSchema,
      },
    },
  )
  .get(
    "/school",
    ({ query }) =>
      handleRoute(async () => {
        const schoolname = query.schoolname ?? "목운중학교";
        const client = new NeisClient({ key: NEIS_API_KEY });
        const schools = await client.schoolInfo({ SCHUL_NM: schoolname });
        return omitNullsFromRows(schools) as Static<typeof SchoolInfoListSchema>;
      }),
    {
      query: t.Object({
        schoolname: t.Optional(SchoolName),
      }),
      detail: {
        tags: ["School"],
        summary: "Search schools by name",
        description:
          "Returns all NEIS school records matching the name. Defaults to 목운중학교 when schoolname is omitted.",
      },
      response: {
        200: SchoolInfoListSchema,
        404: ApiErrorSchema,
        502: ApiErrorSchema,
      },
    },
  )
  .get(
    "/classes",
    ({ query }) =>
      handleRoute(async () => {
        assertSingleSchoolParam(query);
        requireSchoolParam(query);

        const school = await resolveSchool(query);
        const client = new Neispy({ key: NEIS_API_KEY });
        const classRows = await client.classInfo({
          ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
          SD_SCHUL_CODE: school.SD_SCHUL_CODE,
          GRADE: String(query.grade),
        });

        return [...new Set(classRows.map((row) => row.CLASS_NM))].sort(
          (a, b) => {
            const ai = Number.parseInt(a, 10);
            const bi = Number.parseInt(b, 10);
            if (Number.isNaN(ai) || Number.isNaN(bi)) return 0;
            return ai - bi;
          },
        );
      }),
    {
      query: t.Object({
        schoolname: t.Optional(SchoolName),
        schoolcode: t.Optional(SchoolCode),
        grade: Grade,
      }),
      detail: {
        tags: ["Classes"],
        summary: "List class numbers for a grade",
        description:
          "Returns sorted class names (반) for the given school and grade using NEIS classInfo.",
      },
      response: {
        200: t.Array(t.String()),
        400: ApiErrorSchema,
        404: ApiErrorSchema,
        502: ApiErrorSchema,
      },
    },
  )
  .get(
    "/timetable",
    ({ query }) =>
      handleRoute(async () => {
        const schoolname =
          typeof query.schoolname === "string" ? query.schoolname : undefined;
        const schoolcode =
          typeof query.schoolcode === "string" ? query.schoolcode : undefined;
        assertSingleSchoolParam({ schoolname, schoolcode });

        const grade = Number(query.grade);
        const classno = Number(query.classno);
        const week = Number(query.week ?? 0);

        if (!Number.isInteger(grade) || grade < 1) {
          throw ApiError.validation("grade must be a positive integer.", {
            grade: query.grade,
          });
        }
        if (!Number.isInteger(classno) || classno < 1) {
          throw ApiError.validation("classno must be a positive integer.", {
            classno: query.classno,
          });
        }

        let schoolName = schoolname;
        const schoolCodeParam = schoolcode;

        if (!schoolName) {
          if (!schoolCodeParam) {
            throw ApiError.missingSchoolIdentifier();
          }
          schoolName = await lookupSchoolNameByCode(schoolCodeParam);
        }

        const timetable = await fetchTimeTable({
          schoolName,
          schoolCode: schoolCodeParam ? Number(schoolCodeParam) : undefined,
          weekNum: week,
        });

        const weekDays = timetable.timetable[grade]?.[classno]?.slice(1);
        if (!weekDays?.length) {
          throw new ApiError(
            ErrorCode.TIMETABLE_INVALID_GRADE_CLASS,
            404,
            "No timetable found for this grade and class.",
            { grade, classno, schoolname: schoolName },
          );
        }

        return {
          day_time: timetable.dayTime,
          timetable: weekDays.map((day) => day.map(normalizeTimetablePeriod)),
          update_date: timetable.updateDate,
        } as Static<typeof TimetableResponseSchema>;
      }),
    {
      query: t.Object({
        grade: Grade,
        classno: ClassNo,
        week: Week,
        schoolname: t.Optional(SchoolName),
        schoolcode: t.Optional(SchoolCode),
      }),
      detail: {
        tags: ["Timetable"],
        summary: "Weekly class timetable",
        description:
          "Fetches the class schedule from Comcigan. Provide schoolname, or schoolcode alone (name is resolved via NEIS). week: 0 = this week, 1 = next week.",
      },
      response: {
        200: TimetableResponseSchema,
        400: ApiErrorSchema,
        404: ApiErrorSchema,
        409: ApiErrorSchema,
        502: ApiErrorSchema,
      },
    },
  )
  .get(
    "/lunch",
    ({ query }) =>
      handleRoute(async () => {
        assertSingleSchoolParam(query);
        requireSchoolParam(query);

        const school = await resolveSchool(query);
        const client = new Neispy({ key: NEIS_API_KEY });
        const meals = await client.mealServiceDietInfo({
          ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
          SD_SCHUL_CODE: school.SD_SCHUL_CODE,
          MLSV_FROM_YMD: query.startdate,
          MLSV_TO_YMD: query.enddate,
        });

        if (meals.length === 0) {
          throw ApiError.neisDataNotFound({
            endpoint: "mealServiceDietInfo",
            startdate: query.startdate,
            enddate: query.enddate,
            schoolname: school.SCHUL_NM,
          });
        }

        return omitNullsFromRows(
          meals.map((item) => ({
            ...item,
            DDISH_NM: item.DDISH_NM.replace(REMOVE_PAREN_PATTERN, "")
              .replaceAll(" <br/>", "\n")
              .replaceAll("<br/>", "\n"),
          })),
        ) as Static<typeof MealListSchema>;
      }),
    {
      query: t.Object({
        schoolname: t.Optional(SchoolName),
        schoolcode: t.Optional(SchoolCode),
        startdate: DateYmd,
        enddate: DateYmd,
      }),
      detail: {
        tags: ["Lunch"],
        summary: "Meal menus for a date range",
        description:
          "Returns NEIS mealServiceDietInfo rows. Parentheses are stripped from dish names; HTML line breaks become newlines.",
      },
      response: {
        200: MealListSchema,
        400: ApiErrorSchema,
        404: ApiErrorSchema,
        502: ApiErrorSchema,
      },
    },
  )
  .get(
    "/schedule",
    ({ query }) =>
      handleRoute(async () => {
        assertSingleSchoolParam(query);
        requireSchoolParam(query);

        const school = await resolveSchool(query);
        const client = new Neispy({ key: NEIS_API_KEY });
        const rows = await client.schoolSchedule({
          ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
          SD_SCHUL_CODE: school.SD_SCHUL_CODE,
          AA_FROM_YMD: query.startdate,
          AA_TO_YMD: query.enddate,
        });

        if (rows.length === 0) {
          throw ApiError.neisDataNotFound({
            endpoint: "SchoolSchedule",
            startdate: query.startdate,
            enddate: query.enddate,
            schoolname: school.SCHUL_NM,
          });
        }

        return omitNullsFromRows(rows) as Static<typeof ScheduleListSchema>;
      }),
    {
      query: t.Object({
        schoolname: t.Optional(SchoolName),
        schoolcode: t.Optional(SchoolCode),
        startdate: DateYmd,
        enddate: DateYmd,
      }),
      detail: {
        tags: ["Schedule"],
        summary: "School calendar events",
        description: "Returns NEIS SchoolSchedule rows between startdate and enddate (inclusive).",
      },
      response: {
        200: ScheduleListSchema,
        400: ApiErrorSchema,
        404: ApiErrorSchema,
        502: ApiErrorSchema,
      },
    },
  );

export default app;
