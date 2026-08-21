import { API_VERSION, APP_NAME } from "./config.js";

const API_DESCRIPTION = `
${APP_NAME} wraps **Comcigan** and the Korean **NEIS Open API** (school info, classes, meals, calendar, timetables).

### Timetable source
\`GET /timetable\` defaults to \`source=auto\`: both upstreams in parallel, then merge per period (whichever side has a subject; shorter name when both do). Missing weekdays/periods fill from the other. NEIS Saturday is ignored. Pin \`source=comcigan\` or \`source=neis\` to call only one.

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
      title: `${APP_NAME} API`,
      version: API_VERSION,
      description: API_DESCRIPTION,
    },
    tags: [
      { name: "Meta", description: "Service metadata" },
      { name: "School", description: "NEIS school profile" },
      { name: "Classes", description: "Class numbers by grade" },
      { name: "Timetable", description: "Weekly timetable (auto merge; pin comcigan or neis)" },
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
      title: `${APP_NAME} API`,
      description:
        "NEIS school data and Comcigan/NEIS timetables (auto-merged by default) for Korean schools.",
    },
    servers: [...OPENAPI_SERVERS],
  },
};
