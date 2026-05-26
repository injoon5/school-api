import { Elysia } from "elysia";
import { modelsPlugin } from "../../plugins/models.js";
import type { TimetableQueryParams } from "../../schemas/common.js";
import { TimetableQuery } from "./model.js";
import { getTimetable } from "./service.js";

export const timetableModule = new Elysia({
  name: "timeforschool.timetable",
})
  .use(modelsPlugin)
  .get(
    "/timetable",
    ({ query }: { query: TimetableQueryParams }) => getTimetable(query),
    {
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
    },
  );
