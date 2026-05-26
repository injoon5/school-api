import { app } from "../app.js";
import {
  assert,
  assertApiMeta,
  assertClassList,
  assertMealList,
  assertScheduleList,
  assertSchoolList,
  assertStructuredError,
  assertTimetableResponse,
  isErrorBody,
  requestJson,
} from "./helpers.js";

async function main() {
  const root = await requestJson(app, "/");
  assert(root.status === 200, `GET / expected 200, got ${root.status}`);
  assertApiMeta(root.body);
  console.log("✓ GET /");

  const school = await requestJson(app, "/school?schoolname=목운중학교");
  assert(school.status === 200, `GET /school expected 200`);
  assertSchoolList(school.body);
  console.log("✓ GET /school");

  const schoolMissing = await requestJson(app, "/school");
  assert(schoolMissing.status === 400, "expected 400 when schoolname omitted");
  assertStructuredError(schoolMissing.body, "MISSING_SCHOOL_IDENTIFIER");
  console.log("✓ validation: schoolname required on /school");

  const classes = await requestJson(app, "/classes?grade=1&schoolname=목운중학교");
  assert(classes.status === 200, `GET /classes expected 200`);
  assertClassList(classes.body);
  console.log("✓ GET /classes");

  const lunch = await requestJson(
    app,
    "/lunch?startdate=20250526&enddate=20250526&schoolname=목운중학교",
  );
  assert(lunch.status === 200, `GET /lunch expected 200`);
  assert(!isErrorBody(lunch.body), `/lunch error: ${JSON.stringify(lunch.body)}`);
  assertMealList(lunch.body);
  console.log("✓ GET /lunch");

  const timetable = await requestJson(
    app,
    "/timetable?grade=1&classno=1&week=0&schoolname=목운중학교",
  );
  assert(timetable.status === 200, `GET /timetable expected 200`);
  assert(!isErrorBody(timetable.body), `/timetable error: ${JSON.stringify(timetable.body)}`);
  assertTimetableResponse(timetable.body);
  console.log("✓ GET /timetable");

  const schedule = await requestJson(
    app,
    "/schedule?startdate=20250301&enddate=20250331&schoolname=목운중학교",
  );
  if (schedule.status === 404 && isErrorBody(schedule.body)) {
    assertStructuredError(schedule.body, "NEIS_DATA_NOT_FOUND");
    console.log("✓ GET /schedule (no data for range)");
  } else {
    assert(schedule.status === 200, `GET /schedule expected 200 or 404`);
    assertScheduleList(schedule.body);
    console.log("✓ GET /schedule");
  }

  const conflict = await requestJson(
    app,
    "/lunch?startdate=20250526&enddate=20250526&schoolname=목운중학교&schoolcode=7081492",
  );
  assert(conflict.status === 400, "expected 400 for conflict");
  assertStructuredError(conflict.body, "CONFLICTING_SCHOOL_PARAMS");
  console.log("✓ validation: schoolname + schoolcode");

  console.log("\nAll structural checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
