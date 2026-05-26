import { Elysia } from "elysia";
import { modelsPlugin } from "../../plugins/models.js";
import type { SchoolSearchParams } from "../../schemas/common.js";
import { SchoolSearchQuery } from "./model.js";
import { searchSchoolsByName } from "./service.js";

export const schoolModule = new Elysia({ name: "timeforschool.school" })
  .use(modelsPlugin)
  .get(
  "/school",
  ({ query }: { query: SchoolSearchParams }) =>
    searchSchoolsByName(query.schoolname),
  {
    query: SchoolSearchQuery,
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
  );
