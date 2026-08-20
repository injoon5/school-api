import { NeisClient } from "../neis/client.js";
import { NeisDataNotFoundError } from "../neis/errors.js";
import { pickSchoolRow } from "../neis/pick-school.js";
import type { SchoolInfoRow, TimetableRow } from "../neis/types.js";
import {
  TimetableInvalidWeekError,
  TimetableSchoolNotFoundError,
} from "./errors.js";
import type { FetchTimeTableOptions, TimeTableData, TimeTableResult } from "./types.js";

const KST = "Asia/Seoul";

export interface FetchNeisTimeTableOptions extends FetchTimeTableOptions {
  /**
   * Inclusive YYYYMMDD range. When both are set, `weekNum` is ignored.
   */
  fromYmd?: string;
  toYmd?: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function ymdFromParts(year: number, month: number, day: number): string {
  return `${year}${pad2(month)}${pad2(day)}`;
}

/** Calendar YMD in Asia/Seoul. */
export function kstYmd(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return ymdFromParts(year, month, day);
}

function weekdayFromYmd(ymd: string): number {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6));
  const day = Number(ymd.slice(6, 8));
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function addDaysYmd(ymd: string, days: number): string {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6));
  const day = Number(ymd.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return ymdFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function formatYmdDash(ymd: string): string {
  if (ymd.length < 8) return ymd;
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

/**
 * Monday–Sunday of this week (`weekNum=0`) or next (`weekNum=1`), in KST.
 */
export function weekYmdRange(
  weekNum = 0,
  now = new Date(),
): { fromYmd: string; toYmd: string; mondayYmd: string } {
  const today = kstYmd(now);
  const weekday = weekdayFromYmd(today);
  const offsetToMonday = weekday === 0 ? -6 : 1 - weekday;
  const mondayYmd = addDaysYmd(today, offsetToMonday + weekNum * 7);
  return {
    mondayYmd,
    fromYmd: mondayYmd,
    toYmd: addDaysYmd(mondayYmd, 6),
  };
}

function blankPeriod(period: number): TimeTableData {
  return {
    period,
    subject: "",
    teacher: "",
    replaced: false,
    original: null,
  };
}

function ensureGrid(
  data: TimeTableData[][][][],
  grade: number,
  classNo: number,
): void {
  while (data.length <= grade) data.push([]);
  while (data[grade].length <= classNo) data[grade].push([[]]);
  if (!Array.isArray(data[grade][classNo][0])) data[grade][classNo][0] = [];
}

function periodsForDay(rows: TimetableRow[]): TimeTableData[] {
  const byPeriod = new Map<number, TimeTableData>();

  for (const row of rows) {
    const period = Number(row.PERIO);
    if (!Number.isFinite(period) || period < 1) continue;
    const subject = row.ITRT_CNTNT ?? "";
    const existing = byPeriod.get(period);
    if (!existing) {
      byPeriod.set(period, {
        period,
        subject,
        teacher: "",
        replaced: false,
        original: null,
      });
      continue;
    }
    if (subject && existing.subject && existing.subject !== subject) {
      existing.subject = `${existing.subject} / ${subject}`;
    } else if (subject && !existing.subject) {
      existing.subject = subject;
    }
  }

  const maxPeriod = Math.max(0, ...byPeriod.keys());
  const result: TimeTableData[] = [];
  for (let period = 1; period <= maxPeriod; period += 1) {
    result.push(byPeriod.get(period) ?? blankPeriod(period));
  }
  return result;
}

/**
 * Fold NEIS timetable rows into the Comcigan `TimeTableResult` grid.
 *
 * Comcigan stays the source of truth for this shape. NEIS only fills it in.
 * Unavailable on NEIS (left blank — not invented, Comcigan not stripped):
 * - `teacher` — NEIS does not publish teacher names
 * - `dayTime` — period start times are not in the Open API
 * - `replaced` / `original` — no substitution original
 * - `homeroomTeachers`
 */
export function mapNeisTimetableRows(
  rows: TimetableRow[],
  meta: {
    school: SchoolInfoRow;
    mondayYmd: string;
  },
): TimeTableResult {
  const data: TimeTableData[][][][] = [[]];
  const byGradeClassDay = new Map<string, TimetableRow[]>();
  let latestLoad = "";
  let schoolYear = Number(rows[0]?.AY);
  if (!Number.isFinite(schoolYear)) schoolYear = Number(meta.mondayYmd.slice(0, 4));

  for (const row of rows) {
    const grade = Number(row.GRADE);
    const classNo = Number.parseInt(row.CLASS_NM, 10);
    if (!Number.isFinite(grade) || grade < 1) continue;
    if (!Number.isFinite(classNo) || classNo < 1) continue;
    const ymd = row.ALL_TI_YMD;
    if (!ymd) continue;
    const weekday = weekdayFromYmd(ymd);
    // Sunday = 0. Saturday NEIS rows are leftover 토요휴업일 — nobody
    // has Saturday class anymore; skip rather than surface stale days.
    if (weekday < 1 || weekday > 5) continue;
    const key = `${grade}:${classNo}:${ymd}`;
    const bucket = byGradeClassDay.get(key);
    if (bucket) bucket.push(row);
    else byGradeClassDay.set(key, [row]);
    if (row.LOAD_DTM && row.LOAD_DTM > latestLoad) latestLoad = row.LOAD_DTM;
  }

  const LAST_WEEKDAY = 5;

  for (const [key, dayRows] of byGradeClassDay) {
    const [gradeText, classText, ymd] = key.split(":");
    const grade = Number(gradeText);
    const classNo = Number(classText);
    if (ymd === undefined) continue;
    const weekday = weekdayFromYmd(ymd);
    ensureGrid(data, grade, classNo);
    const days = data[grade][classNo];
    while (days.length <= LAST_WEEKDAY) days.push([]);
    days[weekday] = periodsForDay(dayRows);
  }

  for (let grade = 1; grade < data.length; grade += 1) {
    for (let classNo = 1; classNo < data[grade].length; classNo += 1) {
      const days = data[grade][classNo];
      if (!days) continue;
      while (days.length <= LAST_WEEKDAY) days.push([]);
    }
  }

  return {
    schoolCode: Number(meta.school.SD_SCHUL_CODE),
    schoolName: meta.school.SCHUL_NM,
    localCode: 0,
    localName: meta.school.ATPT_OFCDC_SC_NM,
    schoolYear,
    startDate: formatYmdDash(meta.mondayYmd),
    dayTime: [],
    updateDate: latestLoad ? formatYmdDash(latestLoad) : "",
    timetable: data,
    homeroomTeachers: [],
  };
}

async function resolveSchool(
  client: NeisClient,
  options: FetchNeisTimeTableOptions,
): Promise<SchoolInfoRow> {
  if (options.school) return options.school;

  const schoolCode = options.schoolCode ? String(options.schoolCode) : undefined;
  let rows: SchoolInfoRow[];
  try {
    rows = schoolCode
      ? await client.schoolInfo({ SD_SCHUL_CODE: schoolCode })
      : await client.schoolInfo({ SCHUL_NM: options.schoolName });
  } catch (error) {
    if (error instanceof NeisDataNotFoundError) {
      throw new TimetableSchoolNotFoundError(options.schoolName);
    }
    throw error;
  }

  const picked = pickSchoolRow(rows, {
    schoolName: options.schoolName,
    schoolCode,
  });
  if (picked.ok) return picked.school;
  throw new TimetableSchoolNotFoundError(options.schoolName);
}

/**
 * Weekly class timetable from the NEIS Open API, shaped like Comcigan's result.
 */
export async function fetchNeisTimeTable(
  options: FetchNeisTimeTableOptions,
): Promise<TimeTableResult> {
  const weekNum = options.weekNum ?? 0;
  if (
    options.fromYmd === undefined &&
    options.toYmd === undefined &&
    weekNum !== 0 &&
    weekNum !== 1
  ) {
    throw new TimetableInvalidWeekError(weekNum);
  }

  const client = options.client ?? new NeisClient({ key: options.key });
  const school = await resolveSchool(client, options);
  const range =
    options.fromYmd && options.toYmd
      ? {
          fromYmd: options.fromYmd,
          toYmd: options.toYmd,
          mondayYmd: options.fromYmd,
        }
      : weekYmdRange(weekNum);

  const rows = await client.schoolTimetable(school.SCHUL_KND_SC_NM, {
    ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
    SD_SCHUL_CODE: school.SD_SCHUL_CODE,
    TI_FROM_YMD: range.fromYmd,
    TI_TO_YMD: range.toYmd,
  });

  return mapNeisTimetableRows(rows, {
    school,
    mondayYmd: range.mondayYmd,
  });
}
