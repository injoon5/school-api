/**
 * Structural integration tests for 양정고등학교 1학년 3반
 */
import { app } from "../app.js";
import {
  assert,
  assertClassList,
  assertSchoolList,
  assertStructuredError,
  assertTimetableResponse,
  isErrorBody,
  requestJson,
} from "./helpers.js";

const SCHOOL = "양정고등학교";
const GRADE = 1;
const CLASS_NO = 3;
const enc = encodeURIComponent(SCHOOL);

function schoolQuery(extra = "") {
  return `schoolname=${enc}${extra ? `&${extra}` : ""}`;
}

async function run() {
  console.log(`Testing ${SCHOOL} ${GRADE}학년 ${CLASS_NO}반 (structural)\n`);

  const school = await requestJson(app, `/school?${schoolQuery()}`);
  assert(school.status === 200, `GET /school → ${school.status}`);
  assert(!isErrorBody(school.body), `/school error: ${JSON.stringify(school.body)}`);
  assertSchoolList(school.body);
  console.log("✓ GET /school");

  const classes = await requestJson(
    app,
    `/classes?grade=${GRADE}&${schoolQuery()}`,
  );
  assert(classes.status === 200, `GET /classes → ${classes.status}`);
  assert(!isErrorBody(classes.body), `/classes error: ${JSON.stringify(classes.body)}`);
  assertClassList(classes.body);
  console.log("✓ GET /classes");

  const timetable = await requestJson(
    app,
    `/timetable?grade=${GRADE}&classno=${CLASS_NO}&week=0&${schoolQuery()}`,
  );
  assert(timetable.status === 200, `GET /timetable → ${timetable.status}`);
  assert(!isErrorBody(timetable.body), `/timetable error: ${JSON.stringify(timetable.body)}`);
  assertTimetableResponse(timetable.body);
  console.log("✓ GET /timetable");

  const conflict = await requestJson(
    app,
    `/timetable?grade=${GRADE}&classno=${CLASS_NO}&week=0&${schoolQuery()}&schoolcode=7010208`,
  );
  assert(conflict.status === 400, `conflict status ${conflict.status}`);
  assertStructuredError(conflict.body, "CONFLICTING_SCHOOL_PARAMS");
  console.log("✓ timetable rejects schoolname + schoolcode");

  console.log("\n양정고 1-3 structural tests passed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
