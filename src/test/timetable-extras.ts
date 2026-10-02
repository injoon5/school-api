/**
 * Unit tests for /timetable and /schedule extras (no network).
 */
import {
  NeisDataNotFoundError,
  type NeisClient,
  type SchoolInfoRow,
  type SchoolScheduleRow,
} from "@timeforschool/client";
import {
  appliesToGrade,
  fetchWeekSchedule,
  filterScheduleByGrade,
  mapScheduleToDays,
  weekStartYmd,
  withDeadline,
  withSlotFlags,
} from "../services/timetable-extras.js";
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

function scheduleRow(
  date: string,
  name: string,
  kind: string,
  grades: string = "YYY***",
): SchoolScheduleRow {
  const [one, two, three, four, five, six] = grades.split("");
  return {
    ATPT_OFCDC_SC_CODE: "B10",
    ATPT_OFCDC_SC_NM: "서울특별시교육청",
    SD_SCHUL_CODE: "7010208",
    SCHUL_NM: "양정고등학교",
    AY: "2026",
    DGHT_CRSE_SC_NM: "주간",
    SCHUL_CRSE_SC_NM: "고등학교",
    SBTR_DD_SC_NM: kind,
    AA_YMD: date,
    EVENT_NM: name,
    EVENT_CNTNT: "",
    ONE_GRADE_EVENT_YN: one,
    TW_GRADE_EVENT_YN: two,
    THREE_GRADE_EVENT_YN: three,
    FR_GRADE_EVENT_YN: four,
    FIV_GRADE_EVENT_YN: five,
    SIX_GRADE_EVENT_YN: six,
    LOAD_DTM: "20261002000000",
  } as SchoolScheduleRow;
}

// NEIS SchoolSchedule for 양정고 2026-10-05..10, as fetched on 2026-10-02.
const OCTOBER_WEEK = [
  scheduleRow("20261005", "대체공휴일", "공휴일"),
  scheduleRow("20261007", "중간고사", "해당없음"),
  scheduleRow("20261008", "중간고사", "해당없음"),
  scheduleRow("20261009", "한글날", "공휴일"),
  scheduleRow("20261010", "토요휴업일", "휴업일"),
];

function testGradeFilter(): void {
  const third = scheduleRow("20261006", "3학년 모의고사", "해당없음", "NNY***");
  eq(appliesToGrade(third, 3), true, "Y applies");
  eq(appliesToGrade(third, 1), false, "N does not apply");
  eq(appliesToGrade(third, 4), false, "* does not apply");
  eq(appliesToGrade(third, 7), false, "out-of-range grade never applies");
  eq(
    filterScheduleByGrade([...OCTOBER_WEEK, third], 1).map((row) => row.EVENT_NM),
    ["대체공휴일", "중간고사", "중간고사", "한글날", "토요휴업일"],
    "grade 1 keeps school-wide rows, drops grade-3 rows, keeps raw rows",
  );
  eq(filterScheduleByGrade(OCTOBER_WEEK, 4), [], "grade 4 at a high school matches nothing");
}

function testScheduleDays(): void {
  eq(
    mapScheduleToDays(OCTOBER_WEEK, "20261005", 5, 1),
    [
      { date: "20261005", closed: true, events: ["대체공휴일"] },
      { date: "20261006", closed: false, events: [] },
      { date: "20261007", closed: false, events: ["중간고사"] },
      { date: "20261008", closed: false, events: ["중간고사"] },
      { date: "20261009", closed: true, events: ["한글날"] },
    ],
    "October week: Monday and Friday closed, exam days open",
  );

  eq(
    mapScheduleToDays(OCTOBER_WEEK, "20261005", 6, 1)[5],
    { date: "20261010", closed: false, events: [] },
    "토요휴업일 is dropped",
  );

  eq(
    mapScheduleToDays(OCTOBER_WEEK, "20261005", 5, 4).map((day) => day.closed),
    [false, false, false, false, false],
    "rows for other grades do not close the day",
  );

  eq(
    mapScheduleToDays(
      [
        scheduleRow("20261229", "방학식", "해당없음"),
        scheduleRow("20261229", "방학식", "해당없음"),
        scheduleRow("20261231", "겨울방학", "휴업일"),
        scheduleRow("20270101", "신정", "공휴일"),
      ],
      "20261228",
      5,
      2,
    ),
    [
      { date: "20261228", closed: false, events: [] },
      { date: "20261229", closed: false, events: ["방학식"] },
      { date: "20261230", closed: false, events: [] },
      { date: "20261231", closed: true, events: ["겨울방학"] },
      { date: "20270101", closed: true, events: ["신정"] },
    ],
    "year boundary, 휴업일 closes, duplicate names collapse",
  );

  eq(mapScheduleToDays([], "20261005", 5, 1).length, 5, "empty rows still give one entry per day");
  eq(mapScheduleToDays(OCTOBER_WEEK, "20261005", 0, 1), [], "no timetable days, no entries");
}

async function testFetchWeekSchedule(): Promise<void> {
  const school = { ATPT_OFCDC_SC_CODE: "B10", SD_SCHUL_CODE: "7010208" } as SchoolInfoRow;
  const requests: unknown[] = [];
  const client = (behaviour: () => Promise<SchoolScheduleRow[]>) =>
    ({
      schoolSchedule: (params: unknown) => {
        requests.push(params);
        return behaviour();
      },
    }) as unknown as NeisClient;

  const rows = await fetchWeekSchedule(
    client(async () => OCTOBER_WEEK),
    school,
    "20261005",
  );
  eq(rows?.length, 5, "rows pass through");
  eq(
    requests[0],
    {
      ATPT_OFCDC_SC_CODE: "B10",
      SD_SCHUL_CODE: "7010208",
      AA_FROM_YMD: "20261005",
      AA_TO_YMD: "20261010",
    },
    "requests Monday to Saturday",
  );

  const empty = await fetchWeekSchedule(
    client(async () => {
      throw new NeisDataNotFoundError("INFO-200", "해당하는 데이터가 없습니다.");
    }),
    school,
    "20261005",
  );
  eq(empty, [], "an empty range is [] (days with no events)");

  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const failed = await fetchWeekSchedule(
      client(async () => {
        throw new Error("ECONNRESET");
      }),
      school,
      "20261005",
    );
    eq(failed, undefined, "an outage is undefined (days omitted), never a throw");
  } finally {
    console.warn = originalWarn;
  }
}

async function testDeadline(): Promise<void> {
  eq(await withDeadline(Promise.resolve(1), 50), 1, "fast promise wins");
  const slow = new Promise<number>((resolve) => setTimeout(() => resolve(2), 200));
  eq(await withDeadline(slow, 10), undefined, "slow promise is cut off");
}

async function run(): Promise<void> {
  testWeekStart();
  testSlotFlags();
  testGradeFilter();
  testScheduleDays();
  await testFetchWeekSchedule();
  await testDeadline();
  console.log("✓ timetable extras: week_start, slot flags, grade filter, days");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
