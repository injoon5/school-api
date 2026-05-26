import { Elysia } from "elysia";
import { modelsPlugin } from "../../plugins/models.js";
import type { ClassesQueryParams } from "../../schemas/common.js";
import { ClassesQuery } from "./model.js";
import { listClassNames } from "./service.js";

export const classesModule = new Elysia({ name: "timeforschool.classes" })
  .use(modelsPlugin)
  .get("/classes", ({ query }: { query: ClassesQueryParams }) => listClassNames(query), {
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
  });
