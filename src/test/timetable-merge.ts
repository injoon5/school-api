/**
 * Unit tests for Comcigan + NEIS timetable merge (no network).
 */
import {
  mergePeriod,
  mergeTimeTableResults,
} from "../../packages/client/src/timetable/merge.js";
import type {
  TimeTableData,
  TimeTableResult,
} from "../../packages/client/src/timetable/types.js";
import { assert } from "./helpers.js";

function period(
  partial: Partial<TimeTableData> & { period: number },
): TimeTableData {
  return {
    subject: "",
    teacher: "",
    replaced: false,
    original: null,
    ...partial,
  };
}

function emptyGrid(): TimeTableData[][][][] {
  return [[]];
}

function classWeek(days: TimeTableData[][]): TimeTableData[][][][] {
  const grid = emptyGrid();
  grid[1] = [[[]]];
  grid[1][1] = days;
  return grid;
}

function result(
  timetable: TimeTableData[][][][],
  extra: Partial<TimeTableResult> = {},
): TimeTableResult {
  return {
    schoolCode: 1,
    schoolName: "양정고등학교",
    localCode: 1,
    localName: "서울",
    schoolYear: 2026,
    startDate: "2026-08-17",
    dayTime: ["1(08:10)"],
    updateDate: "2026-08-17 09:00",
    timetable,
    homeroomTeachers: [["김"]],
    ...extra,
  };
}

function run(): void {
  const short = period({ period: 1, subject: "공영B", teacher: "이" });
  const long = period({ period: 1, subject: "공통영어2" });
  const shorter = mergePeriod(short, long);
  assert(shorter?.subject === "공영B", "shorter Comcigan subject wins");
  assert(shorter?.teacher === "이", "Comcigan teacher kept");

  const neisShorter = mergePeriod(
    period({ period: 1, subject: "공통영어2", teacher: "이" }),
    period({ period: 1, subject: "공영B" }),
  );
  assert(neisShorter?.subject === "공영B", "shorter NEIS subject wins");
  assert(neisShorter?.teacher === "이", "Comcigan teacher still kept");

  const filled = mergePeriod(
    period({ period: 2, subject: "", teacher: "" }),
    period({ period: 2, subject: "수학" }),
  );
  assert(filled?.subject === "수학", "empty Comcigan subject fills from NEIS");

  const cancelled = mergePeriod(
    period({
      period: 1,
      subject: "",
      teacher: "",
      replaced: true,
      original: { period: 1, subject: "국어", teacher: "박" },
    }),
    period({ period: 1, subject: "여름방학" }),
  );
  assert(cancelled?.subject === "", "cancelled Comcigan period is not filled");
  assert(cancelled?.replaced === true, "cancelled replaced flag kept");
  assert(cancelled?.original?.subject === "국어", "cancelled original kept");

  const sun: TimeTableData[] = [];
  const monCom = [period({ period: 1, subject: "국", teacher: "김" })];
  const tueCom: TimeTableData[] = [];
  const wedCom = [period({ period: 1, subject: "", teacher: "", replaced: true, original: { period: 1, subject: "수", teacher: "이" } })];
  const thuCom = [period({ period: 1, subject: "공통영어2", teacher: "최" })];
  const friCom = [period({ period: 1, subject: "체육", teacher: "정" })];

  const monNeis = [period({ period: 1, subject: "국어" }), period({ period: 2, subject: "과학" })];
  const tueNeis = [period({ period: 1, subject: "영어" })];
  const wedNeis = [period({ period: 1, subject: "여름방학" })];
  const thuNeis = [period({ period: 1, subject: "공영B" })];
  const friNeis = [period({ period: 1, subject: "체육" })];
  const satNeis = [period({ period: 1, subject: "토요휴업일" })];

  const merged = mergeTimeTableResults(
    result(classWeek([sun, monCom, tueCom, wedCom, thuCom, friCom])),
    result(
      classWeek([sun, monNeis, tueNeis, wedNeis, thuNeis, friNeis, satNeis]),
      { dayTime: [], updateDate: "2026-08-17", homeroomTeachers: [] },
    ),
  );

  const week = merged.timetable[1][1];
  assert(week.length === 6, `Mon–Fri only (plus Sunday pad), got ${week.length}`);
  assert(week[1][0].subject === "국", "shorter Monday subject");
  assert(week[1][1].subject === "과학", "missing Monday period 2 filled");
  assert(week[2][0].subject === "영어", "empty Tuesday filled from NEIS");
  assert(week[3][0].subject === "", "Wednesday cancellation kept");
  assert(week[4][0].subject === "공영B", "Thursday shorter NEIS name");
  assert(week[4][0].teacher === "최", "Thursday teacher from Comcigan");
  assert(week[5][0].subject === "체육", "Friday tie keeps Comcigan");
  assert(merged.dayTime[0] === "1(08:10)", "Comcigan bell times kept");

  console.log("✓ timetable merge: shorter name, fill gaps, skip NEIS Saturday, keep cancellations");
}

run();
