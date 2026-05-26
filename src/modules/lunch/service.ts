import type { MealServiceDietInfoRow } from "@timeforschool/client";
import type { Static } from "elysia";
import type { DateRangeSchoolQueryParams } from "../../schemas/common.js";
import { mapMealList } from "../../schemas/mappers.js";
import { MealListSchema } from "../../schemas/responses.js";
import { ApiError } from "../../errors/api-error.js";
import { createNeisClient } from "../../shared/neis.js";
import {
  assertSingleSchoolParam,
  requireSchoolParam,
  resolveSchool,
} from "../../shared/school.js";

export async function getMeals(
  params: DateRangeSchoolQueryParams,
): Promise<Static<typeof MealListSchema>> {
  assertSingleSchoolParam(params);
  requireSchoolParam(params);

  const school = await resolveSchool(params);
  const meals: MealServiceDietInfoRow[] =
    await createNeisClient().mealServiceDietInfo({
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

  return mapMealList(meals);
}
