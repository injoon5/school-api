export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

type FetchableApp = {
  handle: (request: Request) => Response | Promise<Response>;
};

export async function requestJson(
  app: FetchableApp,
  path: string,
): Promise<{ status: number; body: unknown }> {
  const response = await app.handle(new Request(`http://127.0.0.1${path}`));
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

export function isErrorBody(body: unknown): body is {
  ok: false;
  error: { code: string; message: string };
} {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { ok?: boolean }).ok === false &&
    typeof (body as { error?: { code?: string } }).error?.code === "string"
  );
}

export interface TimetablePeriod {
  period: number;
  subject: string;
  teacher: string;
  replaced: boolean;
  original: {
    period: number;
    subject: string;
    teacher: string;
  } | null;
}

export interface TimetableResponse {
  day_time: string[];
  timetable: TimetablePeriod[][];
  update_date: string;
}

export function assertTimetablePeriod(entry: unknown): asserts entry is TimetablePeriod {
  assert(typeof entry === "object" && entry !== null, "period entry must be object");
  const p = entry as TimetablePeriod;
  assert(typeof p.period === "number", "period must be number");
  assert(typeof p.subject === "string", "subject must be string");
  assert(typeof p.teacher === "string", "teacher must be string");
  assert(typeof p.replaced === "boolean", "replaced must be boolean");
  assert(
    p.original === null || typeof p.original === "object",
    "original must be object or null",
  );
  if (p.original != null && "subject" in p.original && p.original.subject != null) {
    assert(typeof p.original.subject === "string", "original.subject must be string");
  }
}

export function assertApiMeta(body: unknown): void {
  assert(typeof body === "object" && body !== null, "meta must be object");
  const meta = body as Record<string, unknown>;
  assert(typeof meta.name === "string" && meta.name.length > 0, "meta.name");
  assert(typeof meta.docs === "string" && meta.docs.length > 0, "meta.docs");
}

export function assertSchoolList(body: unknown): void {
  assert(Array.isArray(body) && body.length > 0, "school list must be non-empty array");
  for (const row of body) {
    assert(typeof row === "object" && row !== null, "school row must be object");
    const school = row as Record<string, unknown>;
    assert(typeof school.SCHUL_NM === "string", "SCHUL_NM must be string");
    assert(typeof school.SD_SCHUL_CODE === "string", "SD_SCHUL_CODE must be string");
  }
}

export function assertClassList(body: unknown): void {
  assert(Array.isArray(body) && body.length > 0, "class list must be non-empty array");
  for (const name of body) {
    assert(typeof name === "string" && name.length > 0, "class name must be non-empty string");
  }
}

export function assertMealList(body: unknown): void {
  assert(Array.isArray(body), "meals must be array");
  if (body.length === 0) return;
  const row = body[0] as Record<string, unknown>;
  assert(typeof row.DDISH_NM === "string", "DDISH_NM must be string");
  assert(typeof row.MLSV_YMD === "string", "MLSV_YMD must be string");
}

export function assertScheduleList(body: unknown): void {
  assert(Array.isArray(body), "schedule must be array");
  if (body.length === 0) return;
  const row = body[0] as Record<string, unknown>;
  assert(
    typeof row.AA_YMD === "string" || typeof row.EVENT_NM === "string",
    "schedule row must have AA_YMD or EVENT_NM",
  );
}

export function assertTimetableResponse(
  body: unknown,
  options: { allowEmptyDayTime?: boolean } = {},
): asserts body is TimetableResponse {
  assert(typeof body === "object" && body !== null, "timetable must be object");
  const tt = body as TimetableResponse;
  assert(Array.isArray(tt.day_time), "day_time required");
  if (!options.allowEmptyDayTime) {
    assert(tt.day_time.length > 0, "day_time required");
    assert(
      tt.day_time.every((slot) => typeof slot === "string" && slot.length > 0),
      "day_time entries must be strings",
    );
  } else {
    assert(
      tt.day_time.every((slot) => typeof slot === "string"),
      "day_time entries must be strings",
    );
  }
  assert(Array.isArray(tt.timetable) && tt.timetable.length > 0, "timetable required");
  assert(typeof tt.update_date === "string", "update_date");
  if (!options.allowEmptyDayTime) {
    assert(tt.update_date.length > 0, "update_date");
  }

  for (const day of tt.timetable) {
    assert(Array.isArray(day), "each weekday must be an array");
    for (const entry of day) assertTimetablePeriod(entry);
  }

  const hasPeriod = tt.timetable.some((day) => day.length > 0);
  assert(hasPeriod, "timetable must include at least one period");
}

export function assertStructuredError(
  body: unknown,
  code: string,
): asserts body is { ok: false; error: { code: string; message: string } } {
  assert(isErrorBody(body), "expected structured error body");
  assert(body.error.code === code, `expected error code ${code}, got ${body.error.code}`);
  assert(
    typeof body.error.message === "string" && body.error.message.length > 0,
    "error message required",
  );
}
