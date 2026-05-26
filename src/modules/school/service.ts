import type { Static } from "elysia";
import { mapSchoolInfoList } from "../../schemas/mappers.js";
import { SchoolInfoListSchema } from "../../schemas/responses.js";
import { createNeisClient } from "../../shared/neis.js";

const DEFAULT_SCHOOL_NAME = "목운중학교";

export async function searchSchoolsByName(
  schoolname?: string,
): Promise<Static<typeof SchoolInfoListSchema>> {
  const name = schoolname ?? DEFAULT_SCHOOL_NAME;
  const schools = await createNeisClient().schoolInfo({ SCHUL_NM: name });
  return mapSchoolInfoList(schools);
}
