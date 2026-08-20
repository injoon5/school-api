import type { TimeTableData, TimeTableResult } from "./types.js";

function shorterSubject(comcigan: string, neis: string): string {
  if (!comcigan) return neis;
  if (!neis) return comcigan;
  return comcigan.length <= neis.length ? comcigan : neis;
}

function isCancelled(entry: TimeTableData): boolean {
  return entry.replaced && entry.subject.length === 0;
}

/**
 * Comcigan wins on a tie. Missing subject/teacher fills from NEIS.
 * Cancelled Comcigan periods stay cancelled.
 */
export function mergePeriod(
  comcigan: TimeTableData | undefined,
  neis: TimeTableData | undefined,
): TimeTableData | undefined {
  if (!comcigan && !neis) return undefined;
  if (!comcigan) return { ...neis! };
  if (!neis || isCancelled(comcigan)) return { ...comcigan };

  return {
    period: comcigan.period || neis.period,
    subject: shorterSubject(comcigan.subject, neis.subject),
    teacher: comcigan.teacher || neis.teacher,
    replaced: comcigan.replaced,
    original: comcigan.original ?? neis.original,
  };
}

function mergeDay(
  comcigan: TimeTableData[] | undefined,
  neis: TimeTableData[] | undefined,
): TimeTableData[] {
  const a = comcigan ?? [];
  const b = neis ?? [];
  if (a.length === 0) return b.map((entry) => ({ ...entry }));
  if (b.length === 0) return a.map((entry) => ({ ...entry }));

  const byComcigan = new Map(a.map((entry) => [entry.period, entry]));
  const byNeis = new Map(b.map((entry) => [entry.period, entry]));
  const maxPeriod = Math.max(0, ...byComcigan.keys(), ...byNeis.keys());
  const out: TimeTableData[] = [];
  for (let period = 1; period <= maxPeriod; period += 1) {
    const merged = mergePeriod(byComcigan.get(period), byNeis.get(period));
    if (merged) out.push(merged);
  }
  return out;
}

function mergeWeek(
  comcigan: TimeTableData[][] | undefined,
  neis: TimeTableData[][] | undefined,
): TimeTableData[][] {
  const a = comcigan ?? [[]];
  const b = neis ?? [[]];
  const last = Math.max(a.length, b.length) - 1;
  const out: TimeTableData[][] = [];
  for (let day = 0; day <= last; day += 1) {
    out[day] = mergeDay(a[day], b[day]);
  }
  return out;
}

function mergeGrids(
  comcigan: TimeTableData[][][][],
  neis: TimeTableData[][][][],
): TimeTableData[][][][] {
  const maxGrade = Math.max(comcigan.length, neis.length) - 1;
  const out: TimeTableData[][][][] = [[]];
  for (let grade = 1; grade <= maxGrade; grade += 1) {
    const aClasses = comcigan[grade] ?? [];
    const bClasses = neis[grade] ?? [];
    const maxClass = Math.max(aClasses.length, bClasses.length) - 1;
    out[grade] = [[[]]];
    for (let classNo = 1; classNo <= maxClass; classNo += 1) {
      out[grade][classNo] = mergeWeek(aClasses[classNo], bClasses[classNo]);
    }
  }
  return out;
}

function firstNonEmpty(comcigan: string, neis: string): string {
  return comcigan.length > 0 ? comcigan : neis;
}

/** Overlay NEIS onto Comcigan. Comcigan metadata wins when present. */
export function mergeTimeTableResults(
  comcigan: TimeTableResult,
  neis: TimeTableResult,
): TimeTableResult {
  return {
    schoolCode: comcigan.schoolCode || neis.schoolCode,
    schoolName: firstNonEmpty(comcigan.schoolName, neis.schoolName),
    localCode: comcigan.localCode || neis.localCode,
    localName: firstNonEmpty(comcigan.localName, neis.localName),
    schoolYear: comcigan.schoolYear || neis.schoolYear,
    startDate: firstNonEmpty(comcigan.startDate, neis.startDate),
    dayTime: comcigan.dayTime.length > 0 ? comcigan.dayTime : neis.dayTime,
    updateDate: firstNonEmpty(comcigan.updateDate, neis.updateDate),
    timetable: mergeGrids(comcigan.timetable, neis.timetable),
    homeroomTeachers:
      comcigan.homeroomTeachers.length > 0
        ? comcigan.homeroomTeachers
        : neis.homeroomTeachers,
  };
}
