import { NeisClient, NeisDataNotFoundError, pickSchoolRow, type SchoolInfoRow } from "@timeforschool/client";
import { NEIS_API_KEY } from "../config.js";
import { ApiError } from "../errors/api-error.js";

export interface SchoolIdentifier {
  schoolname?: string;
  schoolcode?: string;
}

/** Single place that constructs a NEIS client, so config/options stay consistent. */
export function createNeisClient(): NeisClient {
  return new NeisClient({ key: NEIS_API_KEY });
}

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
  client: NeisClient = createNeisClient(),
): Promise<SchoolInfoRow> {
  assertSingleSchoolParam(params);
  requireSchoolParam(params);

  let rows: SchoolInfoRow[];
  try {
    rows = params.schoolname
      ? await client.schoolInfo({ SCHUL_NM: params.schoolname })
      : await client.schoolInfo({ SD_SCHUL_CODE: params.schoolcode ?? "" });
  } catch (error) {
    if (error instanceof NeisDataNotFoundError) {
      throw ApiError.schoolNotFound({
        ...(params.schoolname ? { schoolname: params.schoolname } : {}),
        ...(params.schoolcode ? { schoolcode: params.schoolcode } : {}),
      });
    }
    throw error;
  }

  const picked = pickSchoolRow(rows, {
    schoolName: params.schoolname,
    schoolCode: params.schoolcode,
  });
  if (picked.ok) return picked.school;
  throw ApiError.schoolNotFound({
    ...(params.schoolname ? { schoolname: params.schoolname } : {}),
    ...(params.schoolcode ? { schoolcode: params.schoolcode } : {}),
  });
}
