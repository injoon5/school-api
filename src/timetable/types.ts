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
