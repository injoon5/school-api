import type { TimeTableData, TimeTableResult } from "./types.js";

function isPresent(entry: TimeTableData): boolean {
  return (
    entry.subject.length > 0 ||
    entry.teacher.length > 0 ||
    entry.replaced ||
    entry.original !== null
  );
}

function shorterSubject(preferred: string, other: string): string {
  if (!preferred) return other;
  if (!other) return preferred;
  return preferred.length <= other.length ? preferred : other;
}

/**
 * `preferred` is Comcigan (better when it has data). `fallback` is NEIS.
 * Shorter non-empty subject wins. Missing periods/days fill from fallback.
 * Cancelled Comcigan periods (replaced + original) are data — not overwritten.
 */
export function mergePeriod(
  preferred: TimeTableData | undefined,
  fallback: TimeTableData | undefined,
): TimeTableData | undefined {
  if (!preferred && !fallback) return undefined;
  if (!preferred) return fallback ? { ...fallback } : undefined;
  if (!fallback) return { ...preferred };

  if (isPresent(preferred) && !preferred.subject && preferred.replaced) {
    return {
      period: preferred.period,
      subject: preferred.subject,
      teacher: preferred.teacher || fallback.teacher,
      replaced: preferred.replaced,
      original: preferred.original,
    };
  }

  return {
    period: preferred.period || fallback.period,
    subject: shorterSubject(preferred.subject, fallback.subject),
    teacher: preferred.teacher || fallback.teacher,
    replaced: preferred.replaced || fallback.replaced,
    original: preferred.original ?? fallback.original,
  };
}

function mergeDay(
  preferred: TimeTableData[] | undefined,
  fallback: TimeTableData[] | undefined,
): TimeTableData[] {
  const a = preferred ?? [];
  const b = fallback ?? [];
  if (a.length === 0) return b.map((entry) => ({ ...entry }));
  if (b.length === 0) return a.map((entry) => ({ ...entry }));

  const byPreferred = new Map(a.map((entry) => [entry.period, entry]));
  const byFallback = new Map(b.map((entry) => [entry.period, entry]));
  const maxPeriod = Math.max(0, ...byPreferred.keys(), ...byFallback.keys());
  const out: TimeTableData[] = [];
  for (let period = 1; period <= maxPeriod; period += 1) {
    const merged = mergePeriod(byPreferred.get(period), byFallback.get(period));
    if (merged) out.push(merged);
  }
  return out;
}

const FRIDAY = 5;
const SATURDAY = 6;

function mergeWeek(
  preferred: TimeTableData[][] | undefined,
  fallback: TimeTableData[][] | undefined,
): TimeTableData[][] {
  const a = preferred ?? [[]];
  const b = fallback ?? [[]];
  // Never invent Saturday from NEIS. Keep it only if Comcigan published it.
  const last = Math.max(a.length - 1, FRIDAY);
  const out: TimeTableData[][] = [];
  for (let day = 0; day <= last; day += 1) {
    if (day >= SATURDAY) {
      out[day] = (a[day] ?? []).map((entry) => ({ ...entry }));
      continue;
    }
    out[day] = mergeDay(a[day], b[day]);
  }
  return out;
}

function mergeGrids(
  preferred: TimeTableData[][][][],
  fallback: TimeTableData[][][][],
): TimeTableData[][][][] {
  const maxGrade = Math.max(preferred.length, fallback.length) - 1;
  const out: TimeTableData[][][][] = [[]];
  for (let grade = 1; grade <= maxGrade; grade += 1) {
    const aClasses = preferred[grade] ?? [];
    const bClasses = fallback[grade] ?? [];
    const maxClass = Math.max(aClasses.length, bClasses.length) - 1;
    out[grade] = [[[]]];
    for (let classNo = 1; classNo <= maxClass; classNo += 1) {
      out[grade][classNo] = mergeWeek(aClasses[classNo], bClasses[classNo]);
    }
  }
  return out;
}

function firstNonEmpty(preferred: string, fallback: string): string {
  return preferred.length > 0 ? preferred : fallback;
}

/**
 * Overlay NEIS onto Comcigan. Comcigan metadata (bell times, update stamp,
 * homeroom) wins when present. NEIS Saturday is ignored.
 */
export function mergeTimeTableResults(
  preferred: TimeTableResult,
  fallback: TimeTableResult,
): TimeTableResult {
  return {
    schoolCode: preferred.schoolCode || fallback.schoolCode,
    schoolName: firstNonEmpty(preferred.schoolName, fallback.schoolName),
    localCode: preferred.localCode || fallback.localCode,
    localName: firstNonEmpty(preferred.localName, fallback.localName),
    schoolYear: preferred.schoolYear || fallback.schoolYear,
    startDate: firstNonEmpty(preferred.startDate, fallback.startDate),
    dayTime:
      preferred.dayTime.length > 0 ? preferred.dayTime : fallback.dayTime,
    updateDate: firstNonEmpty(preferred.updateDate, fallback.updateDate),
    timetable: mergeGrids(preferred.timetable, fallback.timetable),
    homeroomTeachers:
      preferred.homeroomTeachers.length > 0
        ? preferred.homeroomTeachers
        : fallback.homeroomTeachers,
  };
}
