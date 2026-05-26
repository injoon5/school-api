import type {
  MealServiceDietInfoRow,
  SchoolInfoRow,
  SchoolScheduleRow,
} from "@timeforschool/client";
import type { Static } from "elysia";
import {
  MealListSchema,
  ScheduleListSchema,
  SchoolInfoListSchema,
  TimetableResponseSchema,
} from "./responses.js";
import { omitNullsFromRows } from "../utils/json.js";

const REMOVE_PAREN_PATTERN = /\([^)]*\)/g;

/** Runtime NEIS rows are validated at the route layer; casts live here only. */
export function mapSchoolInfoList(
  rows: SchoolInfoRow[],
): Static<typeof SchoolInfoListSchema> {
  return omitNullsFromRows(rows) as Static<typeof SchoolInfoListSchema>;
}

export function mapMealList(
  rows: MealServiceDietInfoRow[],
): Static<typeof MealListSchema> {
  return omitNullsFromRows(
    rows.map((item) => ({
      ...item,
      DDISH_NM: item.DDISH_NM.replace(REMOVE_PAREN_PATTERN, "")
        .replaceAll(" <br/>", "\n")
        .replaceAll("<br/>", "\n"),
    })),
  ) as Static<typeof MealListSchema>;
}

export function mapScheduleList(
  rows: SchoolScheduleRow[],
): Static<typeof ScheduleListSchema> {
  return omitNullsFromRows(rows) as Static<typeof ScheduleListSchema>;
}

export function mapTimetableResponse(input: {
  dayTime: string[];
  weekDays: Static<typeof TimetableResponseSchema>["timetable"];
  updateDate: string;
}): Static<typeof TimetableResponseSchema> {
  return {
    day_time: input.dayTime,
    timetable: input.weekDays,
    update_date: input.updateDate,
  } as Static<typeof TimetableResponseSchema>;
}
