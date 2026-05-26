/**
 * Integration tests for 양정고등학교 1학년 3반
 */
import { app } from "../app.js";
import {
  assert,
  assertTimetablePeriod,
  isErrorBody,
  requestJson,
  type TimetableResponse,
} from "./helpers.js";

const SCHOOL = "양정고등학교";
const GRADE = 1;
const CLASS_NO = 3;
const enc = encodeURIComponent(SCHOOL);

function schoolQuery(extra = "") {
  return `schoolname=${enc}${extra ? `&${extra}` : ""}`;
}

async function run() {
  console.log(`Testing ${SCHOOL} ${GRADE}학년 ${CLASS_NO}반\n`);

  const school = await requestJson(app, `/school?${schoolQuery()}`);
  assert(school.status === 200, `GET /school → ${school.status}`);
  assert(!isErrorBody(school.body), `/school error: ${JSON.stringify(school.body)}`);
  const schoolRows = school.body as { SCHUL_NM: string; SCHUL_KND_SC_NM: string }[];
  assert(schoolRows.length > 0, "/school returned no rows");
  assert(
    schoolRows.some((row) => row.SCHUL_NM === SCHOOL),
    `expected ${SCHOOL} in school results`,
  );
  assert(
    schoolRows[0].SCHUL_KND_SC_NM === "고등학교",
    `expected 고등학교, got ${schoolRows[0].SCHUL_KND_SC_NM}`,
  );
  console.log("✓ GET /school");

  const classes = await requestJson(
    app,
    `/classes?grade=${GRADE}&${schoolQuery()}`,
  );
  assert(classes.status === 200, `GET /classes → ${classes.status}`);
  assert(!isErrorBody(classes.body), `/classes error: ${JSON.stringify(classes.body)}`);
  const classNames = classes.body as string[];
  assert(classNames.includes(String(CLASS_NO)), `class list missing ${CLASS_NO}`);
  console.log("✓ GET /classes");

  const timetable = await requestJson(
    app,
    `/timetable?grade=${GRADE}&classno=${CLASS_NO}&week=0&${schoolQuery()}`,
  );
  assert(timetable.status === 200, `GET /timetable → ${timetable.status}`);
  assert(
    !isErrorBody(timetable.body),
    `/timetable error: ${JSON.stringify(timetable.body)}`,
  );

  const tt = timetable.body as TimetableResponse;
  assert(Array.isArray(tt.day_time) && tt.day_time.length >= 7, "day_time missing");
  assert(tt.day_time[0].includes("08:10"), `unexpected first period: ${tt.day_time[0]}`);
  assert(Array.isArray(tt.timetable) && tt.timetable.length === 5, "expected 5 weekdays");
  assert(typeof tt.update_date === "string" && tt.update_date.length > 0, "update_date missing");

  for (const [dayIndex, day] of tt.timetable.entries()) {
    assert(Array.isArray(day), `day ${dayIndex + 1} must be array`);
    for (const entry of day) {
      assertTimetablePeriod(entry);
      assert(entry.period >= 1, `invalid period on day ${dayIndex + 1}`);
    }
  }

  const tuesday = tt.timetable[1];
  assert(tuesday.length === 7, `Tuesday expected 7 periods, got ${tuesday.length}`);
  for (const entry of tuesday) {
    assert(entry.subject.length > 0, "Tuesday period missing subject");
    assert(entry.teacher.length > 0, "Tuesday period missing teacher");
    assert(entry.replaced === false, "Tuesday should have current schedule entries");
    assert(entry.original === null, "Tuesday should not have substitution originals");
  }

  const tuesdaySubjects = new Set(tuesday.map((p) => p.subject));
  assert(tuesdaySubjects.has("음악"), "Tuesday missing 음악");
  assert(tuesdaySubjects.has("체육"), "Tuesday missing 체육");

  const daysWithLessons = tt.timetable.filter((day) =>
    day.some((p) => p.subject.length > 0),
  ).length;
  assert(daysWithLessons >= 3, "expected at least 3 school days with lessons");

  console.log("✓ GET /timetable");
  console.log(`  update: ${tt.update_date}`);
  console.log(`  Tue P1: ${tuesday[0].subject} (${tuesday[0].teacher})`);

  const conflict = await requestJson(
    app,
    `/timetable?grade=${GRADE}&classno=${CLASS_NO}&week=0&${schoolQuery()}&schoolcode=7010208`,
  );
  assert(conflict.status === 400, `conflict check status ${conflict.status}`);
  assert(
    isErrorBody(conflict.body) &&
      conflict.body.error.code === "CONFLICTING_SCHOOL_PARAMS",
    "expected schoolname+schoolcode conflict",
  );
  console.log("✓ timetable rejects schoolname + schoolcode");

  console.log("\n양정고 1-3 tests passed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
