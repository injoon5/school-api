/**
 * Compare local API with https://api.timefor.school (legacy Python deployment).
 * Success payloads should match; error shapes intentionally differ (local uses structured errors).
 */
import { app } from "../app.js";
import {
  assert,
  errorMessage,
  fetchProduction,
  isErrorBody,
  isLegacyErrorBody,
  jsonEqual,
  PRODUCTION_API,
  requestJson,
} from "./helpers.js";

const SCHOOL = "양정고등학교";
const SCHOOL_CODE = "7010208";
const GRADE = 1;
const CLASS_NO = 3;
const enc = encodeURIComponent(SCHOOL);

async function compareEndpoint(name: string, path: string) {
  const [local, prod] = await Promise.all([
    requestJson(app, path),
    fetchProduction(path),
  ]);

  assert(local.status === 200, `${name} local status ${local.status}`);
  assert(prod.status === 200, `${name} production status ${prod.status}`);

  if (jsonEqual(local.body, prod.body)) {
    console.log(`✓ ${name}: matches ${PRODUCTION_API}`);
    return;
  }

  console.log(`✗ ${name}: differs from production`);
  console.log("  local:", JSON.stringify(local.body).slice(0, 240));
  console.log("  prod: ", JSON.stringify(prod.body).slice(0, 240));
  throw new Error(`${name} mismatch vs production`);
}

async function main() {
  console.log(`Comparing local API vs ${PRODUCTION_API}\n`);

  await compareEndpoint("GET /school", `/school?schoolname=${enc}`);
  await compareEndpoint(
    "GET /classes",
    `/classes?grade=${GRADE}&schoolname=${enc}`,
  );

  const ymd = "20250526";
  await compareEndpoint(
    "GET /lunch",
    `/lunch?startdate=${ymd}&enddate=${ymd}&schoolname=${enc}`,
  );

  const schedulePath = `/schedule?startdate=20250301&enddate=20250331&schoolname=${enc}`;
  const [localSched, prodSched] = await Promise.all([
    requestJson(app, schedulePath),
    fetchProduction(schedulePath),
  ]);
  const prodSchedErr = errorMessage(prodSched.body);
  const localSchedErr = errorMessage(localSched.body);
  if (prodSchedErr && localSchedErr) {
    console.log(`◦ GET /schedule: both error — prod: ${prodSchedErr}`);
  } else if (jsonEqual(localSched.body, prodSched.body)) {
    console.log("✓ GET /schedule: matches production");
  } else {
    throw new Error("schedule mismatch");
  }

  const ttPath = `/timetable?grade=${GRADE}&classno=${CLASS_NO}&week=0&schoolname=${enc}`;
  const [localTt, prodTt] = await Promise.all([
    requestJson(app, ttPath),
    fetchProduction(ttPath),
  ]);

  if (isLegacyErrorBody(prodTt.body)) {
    assert(!isErrorBody(localTt.body), "local timetable should work with schoolname");
    console.log(
      "◦ GET /timetable?schoolname=…: production error (Python default schoolcode bug)",
    );
    console.log(`    prod: ${prodTt.body.message}`);
    console.log(
      `    local: OK — ${(localTt.body as { timetable: unknown[] }).timetable.length} weekdays`,
    );
  } else if (jsonEqual(localTt.body, prodTt.body)) {
    console.log("✓ GET /timetable: matches production");
  } else {
    throw new Error("timetable mismatch");
  }

  const conflictPath = `${ttPath}&schoolcode=${SCHOOL_CODE}`;
  const [localConflict, prodConflict] = await Promise.all([
    requestJson(app, conflictPath),
    fetchProduction(conflictPath),
  ]);
  assert(
    isErrorBody(localConflict.body) &&
      localConflict.body.error.code === "CONFLICTING_SCHOOL_PARAMS",
    "local should reject both params",
  );
  assert(isLegacyErrorBody(prodConflict.body), "production should reject both params");
  console.log("✓ timetable conflict: both reject schoolname + schoolcode");

  const prodCodeOnly = await fetchProduction(
    `/timetable?grade=${GRADE}&classno=${CLASS_NO}&week=0&schoolcode=${SCHOOL_CODE}`,
  );
  if (isLegacyErrorBody(prodCodeOnly.body)) {
    console.log(
      `◦ GET /timetable?schoolcode only: production broken — ${prodCodeOnly.body.message}`,
    );
  }

  console.log("\nProduction comparison finished.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
