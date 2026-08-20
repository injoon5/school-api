export interface Lecture {
  period: number;
  subject: string;
  teacher: string;
}

export interface TimeTableData {
  period: number;
  subject: string;
  teacher: string;
  replaced: boolean;
  original: Lecture | null;
}

export interface TimeTableResult {
  schoolCode: number;
  schoolName: string;
  localCode: number;
  localName: string;
  schoolYear: number;
  startDate: string;
  dayTime: string[];
  updateDate: string;
  timetable: TimeTableData[][][][];
  homeroomTeachers: string[][];
}

export type TimetableSource = "comcigan" | "neis";

export interface FetchTimeTableOptions {
  schoolName: string;
  localCode?: number;
  /** Comcigan internal school code, or NEIS code when disambiguating */
  schoolCode?: number;
  /** 0 = current week, 1 = next week */
  weekNum?: number;
  /**
   * `comcigan` (default) scrapes 컴시간. `neis` uses the official
   * his/mis/els/spsTimetable Open API. NEIS leaves teacher names, period
   * times, and substitution originals blank — those fields are not published.
   */
  source?: TimetableSource;
  /** NEIS API key; used when `source` is `neis`. */
  key?: string;
}
