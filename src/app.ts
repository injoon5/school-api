import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia, t } from "elysia";
import { CORS_ORIGINS } from "./config.js";
import { ApiError } from "./errors/api-error.js";
import { openApiPluginConfig } from "./openapi-config.js";
import {
  ApiErrorSchema,
  ClassesQuery,
  DateRangeSchoolQuery,
  SchoolName,
  TimetableQuery,
} from "./schemas/common.js";
import {
  ApiMetaSchema,
  ClassListSchema,
  MealListSchema,
  ScheduleListSchema,
  SchoolInfoListSchema,
  TimetableResponseSchema,
} from "./schemas/responses.js";
import { listClassNames } from "./services/classes.js";
import { getMeals } from "./services/meals.js";
import { getSchedule } from "./services/schedule.js";
import { searchSchoolsByName } from "./services/school-info.js";
import { getTimetable } from "./services/timetable.js";

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
        200: "ApiMeta",
      },
    },
  )
  .get(
    "/school",
    ({ query }) =>
      handleRoute(() => searchSchoolsByName(query.schoolname)),
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
        200: "SchoolInfoList",
        404: "ApiError",
        502: "ApiError",
      },
    },
  )
  .get("/classes", ({ query }) => handleRoute(() => listClassNames(query)), {
    query: ClassesQuery,
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
  })
  .get("/timetable", ({ query }) => handleRoute(() => getTimetable(query)), {
    query: TimetableQuery,
    detail: {
      tags: ["Timetable"],
      summary: "Weekly class timetable",
      description:
        "Fetches the class schedule from Comcigan. Provide schoolname, or schoolcode alone (name is resolved via NEIS). week: 0 = this week, 1 = next week. Most periods have `replaced: false` and `original: null`; when a period was substituted, `replaced` is true and `original` is the class before the change.",
    },
    response: {
      200: "TimetableResponse",
      400: "ApiError",
      404: "ApiError",
      409: "ApiError",
      502: "ApiError",
    },
  })
  .get("/lunch", ({ query }) => handleRoute(() => getMeals(query)), {
    query: DateRangeSchoolQuery,
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
  })
  .get("/schedule", ({ query }) => handleRoute(() => getSchedule(query)), {
    query: DateRangeSchoolQuery,
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
  });

export default app;
