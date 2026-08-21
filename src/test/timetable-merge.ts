/**
 * Unit tests for Comcigan + NEIS timetable merge (no network).
 */
import {
  pickSchoolRow,
  type SchoolInfoRow,
  type TimetableRow,
} from "@timeforschool/client";
import {
  mapNeisTimetableRows,
  mergePeriod,
  mergeTimeTableResults,
  pickMergedTimeTable,
  timetableHasSubjects,
  TimetableAmbiguousSchoolError,
  TimetableSchoolNotFoundError,
  type TimeTableData,
  type TimeTableResult,
} from "@timeforschool/client/timetable";
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

  const merged = mergeTimeTableResults(
    result(classWeek([sun, monCom, tueCom, wedCom, thuCom, friCom])),
    result(
      classWeek([sun, monNeis, tueNeis, wedNeis, thuNeis, friNeis]),
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

  const school = {
    ATPT_OFCDC_SC_CODE: "B10",
    ATPT_OFCDC_SC_NM: "서울특별시교육청",
    LOAD_DTM: "",
    SD_SCHUL_CODE: "7010208",
    SCHUL_NM: "양정고등학교",
    SCHUL_KND_SC_NM: "고등학교",
  } as SchoolInfoRow;

  function neisRow(ymd: string, subject: string): TimetableRow {
    return {
      ATPT_OFCDC_SC_CODE: "B10",
      ATPT_OFCDC_SC_NM: "서울특별시교육청",
      LOAD_DTM: "20260820120000",
      SD_SCHUL_CODE: "7010208",
      SCHUL_NM: "양정고등학교",
      AY: "2026",
      SEM: "2",
      ALL_TI_YMD: ymd,
      GRADE: "1",
      CLASS_NM: "1",
      PERIO: "1",
      ITRT_CNTNT: subject,
    };
  }

  const mapped = mapNeisTimetableRows(
    [neisRow("20260817", "국어"), neisRow("20260822", "토요휴업일")],
    { school, mondayYmd: "20260817" },
  );
  assert(
    (mapped.timetable[1]?.[1]?.length ?? 0) <= 6,
    "NEIS mapper drops Saturday 토요휴업일",
  );
  assert(mapped.timetable[1][1][6] === undefined, "no Saturday day index");

  const high = { ...school, SCHUL_NM: "양정고등학교", SD_SCHUL_CODE: "1" } as SchoolInfoRow;
  const middle = { ...school, SCHUL_NM: "양정중학교", SD_SCHUL_CODE: "2" } as SchoolInfoRow;
  const seoul = { ...school, SCHUL_NM: "양정고등학교", SD_SCHUL_CODE: "7010208" } as SchoolInfoRow;
  const busan = { ...school, SCHUL_NM: "양정고등학교", SD_SCHUL_CODE: "7150152" } as SchoolInfoRow;
  const byName = pickSchoolRow([high, middle], { schoolName: "양정고등학교" });
  assert(byName.ok && byName.school.SD_SCHUL_CODE === "1", "exact NEIS name wins");
  const firstTwin = pickSchoolRow([seoul, busan], { schoolName: "양정고등학교" });
  assert(firstTwin.ok && firstTwin.school.SD_SCHUL_CODE === "7010208", "duplicate names keep first row");
  const partial = pickSchoolRow([high, middle], { schoolName: "양정" });
  assert(partial.ok && partial.school.SD_SCHUL_CODE === "1", "partial name keeps first NEIS row");
  const byCode = pickSchoolRow([high, middle], { schoolCode: "2" });
  assert(byCode.ok && byCode.school.SCHUL_NM === "양정중학교", "exact NEIS code wins");

  const neisOnly = result(classWeek([[], [period({ period: 1, subject: "국어" })]]));
  try {
    pickMergedTimeTable(
      { status: "rejected", reason: new TimetableAmbiguousSchoolError("양정고등학교") },
      { status: "fulfilled", value: neisOnly },
    );
    assert(false, "Comcigan 409 must win over NEIS success");
  } catch (error) {
    assert(
      error instanceof TimetableAmbiguousSchoolError,
      "auto keeps TIMETABLE_AMBIGUOUS_SCHOOL when Comcigan is ambiguous",
    );
  }

  const filledFromNeis = pickMergedTimeTable(
    { status: "rejected", reason: new TimetableSchoolNotFoundError("용인한국외국어대학교부설고등학교") },
    { status: "fulfilled", value: neisOnly },
  );
  assert(filledFromNeis.schoolName === "양정고등학교", "Comcigan 404 falls through to NEIS");

  const emptyComcigan = result(emptyGrid(), {
    schoolName: "컴시간만",
    dayTime: ["1(08:10)"],
    homeroomTeachers: [["김"]],
  });
  const neisWithData = result(
    classWeek([[], [period({ period: 1, subject: "국어" })]]),
    { schoolName: "나이스만", dayTime: [], homeroomTeachers: [] },
  );
  const onlyNeis = mergeTimeTableResults(emptyComcigan, neisWithData);
  assert(onlyNeis.schoolName === "나이스만", "empty Comcigan yields to NEIS");
  assert(onlyNeis.timetable[1][1][1][0].subject === "국어", "NEIS period kept as-is");
  assert(onlyNeis.dayTime.length === 0, "NEIS-only keeps blank bell times");

  const cancelledOnly = result(
    classWeek([
      [],
      [
        period({
          period: 1,
          subject: "",
          teacher: "",
          replaced: true,
          original: { period: 1, subject: "국", teacher: "김" },
        }),
      ],
    ]),
    { schoolName: "휴업" },
  );
  const onlyNeisOverCancel = mergeTimeTableResults(cancelledOnly, neisWithData);
  assert(
    onlyNeisOverCancel.schoolName === "나이스만",
    "cancelled-only Comcigan does not count as data",
  );

  const comciganWithData = result(
    classWeek([[], [period({ period: 1, subject: "국", teacher: "김" })]]),
    { schoolName: "컴시간", dayTime: ["1(08:10)"] },
  );
  const emptyNeis = result(emptyGrid(), {
    schoolName: "나이스빈",
    dayTime: [],
    homeroomTeachers: [],
  });
  const onlyComcigan = mergeTimeTableResults(comciganWithData, emptyNeis);
  assert(onlyComcigan.schoolName === "컴시간", "empty NEIS yields to Comcigan");
  assert(onlyComcigan.timetable[1][1][1][0].teacher === "김", "Comcigan teacher kept");
  assert(onlyComcigan.dayTime[0] === "1(08:10)", "Comcigan bell times kept");
  const pickedNeis = pickMergedTimeTable(
    { status: "fulfilled", value: emptyComcigan },
    { status: "fulfilled", value: neisWithData },
  );
  assert(pickedNeis.schoolName === "나이스만", "auto uses NEIS when Comcigan has no subjects");
  const pickedCom = pickMergedTimeTable(
    { status: "fulfilled", value: comciganWithData },
    { status: "fulfilled", value: emptyNeis },
  );
  assert(pickedCom.schoolName === "컴시간", "auto uses Comcigan when NEIS has no subjects");
  assert(!timetableHasSubjects(emptyNeis.timetable), "empty NEIS fixture has no subjects");
  assert(!timetableHasSubjects(cancelledOnly.timetable), "cancelled-only is not data");

  console.log("✓ timetable merge + school pick + NEIS Saturday drop");
}

run();
