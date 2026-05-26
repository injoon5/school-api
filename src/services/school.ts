import type { SchoolInfoRow } from "@timeforschool/client";
import type { SchoolIdentifier } from "../schemas/common.js";
import { ApiError } from "../errors/api-error.js";
import { createNeisClient } from "./neis.js";

export function assertSingleSchoolParam({
  schoolname,
  schoolcode,
}: SchoolIdentifier): void {
  if (schoolname && schoolcode) {
    throw ApiError.conflictingSchoolParams();
  }
}

export function requireSchoolParam({
  schoolname,
  schoolcode,
}: SchoolIdentifier): void {
  if (!schoolname && !schoolcode) {
    throw ApiError.missingSchoolIdentifier();
  }
}

export async function resolveSchool(
  params: SchoolIdentifier,
): Promise<SchoolInfoRow> {
  assertSingleSchoolParam(params);
  requireSchoolParam(params);

  const client = createNeisClient();
  const rows = params.schoolname
    ? await client.schoolInfo({ SCHUL_NM: params.schoolname })
    : await client.schoolInfo({ SD_SCHUL_CODE: params.schoolcode! });

  const school = rows[0];
  if (!school) {
    throw ApiError.schoolNotFound({
      ...(params.schoolname ? { schoolname: params.schoolname } : {}),
      ...(params.schoolcode ? { schoolcode: params.schoolcode } : {}),
    });
  }

  return school;
}

export async function lookupSchoolNameByCode(
  schoolcode: string,
): Promise<string> {
  const school = await resolveSchool({ schoolcode });
  return school.SCHUL_NM;
}
