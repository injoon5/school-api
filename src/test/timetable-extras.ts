/**
 * Unit tests for /timetable and /schedule extras (no network).
 */
import { weekStartYmd } from "../services/timetable-extras.js";
import { assert } from "./helpers.js";

function eq<T>(actual: T, expected: T, message: string): void {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

function testWeekStart(): void {
  // Friday 2026-10-02 13:57 KST.
  const friday = new Date("2026-10-02T04:57:00Z");
  eq(weekStartYmd(0, friday), "20260928", "week=0 on a Friday");
  eq(weekStartYmd(1, friday), "20261005", "week=1 on a Friday");

  // Sunday 2026-10-04 23:50 KST is still the current week.
  const sundayLate = new Date("2026-10-04T14:50:00Z");
  eq(weekStartYmd(0, sundayLate), "20260928", "Sunday 23:50 KST, week=0");
  eq(weekStartYmd(1, sundayLate), "20261005", "Sunday 23:50 KST, week=1");

  // Monday 2026-10-05 00:30 KST is Sunday 15:30 UTC: already the new week.
  const mondayEarly = new Date("2026-10-04T15:30:00Z");
  eq(weekStartYmd(0, mondayEarly), "20261005", "Monday 00:30 KST, week=0");
  eq(weekStartYmd(1, mondayEarly), "20261012", "Monday 00:30 KST, week=1");

  // Month boundary: Wednesday 2026-07-01 KST belongs to the week of 06-29.
  const julyFirst = new Date("2026-07-01T03:00:00Z");
  eq(weekStartYmd(0, julyFirst), "20260629", "month boundary, week=0");
  eq(weekStartYmd(1, julyFirst), "20260706", "month boundary, week=1");

  // Year boundary: Friday 2027-01-01 00:10 KST (still 2026 in UTC).
  const newYear = new Date("2026-12-31T15:10:00Z");
  eq(weekStartYmd(0, newYear), "20261228", "year boundary, week=0");
  eq(weekStartYmd(1, newYear), "20270104", "year boundary, week=1");

  // Sunday 2026-12-27 22:00 KST: next week starts in the same year.
  const sundayBeforeNewYear = new Date("2026-12-27T13:00:00Z");
  eq(weekStartYmd(1, sundayBeforeNewYear), "20261228", "Sunday before New Year, week=1");
}

testWeekStart();
console.log("✓ timetable extras: week_start");
