import { Elysia } from "elysia";
import { ApiErrorSchema } from "../schemas/common.js";
import {
  ApiMetaSchema,
  ClassListSchema,
  MealListSchema,
  ScheduleListSchema,
  SchoolInfoListSchema,
  TimetableResponseSchema,
} from "../schemas/responses.js";

export const modelsPlugin = new Elysia({ name: "timeforschool.models" }).model({
  ApiMeta: ApiMetaSchema,
  ApiError: ApiErrorSchema,
  SchoolInfoList: SchoolInfoListSchema,
  ClassList: ClassListSchema,
  TimetableResponse: TimetableResponseSchema,
  MealList: MealListSchema,
  ScheduleList: ScheduleListSchema,
});
