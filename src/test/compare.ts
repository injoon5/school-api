import { app } from "../app.js";
import { assert, isErrorBody, requestJson } from "./helpers.js";

async function main() {
  const root = await requestJson(app, "/");
  assert(root.status === 200, `GET / expected 200, got ${root.status}`);
  assert(
    JSON.stringify(root.body) === JSON.stringify({ Hello: "World" }),
    "GET / body mismatch",
  );
  console.log("✓ GET /");

  const school = await requestJson(app, "/school?schoolname=목운중학교");
  assert(school.status === 200, `GET /school expected 200`);
  assert(Array.isArray(school.body), "/school should return array");
  assert((school.body as unknown[]).length > 0, "/school empty");
  console.log("✓ GET /school");

  const classes = await requestJson(app, "/classes?grade=1&schoolname=목운중학교");
  assert(classes.status === 200, `GET /classes expected 200`);
  assert(Array.isArray(classes.body), "/classes should return array");
  assert((classes.body as string[]).includes("1"), "/classes missing class 1");
  console.log("✓ GET /classes");

  const lunch = await requestJson(
    app,
    "/lunch?startdate=20250526&enddate=20250526&schoolname=목운중학교",
  );
  assert(lunch.status === 200, `GET /lunch expected 200`);
  assert(Array.isArray(lunch.body), "/lunch should return array");
  console.log("✓ GET /lunch");

  const timetable = await requestJson(
    app,
    "/timetable?grade=1&classno=1&week=0&schoolname=목운중학교",
  );
  assert(timetable.status === 200, `GET /timetable expected 200`);
  const tt = timetable.body as {
    error?: boolean;
    day_time?: string[];
    timetable?: unknown[];
  };
  assert(!tt.error, `/timetable error: ${JSON.stringify(tt)}`);
  assert(Array.isArray(tt.day_time) && tt.day_time.length > 0, "day_time missing");
  assert(Array.isArray(tt.timetable) && tt.timetable.length > 0, "timetable empty");
  console.log("✓ GET /timetable");

  const schedule = await requestJson(
    app,
    "/schedule?startdate=20250301&enddate=20250331&schoolname=목운중학교",
  );
  assert(schedule.status === 200, `GET /schedule expected 200`);
  if (isErrorBody(schedule.body)) {
    console.log(
      "⚠ GET /schedule returned error (no NEIS data for range):",
      schedule.body,
    );
  } else {
    assert(Array.isArray(schedule.body), "/schedule should return array");
    console.log("✓ GET /schedule");
  }

  const conflict = await requestJson(
    app,
    "/lunch?startdate=20250526&enddate=20250526&schoolname=목운중학교&schoolcode=7081492",
  );
  assert(isErrorBody(conflict.body), "expected conflict error");
  assert(
    conflict.body.message.includes("both schoolname and schoolcode"),
    "unexpected conflict message",
  );
  console.log("✓ validation: schoolname + schoolcode");

  console.log("\nAll checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
