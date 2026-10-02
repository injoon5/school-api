import {
  NeisDataNotFoundError,
  type NeisClient,
  type SchoolInfoRow,
  type SchoolScheduleRow,
} from "@timeforschool/client";
import { addDaysYmd, weekYmdRange } from "@timeforschool/client/timetable";
import { resolveSchool } from "./school.js";

/**
 * `YYYYMMDD` Monday of the week a `/timetable` response describes, in KST
 * (the server runs in UTC). `week=0` is the current Mon–Sun week, `week=1`
 * the one after.
 */
export function weekStartYmd(week: number, now = new Date()): string {
  return weekYmdRange(week, now).mondayYmd;
}

export interface TimetableSlot {
  period: number;
  subject: string;
  teacher: string;
  replaced: boolean;
  original: unknown;
}

const MAKEUP_PREFIX = "[보강]";

/**
 * Add `cancelled` and `makeup` to a slot, leaving every existing field
 * (including `subject`) untouched.
 * - `cancelled`: substituted with nothing (`replaced` and empty `subject`),
 *   as on exam days.
 * - `makeup`: a make-up lesson, `subject` starts with `[보강]`.
 */
export function withSlotFlags<T extends TimetableSlot>(
  slot: T,
): T & { cancelled: boolean; makeup: boolean } {
  return {
    ...slot,
    cancelled: slot.replaced && slot.subject === "",
    makeup: slot.subject.startsWith(MAKEUP_PREFIX),
  };
}

/** NEIS SchoolSchedule column saying whether a row applies to grade N (1–6). */
const GRADE_EVENT_COLUMNS = [
  "ONE_GRADE_EVENT_YN",
  "TW_GRADE_EVENT_YN",
  "THREE_GRADE_EVENT_YN",
  "FR_GRADE_EVENT_YN",
  "FIV_GRADE_EVENT_YN",
  "SIX_GRADE_EVENT_YN",
] as const satisfies readonly (keyof SchoolScheduleRow)[];

type GradeEventColumns = Pick<
  SchoolScheduleRow,
  (typeof GRADE_EVENT_COLUMNS)[number]
>;

/** true when the row's `*_GRADE_EVENT_YN` for `grade` is `"Y"` (NEIS uses `"N"` or `"*"` otherwise). */
export function appliesToGrade(row: GradeEventColumns, grade: number): boolean {
  const column = GRADE_EVENT_COLUMNS[grade - 1];
  return column !== undefined && row[column] === "Y";
}

export function filterScheduleByGrade<T extends GradeEventColumns>(
  rows: T[],
  grade: number,
): T[] {
  return rows.filter((row) => appliesToGrade(row, grade));
}

export interface TimetableDay {
  date: string;
  closed: boolean;
  events: string[];
}

const CLOSED_DAY_KINDS = new Set(["공휴일", "휴업일"]);
/** Every Saturday carries one; it says nothing about the week. */
const IGNORED_EVENTS = new Set(["토요휴업일"]);

/**
 * One entry per timetable day (index-aligned, starting at `weekStart`), from
 * SchoolSchedule rows. Rows for other grades and `토요휴업일` are dropped;
 * `closed` is true when a kept row is a `공휴일` or `휴업일`.
 */
export function mapScheduleToDays(
  rows: SchoolScheduleRow[],
  weekStart: string,
  dayCount: number,
  grade: number,
): TimetableDay[] {
  const kept = filterScheduleByGrade(rows, grade).filter(
    (row) => !IGNORED_EVENTS.has(row.EVENT_NM),
  );
  return Array.from({ length: dayCount }, (_, index) => {
    const date = addDaysYmd(weekStart, index);
    const dayRows = kept.filter((row) => row.AA_YMD === date);
    const events = [
      ...new Set(dayRows.map((row) => row.EVENT_NM).filter(Boolean)),
    ];
    return {
      date,
      closed: dayRows.some((row) => CLOSED_DAY_KINDS.has(row.SBTR_DD_SC_NM)),
      events,
    };
  });
}

/**
 * SchoolSchedule rows for Mon–Sat of `weekStart`. Never rejects: an empty
 * range resolves to `[]`, any failure to `undefined`.
 */
export async function fetchWeekSchedule(
  client: NeisClient,
  school: SchoolInfoRow | { schoolname: string },
  weekStart: string,
): Promise<SchoolScheduleRow[] | undefined> {
  try {
    const resolved =
      "SD_SCHUL_CODE" in school
        ? school
        : await resolveSchool({ schoolname: school.schoolname }, client);
    return await client.schoolSchedule({
      ATPT_OFCDC_SC_CODE: resolved.ATPT_OFCDC_SC_CODE,
      SD_SCHUL_CODE: resolved.SD_SCHUL_CODE,
      AA_FROM_YMD: weekStart,
      AA_TO_YMD: addDaysYmd(weekStart, 5),
    });
  } catch (error) {
    if (error instanceof NeisDataNotFoundError) return [];
    console.warn("Timetable schedule join failed:", error);
    return undefined;
  }
}

/** Resolve `promise`, or `undefined` if it takes longer than `ms`. */
export async function withDeadline<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), ms);
  });
  try {
    return await Promise.race([promise, deadline]);
  } finally {
    clearTimeout(timer);
  }
}
