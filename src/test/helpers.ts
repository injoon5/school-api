export const PRODUCTION_API =
  process.env.PRODUCTION_API ?? "https://api.timefor.school";

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

export async function fetchProduction(
  path: string,
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${PRODUCTION_API}${path}`);
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

export function isErrorBody(
  body: unknown,
): body is { error: true; message: string; data: null } {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    (body as { error: unknown }).error === true
  );
}

/** Stable JSON compare (key order + 1523 vs 1523.0) */
export function normalizeJson(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? value : Math.round(value * 1000) / 1000;
  }
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(obj)
        .sort()
        .map((key) => [key, normalizeJson(obj[key])]),
    );
  }
  return value;
}

export function jsonEqual(a: unknown, b: unknown): boolean {
  return (
    JSON.stringify(normalizeJson(a)) === JSON.stringify(normalizeJson(b))
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
  if (p.original !== null) {
    assert(typeof p.original === "object", "original must be object or null");
    assert(typeof p.original.subject === "string", "original.subject must be string");
  }
}
