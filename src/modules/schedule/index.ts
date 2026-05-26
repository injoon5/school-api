import { Elysia } from "elysia";
import { modelsPlugin } from "../../plugins/models.js";
import type { DateRangeSchoolQueryParams } from "../../schemas/common.js";
import { DateRangeSchoolQuery } from "./model.js";
import { getSchedule } from "./service.js";

export const scheduleModule = new Elysia({ name: "timeforschool.schedule" })
  .use(modelsPlugin)
  .get(
    "/schedule",
    ({ query }: { query: DateRangeSchoolQueryParams }) => getSchedule(query),
    {
      query: DateRangeSchoolQuery,
      detail: {
        tags: ["Schedule"],
        summary: "School calendar events",
        description:
          "Returns NEIS SchoolSchedule rows between startdate and enddate (inclusive).",
      },
      response: {
        200: "ScheduleList",
        400: "ApiError",
        404: "ApiError",
        502: "ApiError",
      },
    },
  );
