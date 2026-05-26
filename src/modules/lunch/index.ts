import { Elysia } from "elysia";
import { modelsPlugin } from "../../plugins/models.js";
import type { DateRangeSchoolQueryParams } from "../../schemas/common.js";
import { DateRangeSchoolQuery } from "./model.js";
import { getMeals } from "./service.js";

export const lunchModule = new Elysia({ name: "timeforschool.lunch" })
  .use(modelsPlugin)
  .get("/lunch", ({ query }: { query: DateRangeSchoolQueryParams }) => getMeals(query), {
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
  });
