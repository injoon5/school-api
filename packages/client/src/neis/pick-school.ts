import type { SchoolInfoRow } from "./types.js";

export type SchoolQuery = {
  schoolName?: string;
  schoolCode?: string;
};

export type PickSchoolResult =
  | { ok: true; school: SchoolInfoRow }
  | { ok: false; reason: "empty" };

/**
 * NEIS school pick: exact code, else first exact name, else the first row
 * NEIS returned. Duplicate official names (서울/부산 양정고) keep order.
 */
export function pickSchoolRow(
  rows: SchoolInfoRow[],
  query: SchoolQuery = {},
): PickSchoolResult {
  if (rows.length === 0) return { ok: false, reason: "empty" };

  const code = query.schoolCode?.trim();
  if (code) {
    const exact = rows.find((row) => row.SD_SCHUL_CODE === code);
    if (!exact) return { ok: false, reason: "empty" };
    return { ok: true, school: exact };
  }

  const name = query.schoolName?.trim();
  if (name) {
    const exact = rows.find((row) => row.SCHUL_NM === name);
    if (exact) return { ok: true, school: exact };
  }

  const first = rows[0];
  if (!first) return { ok: false, reason: "empty" };
  return { ok: true, school: first };
}
