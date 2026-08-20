import { API_VERSION } from "./config.js";

const API_DESCRIPTION = `
TimeForSchool wraps **Comcigan** (weekly class timetables — preferred when the school uses 컴시간) and the Korean **NEIS Open API** (school info, classes, meals, calendar, and a timetable fallback).

### Timetable source
\`GET /timetable\` defaults to Comcigan. Use \`source=neis\` only if the school does not publish on 컴시간. Comcigan is updated more often and includes teachers, bell times, and substitutions. NEIS responses use the same JSON shape with those fields left blank.

### School identifier
Use **either** \`schoolname\` **or** \`schoolcode\` (NEIS 7-digit code)—never both. No endpoint defaults to a particular school; \`GET /school\` requires \`schoolname\`.

### Dates
\`startdate\` / \`enddate\` use **YYYYMMDD** (e.g. \`20250526\`).

### Errors
Failed requests return \`{ ok: false, error: { code, message, details? } }\` with an appropriate HTTP status.
`.trim();

const OPENAPI_SERVERS = [
  { url: "https://api.timefor.school", description: "Production" },
  { url: "http://localhost:8000", description: "Local development" },
] as const;

/**
 * OpenAPI + Scalar settings for {@link https://elysiajs.com/patterns/openapi}.
 *
 * `fromTypes()` is omitted here: the generator expects Bun and logs on Node/Vercel.
 * Runtime Typebox schemas + `.model()` refs already drive the spec.
 */
export const openApiPluginConfig = {
  path: "/docs",
  documentation: {
    info: {
      title: "TimeForSchool API",
      version: API_VERSION,
      description: API_DESCRIPTION,
    },
    tags: [
      { name: "Meta", description: "Service metadata" },
      { name: "School", description: "NEIS school profile" },
      { name: "Classes", description: "Class numbers by grade" },
      { name: "Timetable", description: "Weekly timetable (Comcigan preferred; NEIS fallback)" },
      { name: "Lunch", description: "Meal menus (NEIS)" },
      { name: "Schedule", description: "School calendar (NEIS)" },
    ],
    servers: [...OPENAPI_SERVERS],
  },
  scalar: {
    layout: "modern",
    defaultHttpClient: {
      targetKey: "javascript",
      clientKey: "fetch",
    },
    metadata: {
      title: "TimeForSchool API",
      description:
        "NEIS school data and Comcigan timetables (NEIS timetable fallback) for Korean schools.",
    },
    servers: [...OPENAPI_SERVERS],
  },
};
