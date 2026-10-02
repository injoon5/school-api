/**
 * Unit tests for /timetable and /schedule extras (no network).
 */
import { weekStartYmd, withSlotFlags } from "../services/timetable-extras.js";
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

function testSlotFlags(): void {
  const cancelled = withSlotFlags({
    period: 1,
    subject: "",
    teacher: "",
    replaced: true,
    original: { period: 1, subject: "국사", teacher: "김기*" },
  });
  eq(cancelled, {
    period: 1,
    subject: "",
    teacher: "",
    replaced: true,
    original: { period: 1, subject: "국사", teacher: "김기*" },
    cancelled: true,
    makeup: false,
  }, "exam-day slot is cancelled, other fields and key order untouched");

  const makeup = withSlotFlags({
    period: 6,
    subject: "[보강]음악 연주와 창작",
    teacher: "",
    replaced: false,
    original: null,
  });
  eq(makeup.subject, "[보강]음악 연주와 창작", "makeup subject unchanged");
  eq([makeup.cancelled, makeup.makeup], [false, true], "[보강] is a makeup");

  const substituted = withSlotFlags({
    period: 5,
    subject: "음악",
    teacher: "최현*",
    replaced: true,
    original: { period: 5, subject: "음악", teacher: "이용*" },
  });
  eq([substituted.cancelled, substituted.makeup], [false, false], "substitution with a subject is not cancelled");

  const exam = withSlotFlags({
    period: 4,
    subject: "중간고사공통국어2",
    teacher: "",
    replaced: false,
    original: null,
  });
  eq([exam.cancelled, exam.makeup], [false, false], "exam period is neither");

  const empty = withSlotFlags({
    period: 8,
    subject: "",
    teacher: "",
    replaced: false,
    original: null,
  });
  eq(empty.cancelled, false, "empty but not replaced is not cancelled");

  const midMakeup = withSlotFlags({
    period: 2,
    subject: "음악[보강]",
    teacher: "",
    replaced: false,
    original: null,
  });
  eq(midMakeup.makeup, false, "[보강] only counts as a prefix");
}

testWeekStart();
testSlotFlags();
console.log("✓ timetable extras: week_start, slot flags");
