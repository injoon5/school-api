/**
 * NEIS vs Comcigan timetable source: 양정고 (has both) and 외대부고 (NEIS only).
 */
import { fetchNeisTimeTable } from "@timeforschool/client";
import { app } from "../app.js";
import {
  assert,
  assertTimetablePeriod,
  assertTimetableResponse,
  isErrorBody,
  requestJson,
  type TimetablePeriod,
  type TimetableResponse,
} from "./helpers.js";

const YANGJEONG = "양정고등학교";
const HAFS = "용인한국외국어대학교부설고등학교";
const HAFS_CODE = "7531146";
const GRADE = 1;
const CLASS_NO = 3;

function shapeNotes(label: string, body: TimetableResponse): void {
  const teachers = body.timetable.flat().map((period) => period.teacher);
  const hasTeacher = teachers.some((name) => name.length > 0);
  const replaced = body.timetable.flat().filter((period) => period.replaced);
  console.log(
    `  ${label}: days=${body.timetable.length} periods=${body.timetable.flat().length} day_time=${body.day_time.length} update_date=${body.update_date || "(blank)"} teachers=${hasTeacher ? "yes" : "blank"} replaced=${replaced.length}`,
  );
}

function isCancelled(period: TimetablePeriod): boolean {
  return period.replaced && period.subject.length === 0;
}

