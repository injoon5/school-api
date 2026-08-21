import type { NeisClient } from "../neis/client.js";
import type { SchoolInfoRow } from "../neis/types.js";

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

export type TimetableSource = "auto" | "comcigan" | "neis";

export interface FetchTimeTableOptions {
  schoolName: string;
  localCode?: number;
  /** Comcigan internal school code, or NEIS code when disambiguating */
  schoolCode?: number;
  /** 0 = current week, 1 = next week */
  weekNum?: number;
  /**
   * `auto` (default) fetches Comcigan and NEIS in parallel and merges per
   * period: use whichever side has a subject, shorter name when both do,
   * gaps fill from the other. NEIS Saturday is dropped (stale 토요휴업일).
   * Pin `comcigan` or `neis` for one upstream.
   */
  source?: TimetableSource;
  /** NEIS API key; used when `source` is `neis` or `auto`. */
  key?: string;
  /** Reuse an existing NEIS client (avoids a second construction on the HTTP path). */
  client?: NeisClient;
  /** Pre-resolved NEIS school row. Skips schoolInfo when set. */
  school?: SchoolInfoRow;
}
