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
