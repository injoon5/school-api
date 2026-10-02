import { weekYmdRange } from "@timeforschool/client/timetable";

/**
 * `YYYYMMDD` Monday of the week a `/timetable` response describes, in KST
 * (the server runs in UTC). `week=0` is the current Mon–Sun week, `week=1`
 * the one after.
 */
export function weekStartYmd(week: number, now = new Date()): string {
  return weekYmdRange(week, now).mondayYmd;
}
