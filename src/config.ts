export const APP_NAME = "TimeforSchool";

export const NEIS_API_KEY =
  process.env.NEIS_API_KEY ?? "64db83c20c8a4f66b54ac8637b1d044f";

/** Kept in sync with package.json; surfaced on `GET /` and in the OpenAPI info. */
export const API_VERSION = "0.0.1";

const DEFAULT_CORS_ORIGINS = [
  "https://timetable.injoon5.com",
  "https://docs.timefor.school",
  "http://localhost:3000",
];

/**
 * Comma-separated `CORS_ORIGINS` env var overrides the defaults when set,
 * so new frontends/preview domains don't require a code change.
 */
export const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : DEFAULT_CORS_ORIGINS;
