import type { ClassInfoRow } from "@timeforschool/client";
import type { ClassesQueryParams } from "../../schemas/common.js";
import { createNeisClient } from "../../shared/neis.js";
import {
  assertSingleSchoolParam,
  requireSchoolParam,
  resolveSchool,
} from "../../shared/school.js";

export async function listClassNames(params: ClassesQueryParams): Promise<string[]> {
  assertSingleSchoolParam(params);
  requireSchoolParam(params);

  const school = await resolveSchool(params);
  const classRows: ClassInfoRow[] = await createNeisClient().classInfo({
    ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
    SD_SCHUL_CODE: school.SD_SCHUL_CODE,
    GRADE: String(params.grade),
  });

  return [...new Set(classRows.map((row) => row.CLASS_NM))].sort((a, b) => {
    const ai = Number.parseInt(a, 10);
    const bi = Number.parseInt(b, 10);
    if (Number.isNaN(ai) || Number.isNaN(bi)) return 0;
    return ai - bi;
  });
}
