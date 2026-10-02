import { weekYmdRange } from "@timeforschool/client/timetable";

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
