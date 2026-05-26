import type { Static } from "elysia";
import { SchoolInfoListSchema } from "../schemas/responses.js";
import { omitNullsFromRows } from "../utils/json.js";
import { createNeisClient } from "./neis.js";

const DEFAULT_SCHOOL_NAME = "목운중학교";

export async function searchSchoolsByName(
  schoolname: string = DEFAULT_SCHOOL_NAME,
): Promise<Static<typeof SchoolInfoListSchema>> {
  const schools = await createNeisClient().schoolInfo({ SCHUL_NM: schoolname });
  return omitNullsFromRows(schools) as Static<typeof SchoolInfoListSchema>;
}
