import type { SchoolInfoRow } from "./types.js";

export type SchoolQuery = {
  schoolName?: string;
  schoolCode?: string;
};

export type PickSchoolResult =
  | { ok: true; school: SchoolInfoRow }
  | { ok: false; reason: "empty" | "ambiguous"; matches: SchoolInfoRow[] };

/**
 * One school-identity rule for NEIS rows: exact code, then exact name,
 * then a single leftover row. Multiple leftovers are ambiguous — never rows[0].
 */
export function pickSchoolRow(
  rows: SchoolInfoRow[],
  query: SchoolQuery = {},
): PickSchoolResult {
  if (rows.length === 0) return { ok: false, reason: "empty", matches: [] };

  const code = query.schoolCode?.trim();
  if (code) {
    const exact = rows.filter((row) => row.SD_SCHUL_CODE === code);
    if (exact.length === 1) return { ok: true, school: exact[0] };
    if (exact.length === 0) return { ok: false, reason: "empty", matches: [] };
    return { ok: false, reason: "ambiguous", matches: exact };
  }

  const name = query.schoolName?.trim();
  if (name) {
    const exact = rows.filter((row) => row.SCHUL_NM === name);
    if (exact.length === 1) return { ok: true, school: exact[0] };
    if (exact.length > 1) return { ok: false, reason: "ambiguous", matches: exact };
  }

  if (rows.length === 1) return { ok: true, school: rows[0] };
  return { ok: false, reason: "ambiguous", matches: rows };
}
