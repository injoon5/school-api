import type { SchoolScheduleRow } from "@timeforschool/client";
import type { Static } from "elysia";
import type { DateRangeSchoolQueryParams } from "../../schemas/common.js";
import { mapScheduleList } from "../../schemas/mappers.js";
import { ScheduleListSchema } from "../../schemas/responses.js";
import { ApiError } from "../../errors/api-error.js";
import { createNeisClient } from "../../shared/neis.js";
import {
  assertSingleSchoolParam,
  requireSchoolParam,
  resolveSchool,
} from "../../shared/school.js";

export async function getSchedule(
  params: DateRangeSchoolQueryParams,
): Promise<Static<typeof ScheduleListSchema>> {
  assertSingleSchoolParam(params);
  requireSchoolParam(params);

  const school = await resolveSchool(params);
  const rows: SchoolScheduleRow[] = await createNeisClient().schoolSchedule({
    ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
    SD_SCHUL_CODE: school.SD_SCHUL_CODE,
    AA_FROM_YMD: params.startdate,
    AA_TO_YMD: params.enddate,
  });

  if (rows.length === 0) {
    throw ApiError.neisDataNotFound({
      endpoint: "SchoolSchedule",
      startdate: params.startdate,
      enddate: params.enddate,
      schoolname: school.SCHUL_NM,
    });
  }

  return mapScheduleList(rows);
}
