/**
 * Structural comparison: local API vs https://api.timefor.school
 * Checks response shape only — not byte-identical payloads.
 */
import { app } from "../app.js";
import {
  assert,
  assertClassList,
  assertMealList,
  assertSameTopLevelKind,
  assertScheduleList,
  assertSchoolList,
  assertStructuredError,
  assertTimetableResponse,
  errorMessage,
  fetchProduction,
  isErrorBody,
  isLegacyErrorBody,
  PRODUCTION_API,
  requestJson,
} from "./helpers.js";

const SCHOOL = "양정고등학교";
const SCHOOL_CODE = "7010208";
const GRADE = 1;
const CLASS_NO = 3;
const enc = encodeURIComponent(SCHOOL);

function assertBothOk(
  local: { status: number; body: unknown },
  prod: { status: number; body: unknown },
  name: string,
) {
  assert(local.status === 200, `${name} local status ${local.status}`);
  assert(prod.status === 200, `${name} production status ${prod.status}`);
  assertSameTopLevelKind(local.body, prod.body, name);
}

async function compareStructural(name: string, path: string, assertBody: (body: unknown) => void) {
  const [local, prod] = await Promise.all([
    requestJson(app, path),
    fetchProduction(path),
  ]);
  assertBothOk(local, prod, name);
  assertBody(local.body);
  assertBody(prod.body);
  console.log(`✓ ${name}: same structural shape as ${PRODUCTION_API}`);
}

async function main() {
  console.log(`Structural compare vs ${PRODUCTION_API}\n`);

  await compareStructural(
    "GET /school",
    `/school?schoolname=${enc}`,
    assertSchoolList,
  );
  await compareStructural(
    "GET /classes",
    `/classes?grade=${GRADE}&schoolname=${enc}`,
    assertClassList,
  );

  const ymd = "20250526";
  await compareStructural(
    "GET /lunch",
    `/lunch?startdate=${ymd}&enddate=${ymd}&schoolname=${enc}`,
    assertMealList,
  );

  const schedulePath = `/schedule?startdate=20250301&enddate=20250331&schoolname=${enc}`;
  const [localSched, prodSched] = await Promise.all([
    requestJson(app, schedulePath),
    fetchProduction(schedulePath),
  ]);
  const prodErr = errorMessage(prodSched.body);
  const localErr = errorMessage(localSched.body);
  if (prodErr && localErr) {
    assertSameTopLevelKind(localSched.body, prodSched.body, "GET /schedule");
    console.log(`◦ GET /schedule: both error — ${prodErr}`);
  } else {
    assertBothOk(localSched, prodSched, "GET /schedule");
    assertScheduleList(localSched.body);
    assertScheduleList(prodSched.body);
    console.log("✓ GET /schedule: same structural shape");
  }

  const ttPath = `/timetable?grade=${GRADE}&classno=${CLASS_NO}&week=0&schoolname=${enc}`;
  const [localTt, prodTt] = await Promise.all([
    requestJson(app, ttPath),
    fetchProduction(ttPath),
  ]);

  if (isLegacyErrorBody(prodTt.body)) {
    assert(localTt.status === 200, "local timetable status");
    assert(!isErrorBody(localTt.body), "local timetable should succeed");
    assertTimetableResponse(localTt.body);
    console.log("◦ GET /timetable: production errors; local shape OK");
    console.log(`    prod: ${prodTt.body.message}`);
  } else {
    assertBothOk(localTt, prodTt, "GET /timetable");
    assertTimetableResponse(localTt.body);
    assertTimetableResponse(prodTt.body);
    console.log("✓ GET /timetable: same structural shape");
  }

  const conflictPath = `${ttPath}&schoolcode=${SCHOOL_CODE}`;
  const [localConflict, prodConflict] = await Promise.all([
    requestJson(app, conflictPath),
    fetchProduction(conflictPath),
  ]);
  assert(localConflict.status === 400, "local conflict status");
  assertStructuredError(localConflict.body, "CONFLICTING_SCHOOL_PARAMS");
  assert(isLegacyErrorBody(prodConflict.body), "production conflict error");
  console.log("✓ timetable conflict: both reject schoolname + schoolcode");

  const prodCodeOnly = await fetchProduction(
    `/timetable?grade=${GRADE}&classno=${CLASS_NO}&week=0&schoolcode=${SCHOOL_CODE}`,
  );
  if (isLegacyErrorBody(prodCodeOnly.body)) {
    console.log(`◦ GET /timetable?schoolcode only: production error — ${prodCodeOnly.body.message}`);
  }

  console.log("\nStructural production comparison finished.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
