import { fetchTimeTable } from "@timeforschool/client";
import type { Static } from "elysia";
import type { TimetableQueryParams } from "../schemas/common.js";
import { TimetableResponseSchema } from "../schemas/responses.js";
import { ApiError, ErrorCode } from "../errors/api-error.js";
import {
  assertSingleSchoolParam,
  lookupSchoolNameByCode,
} from "./school.js";

export async function getTimetable(
  params: TimetableQueryParams,
): Promise<Static<typeof TimetableResponseSchema>> {
  assertSingleSchoolParam(params);

  const grade = params.grade;
  const classno = params.classno;
  const week = params.week ?? 0;

  let schoolName = params.schoolname;
  const schoolCodeParam = params.schoolcode;

  if (!schoolName) {
    if (!schoolCodeParam) {
      throw ApiError.missingSchoolIdentifier();
    }
    schoolName = await lookupSchoolNameByCode(schoolCodeParam);
  }

  const timetable = await fetchTimeTable({
    schoolName,
    schoolCode: schoolCodeParam ? Number(schoolCodeParam) : undefined,
    weekNum: week,
  });

  const weekDays = timetable.timetable[grade]?.[classno]?.slice(1);
  if (!weekDays?.length) {
    throw new ApiError(
      ErrorCode.TIMETABLE_INVALID_GRADE_CLASS,
      404,
      "No timetable found for this grade and class.",
      { grade, classno, schoolname: schoolName },
    );
  }

  return {
    day_time: timetable.dayTime,
    timetable: weekDays,
    update_date: timetable.updateDate,
  } as Static<typeof TimetableResponseSchema>;
}
