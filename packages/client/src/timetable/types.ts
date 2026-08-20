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
   * `comcigan` (default, preferred) scrapes 컴시간 — fresher updates, teachers,
   * bell times, substitutions. `neis` is a fallback for schools that do not
   * use Comcigan. NEIS is mapped onto the Comcigan result shape; fields the
   * Open API does not publish are left blank.
   */
  source?: TimetableSource;
  /** NEIS API key; used when `source` is `neis`. */
  key?: string;
}
