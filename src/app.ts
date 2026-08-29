import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { openApiPluginConfig } from "./openapi-config.js";
import { fetchTimeTable } from "@timeforschool/client";
import { Elysia, type Static, t } from "elysia";
import { API_VERSION, APP_NAME, CORS_ORIGINS, NEIS_API_KEY } from "./config.js";
import { ApiError, ErrorCode } from "./errors/api-error.js";
import {
  ApiErrorSchema,
  ClassNo,
  DateYmd,
  Grade,
  SchoolName,
  SchoolQuery,
  TimetableSource,
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
  createNeisClient,
  resolveSchool,
} from "./services/school.js";
import { omitNullsFromRows } from "./utils/json.js";

const REMOVE_PAREN_PATTERN = /\([^)]*\)/g;
const BR_TAG_PATTERN = /\s*<br\s*\/?>/g;

const ClassListSchema = t.Array(t.String({ examples: ["1", "2", "3"] }));

/** Korean academic year starts in March; Jan/Feb belong to the previous year. */
function currentAcademicYear(now = new Date()): string {
  const year = now.getFullYear();
  return String(now.getMonth() + 1 < 3 ? year - 1 : year);
}

export const app = new Elysia({ name: "timeforschool-api" })
  .use(
    cors({
      origin: CORS_ORIGINS,
    }),
  )
  .use(openapi(openApiPluginConfig))
  .model({
    ApiMeta: ApiMetaSchema,
    ApiError: ApiErrorSchema,
    SchoolInfoList: SchoolInfoListSchema,
    ClassList: ClassListSchema,
    TimetableResponse: TimetableResponseSchema,
    MealList: MealListSchema,
    ScheduleList: ScheduleListSchema,
  })
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
      name: APP_NAME,
      version: API_VERSION,
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
        200: "ApiMeta",
      },
    },
  )
  .get(
    "/school",
    async ({ query }) => {
      const client = createNeisClient();
      const schools = await client.schoolInfo({ SCHUL_NM: query.schoolname });
      return omitNullsFromRows(schools) as Static<typeof SchoolInfoListSchema>;
    },
    {
      query: t.Object({
        schoolname: SchoolName,
      }),
      detail: {
        tags: ["School"],
        summary: "Search schools by name",
        description:
          "Returns all NEIS school records matching schoolname (required).",
      },
      response: {
        200: "SchoolInfoList",
        400: "ApiError",
        404: "ApiError",
        502: "ApiError",
      },
    },
  )
  .get(
    "/classes",
    async ({ query }) => {
      const client = createNeisClient();
      const school = await resolveSchool(query, client);
      const classRows = await client.classInfo({
        ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
        SD_SCHUL_CODE: school.SD_SCHUL_CODE,
        AY: currentAcademicYear(),
        GRADE: String(query.grade),
      });

      return [...new Set(classRows.map((row) => row.CLASS_NM))].sort((a, b) => {
        const ai = Number.parseInt(a, 10);
        const bi = Number.parseInt(b, 10);
        const aNum = Number.isNaN(ai);
        const bNum = Number.isNaN(bi);
        // Numeric class names sort ascending; non-numeric names sort after,
        // then lexicographically — a total order so results are stable.
        if (aNum && bNum) return a.localeCompare(b);
        if (aNum) return 1;
        if (bNum) return -1;
        if (ai !== bi) return ai - bi;
        return a.localeCompare(b);
      });
    },
    {
      query: t.Composite([
        SchoolQuery,
        t.Object({
          grade: Grade,
        }),
      ]),
      detail: {
        tags: ["Classes"],
        summary: "List class numbers for a grade",
        description:
          "Returns sorted class names (반) for the given school and grade using NEIS classInfo.",
      },
      response: {
        200: "ClassList",
        400: "ApiError",
        404: "ApiError",
        502: "ApiError",
      },
    },
  )
  .get(
    "/timetable",
    async ({ query }) => {
      const { schoolname, schoolcode } = query;
      assertSingleSchoolParam({ schoolname, schoolcode });

      const grade = query.grade;
      const classno = query.classno;
      const week = query.week ?? 0;
      const source = query.source ?? "auto";
      const client = createNeisClient();

      let schoolName = schoolname;
      let school = undefined;
      if (!schoolName) {
        if (!schoolcode) {
          throw ApiError.missingSchoolIdentifier();
        }
        school = await resolveSchool({ schoolcode }, client);
        schoolName = school.SCHUL_NM;
      }

      const timetable = await fetchTimeTable({
        schoolName,
        schoolCode: schoolcode ? Number(schoolcode) : undefined,
        weekNum: week,
        source,
        key: NEIS_API_KEY,
        client,
        school,
      });

      const weekDays = timetable.timetable[grade]?.[classno]?.slice(1);
      if (!weekDays?.length) {
        throw new ApiError(
          ErrorCode.TIMETABLE_INVALID_GRADE_CLASS,
          404,
          "No timetable found for this grade and class.",
          { grade, classno, schoolname: timetable.schoolName, source },
        );
      }

      return {
        day_time: timetable.dayTime,
        timetable: weekDays,
        update_date: timetable.updateDate,
      } as Static<typeof TimetableResponseSchema>;
    },
    {
      query: t.Composite([
        SchoolQuery,
        t.Object({
          grade: Grade,
          classno: ClassNo,
          week: Week,
          source: TimetableSource,
        }),
      ]),
      detail: {
        tags: ["Timetable"],
        summary: "Weekly class timetable",
        description:
          "Fetches the class schedule. Default `source=auto` calls Comcigan and NEIS in parallel and merges them per period: whichever side has a subject is used, the shorter name wins when both do, and missing weekdays/periods fill from the other source. Empty or cancelled Comcigan periods still fill from NEIS. NEIS Saturday is ignored (stale 토요휴업일). Pin `source=comcigan` or `source=neis` to hit a single upstream. Provide schoolname, or schoolcode alone. week: 0 = this week, 1 = next week. Comcigan substitutions use `replaced` + `original`. `day_time` always comes from Comcigan and is blank when Comcigan has none. `teacher` also stays blank when Comcigan has no data.",
      },
      response: {
        200: "TimetableResponse",
        400: "ApiError",
        404: "ApiError",
        409: "ApiError",
        502: "ApiError",
      },
    },
  )
  .get(
    "/lunch",
    async ({ query }) => {
      const client = createNeisClient();
      const school = await resolveSchool(query, client);
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
          DDISH_NM: item.DDISH_NM.replace(REMOVE_PAREN_PATTERN, "").replace(
            BR_TAG_PATTERN,
            "\n",
          ),
        })),
      ) as Static<typeof MealListSchema>;
    },
    {
      query: t.Composite([
        SchoolQuery,
        t.Object({
          startdate: DateYmd,
          enddate: DateYmd,
        }),
      ]),
      detail: {
        tags: ["Lunch"],
        summary: "Meal menus for a date range",
        description:
          "Returns NEIS mealServiceDietInfo rows. Parentheses are stripped from dish names; HTML line breaks become newlines.",
      },
      response: {
        200: "MealList",
        400: "ApiError",
        404: "ApiError",
        502: "ApiError",
      },
    },
  )
  .get(
    "/schedule",
    async ({ query }) => {
      const client = createNeisClient();
      const school = await resolveSchool(query, client);
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
    },
    {
      query: t.Composite([
        SchoolQuery,
        t.Object({
          startdate: DateYmd,
          enddate: DateYmd,
        }),
      ]),
      detail: {
        tags: ["Schedule"],
        summary: "School calendar events",
        description: "Returns NEIS SchoolSchedule rows between startdate and enddate (inclusive).",
      },
      response: {
        200: "ScheduleList",
        400: "ApiError",
        404: "ApiError",
        502: "ApiError",
      },
    },
  );

export default app;
