import type { TimeTableData } from "@timeforschool/client";

/** Drop null values so JSON responses and OpenAPI examples stay clean. */
export function omitNulls<T extends Record<string, unknown>>(row: T): T {
  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== null),
  ) as T;
}

export function omitNullsFromRows<T extends Record<string, unknown>>(
  rows: T[],
): T[] {
  return rows.map(omitNulls);
}

/** Omit empty or incomplete Comcigan `original` lecture objects. */
export function normalizeTimetablePeriod(
  period: TimeTableData,
): Omit<TimeTableData, "original"> & { original?: TimeTableData["original"] } {
  const { original, ...rest } = period;
  const hasOriginal =
    original != null &&
    typeof original.period === "number" &&
    typeof original.subject === "string" &&
    original.subject.length > 0;

  if (!hasOriginal) return rest;

  return { ...rest, original };
}