async function run(): Promise<void> {
  console.log("Testing NEIS timetable source\n");

  const yangjeongComcigan = await requestJson(
    app,
    `/timetable?grade=${GRADE}&classno=${CLASS_NO}&week=0&source=comcigan&schoolname=${encodeURIComponent(YANGJEONG)}`,
  );
  assert(yangjeongComcigan.status === 200, `양정고 comcigan → ${yangjeongComcigan.status}`);
  assert(
    !isErrorBody(yangjeongComcigan.body),
    `/timetable comcigan error: ${JSON.stringify(yangjeongComcigan.body)}`,
  );
  assertTimetableResponse(yangjeongComcigan.body);
  shapeNotes("양정고 comcigan", yangjeongComcigan.body);

  const yangjeongNeis = await requestJson(
    app,
    `/timetable?grade=${GRADE}&classno=${CLASS_NO}&week=0&source=neis&schoolname=${encodeURIComponent(YANGJEONG)}`,
  );
  assert(yangjeongNeis.status === 200, `양정고 neis → ${yangjeongNeis.status}`);
  assert(
    !isErrorBody(yangjeongNeis.body),
    `/timetable neis error: ${JSON.stringify(yangjeongNeis.body)}`,
  );
  assertTimetableResponse(yangjeongNeis.body, { allowEmptyDayTime: true });
  assert(yangjeongNeis.body.day_time.length === 0, "NEIS day_time must be blank");
  assert(
    yangjeongNeis.body.timetable.length <= 5,
    `NEIS Saturday must be dropped, got ${yangjeongNeis.body.timetable.length} days`,
  );
  for (const day of yangjeongNeis.body.timetable) {
    for (const period of day) {
      assertTimetablePeriod(period);
      assert(period.teacher === "", "NEIS teacher must be blank");
      assert(period.replaced === false, "NEIS replaced must be false");
      assert(period.original === null, "NEIS original must be null");
    }
  }
  shapeNotes("양정고 neis", yangjeongNeis.body);

  const yangjeongAuto = await requestJson(
    app,
    `/timetable?grade=${GRADE}&classno=${CLASS_NO}&week=0&schoolname=${encodeURIComponent(YANGJEONG)}`,
  );
  assert(yangjeongAuto.status === 200, `양정고 auto → ${yangjeongAuto.status}`);
  assert(
    !isErrorBody(yangjeongAuto.body),
    `/timetable auto error: ${JSON.stringify(yangjeongAuto.body)}`,
  );
  assertTimetableResponse(yangjeongAuto.body);
  assert(
    yangjeongAuto.body.timetable.length <= 5,
    `auto must not pick up NEIS Saturday, got ${yangjeongAuto.body.timetable.length} days`,
  );
  assert(
    yangjeongAuto.body.day_time.length === yangjeongComcigan.body.day_time.length,
    "auto keeps Comcigan day_time",
  );

  const maxDays = Math.min(
    yangjeongAuto.body.timetable.length,
    yangjeongComcigan.body.timetable.length,
    yangjeongNeis.body.timetable.length,
  );
  for (let day = 0; day < maxDays; day += 1) {
    const autoDay = yangjeongAuto.body.timetable[day];
    const comDay = yangjeongComcigan.body.timetable[day];
    const neisDay = yangjeongNeis.body.timetable[day];
    const byCom = new Map(comDay.map((entry) => [entry.period, entry]));
    const byNeis = new Map(neisDay.map((entry) => [entry.period, entry]));
    for (const autoPeriod of autoDay) {
      const com = byCom.get(autoPeriod.period);
      const neis = byNeis.get(autoPeriod.period);
      if (com && isCancelled(com)) {
        assert(autoPeriod.subject === "", "auto keeps Comcigan cancellation");
        continue;
      }
      const names = [com?.subject, neis?.subject].filter(
        (name): name is string => Boolean(name && name.length > 0),
      );
      if (names.length === 0) continue;
      const shortest = names.reduce((a, b) => (a.length <= b.length ? a : b));
      assert(
        autoPeriod.subject === shortest,
        `day ${day} period ${autoPeriod.period}: expected ${shortest}, got ${autoPeriod.subject}`,
      );
    }
  }
  shapeNotes("양정고 auto", yangjeongAuto.body);
  console.log("✓ 양정고 auto: shorter name wins, gaps fill, Saturday dropped, cancellations kept");

  const hafsComcigan = await requestJson(
    app,
    `/timetable?grade=${GRADE}&classno=${CLASS_NO}&week=0&source=comcigan&schoolname=${encodeURIComponent(HAFS)}`,
  );
  assert(
    hafsComcigan.status === 404 || hafsComcigan.status === 502,
    `외대부고 comcigan expected 404/502, got ${hafsComcigan.status}`,
  );
  assert(isErrorBody(hafsComcigan.body), "외대부고 comcigan should error");
  console.log(
    `✓ 외대부고 comcigan unavailable (${hafsComcigan.body.error.code})`,
  );

  const hafsAuto = await requestJson(
    app,
    `/timetable?grade=${GRADE}&classno=${CLASS_NO}&week=0&schoolname=${encodeURIComponent(HAFS)}`,
  );
  if (hafsAuto.status === 200 && !isErrorBody(hafsAuto.body)) {
    assertTimetableResponse(hafsAuto.body, { allowEmptyDayTime: true });
    assert(
      hafsAuto.body.timetable.length <= 5,
      "외대부고 auto must not include NEIS Saturday",
    );
    shapeNotes("외대부고 auto this week", hafsAuto.body);
    console.log("✓ 외대부고 auto fills from NEIS");
  } else {
    assert(isErrorBody(hafsAuto.body), "expected structured error for empty week");
    assert(
      hafsAuto.body.error.code === "NEIS_DATA_NOT_FOUND" ||
        hafsAuto.body.error.code === "TIMETABLE_INVALID_GRADE_CLASS",
      `외대부고 auto this week: ${hafsAuto.body.error.code}`,
    );
    console.log(
      `✓ 외대부고 auto this week empty (${hafsAuto.body.error.code}) — summer break`,
    );
  }

  const hafsNeis = await requestJson(
    app,
    `/timetable?grade=${GRADE}&classno=${CLASS_NO}&week=0&source=neis&schoolcode=${HAFS_CODE}`,
  );

  if (hafsNeis.status === 200 && !isErrorBody(hafsNeis.body)) {
    assertTimetableResponse(hafsNeis.body, { allowEmptyDayTime: true });
    assert(hafsNeis.body.day_time.length === 0, "NEIS day_time must be blank");
    assert(hafsNeis.body.timetable.length <= 5, "NEIS Saturday dropped");
    shapeNotes("외대부고 neis this week", hafsNeis.body);
    console.log("✓ 외대부고 neis this week");
  } else {
    assert(isErrorBody(hafsNeis.body), "expected structured error for empty week");
    assert(
      hafsNeis.body.error.code === "NEIS_DATA_NOT_FOUND" ||
        hafsNeis.body.error.code === "TIMETABLE_INVALID_GRADE_CLASS",
      `외대부고 this week: ${hafsNeis.body.error.code}`,
    );
    console.log(
      `✓ 외대부고 neis this week empty (${hafsNeis.body.error.code}) — summer break`,
    );
  }

  const mapped = await fetchNeisTimeTable({
    schoolName: HAFS,
    schoolCode: Number(HAFS_CODE),
    fromYmd: "20260713",
    toYmd: "20260717",
    key: process.env.NEIS_API_KEY ?? "64db83c20c8a4f66b54ac8637b1d044f",
  });
  const weekDays = mapped.timetable[GRADE]?.[CLASS_NO]?.slice(1);
  assert(Boolean(weekDays?.length), "외대부고 July week must map to grade/class");
  const julyBody: TimetableResponse = {
    day_time: mapped.dayTime,
    timetable: weekDays!,
    update_date: mapped.updateDate,
  };
  assertTimetableResponse(julyBody, { allowEmptyDayTime: true });
  assert(julyBody.day_time.length === 0, "mapped day_time blank");
  assert(julyBody.timetable.length <= 5, "July mapper drops Saturday");
  const monday = julyBody.timetable[0] ?? [];
  assert(monday.length > 0, "Monday 20260713 should have periods");
  assert(monday.some((period) => period.subject.includes("미래주제연구")), "July 13 subject");
  for (const period of monday) {
    assert(period.teacher === "", "teacher blank");
    assert(period.original === null, "original null");
  }
  shapeNotes("외대부고 neis 20260713–17", julyBody);
  console.log("✓ 외대부고 NEIS mapper returns Comcigan-shaped week");

  const nick = await requestJson(
    app,
    `/timetable?grade=${GRADE}&classno=${CLASS_NO}&week=0&source=neis&schoolname=${encodeURIComponent("외대부고")}`,
  );
  assert(nick.status === 404, `외대부고 nickname should 404, got ${nick.status}`);
  console.log(
    "✓ schoolname=외대부고 is not a NEIS SCHUL_NM (use 용인한국외국어대학교부설고등학교 or schoolcode=7531146)",
  );

  console.log("\nNEIS timetable source tests passed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
