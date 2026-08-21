import { NeisDataNotFoundError } from "../neis/errors.js";
import { fetchComciganTimeTable } from "./comcigan.js";
import { mergeTimeTableResults } from "./merge.js";
import { fetchNeisTimeTable } from "./neis.js";
import {
  TimetableAmbiguousSchoolError,
  TimetableInvalidWeekError,
  TimetableSchoolNotFoundError,
} from "./errors.js";
import type { FetchTimeTableOptions, TimeTableResult } from "./types.js";

export type {
  FetchTimeTableOptions,
  Lecture,
  TimeTableData,
  TimeTableResult,
  TimetableSource,
} from "./types.js";
export { fetchNeisTimeTable, mapNeisTimetableRows } from "./neis.js";
export { mergeTimeTableResults, mergePeriod } from "./merge.js";
export type { FetchNeisTimeTableOptions } from "./neis.js";
export {
  TimetableAmbiguousSchoolError,
  TimetableError,
  TimetableInvalidWeekError,
  TimetableParseError,
  TimetableSchoolNotFoundError,
} from "./errors.js";

function assertWeekNum(weekNum: number): void {
  if (weekNum !== 0 && weekNum !== 1) {
    throw new TimetableInvalidWeekError(weekNum);
  }
}

/**
 * Combine Comcigan + NEIS `allSettled` results.
 * Comcigan name collisions stay 409 even when NEIS succeeded.
 */
export function pickMergedTimeTable(
  comcigan: PromiseSettledResult<TimeTableResult>,
  neis: PromiseSettledResult<TimeTableResult>,
): TimeTableResult {
  const comciganErr = comcigan.status === "rejected" ? comcigan.reason : undefined;
  const neisErr = neis.status === "rejected" ? neis.reason : undefined;

  if (comciganErr instanceof TimetableAmbiguousSchoolError) throw comciganErr;

  if (comcigan.status === "fulfilled" && neis.status === "fulfilled") {
    return mergeTimeTableResults(comcigan.value, neis.value);
  }
  if (comcigan.status === "fulfilled") return comcigan.value;
  if (neis.status === "fulfilled") return neis.value;

  if (neisErr instanceof TimetableAmbiguousSchoolError) throw neisErr;
  // Empty week after the school resolved — not a missing school.
  if (neisErr instanceof NeisDataNotFoundError) throw neisErr;
  if (comciganErr instanceof TimetableSchoolNotFoundError) throw comciganErr;
  if (neisErr instanceof TimetableSchoolNotFoundError) throw neisErr;
  if (comciganErr !== undefined) throw comciganErr;
  throw neisErr ?? new Error("Timetable merge failed");
}

function fetchMergedTimeTable(
  options: FetchTimeTableOptions,
): Promise<TimeTableResult> {
  return Promise.allSettled([
    fetchComciganTimeTable(options),
    fetchNeisTimeTable(options),
  ]).then(([comcigan, neis]) => pickMergedTimeTable(comcigan, neis));
}

/**
 * Weekly class timetable. Default `source` is `auto`: Comcigan + NEIS in
 * parallel, then merge per period (whichever side has a subject; shorter
 * name wins when both do). Weekday/period gaps fill from the other. NEIS
 * Saturday is dropped in the mapper. Pin `comcigan` or `neis` for one upstream.
 */
export async function fetchTimeTable(
  options: FetchTimeTableOptions,
): Promise<TimeTableResult> {
  const weekNum = options.weekNum ?? 0;
  assertWeekNum(weekNum);
  const source = options.source ?? "auto";
  switch (source) {
    case "neis":
      return fetchNeisTimeTable(options);
    case "comcigan":
      return fetchComciganTimeTable(options);
    case "auto":
      return fetchMergedTimeTable(options);
    default: {
      const exhaustive: never = source;
      throw new Error(`Unhandled timetable source: ${String(exhaustive)}`);
    }
  }
}
