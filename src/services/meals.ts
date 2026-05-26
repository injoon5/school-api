import type { MealServiceDietInfoRow } from "@timeforschool/client";
import type { Static } from "elysia";
import type { DateRangeSchoolQueryParams } from "../schemas/common.js";
import { MealListSchema } from "../schemas/responses.js";
import { ApiError } from "../errors/api-error.js";
import { omitNullsFromRows } from "../utils/json.js";
import {
  assertSingleSchoolParam,
  requireSchoolParam,
  resolveSchool,
} from "./school.js";
import { createNeispy } from "./neis.js";

const REMOVE_PAREN_PATTERN = /\([^)]*\)/g;

export async function getMeals(
  params: DateRangeSchoolQueryParams,
): Promise<Static<typeof MealListSchema>> {
  assertSingleSchoolParam(params);
  requireSchoolParam(params);

  const school = await resolveSchool(params);
  const meals: MealServiceDietInfoRow[] = await createNeispy().mealServiceDietInfo({
    ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
    SD_SCHUL_CODE: school.SD_SCHUL_CODE,
    MLSV_FROM_YMD: params.startdate,
    MLSV_TO_YMD: params.enddate,
  });

  if (meals.length === 0) {
    throw ApiError.neisDataNotFound({
      endpoint: "mealServiceDietInfo",
      startdate: params.startdate,
      enddate: params.enddate,
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
}
