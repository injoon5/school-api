const API_DESCRIPTION = `
TimeForSchool wraps the Korean **NEIS Open API** (school info, classes, meals, calendar) and **Comcigan** (weekly class timetables).

### School identifier
Use **either** \`schoolname\` **or** \`schoolcode\` (NEIS 7-digit code)—never both.

### Dates
\`startdate\` / \`enddate\` use **YYYYMMDD** (e.g. \`20250526\`).

### Errors
Failed requests return \`{ ok: false, error: { code, message, details? } }\` with an appropriate HTTP status.
`.trim();

/** Relative first so Scalar resolves the current host (preview, local, prod). */
const OPENAPI_SERVERS = [
  { url: "/", description: "Current host" },
  { url: "https://api.timefor.school", description: "Production" },
  { url: "http://localhost:8000", description: "Local development" },
] as const;

export const openApiPluginConfig = {
  path: "/docs",
  specPath: "/docs/json",
  /** Inline spec so Scalar always has servers (avoids empty spec on relative url fetch). */
  embedSpec: true,
  documentation: {
    info: {
      title: "TimeForSchool API",
      version: "0.0.1",
      description: API_DESCRIPTION,
    },
    tags: [
      { name: "Meta", description: "Service metadata" },
      { name: "School", description: "NEIS school profile" },
      { name: "Classes", description: "Class numbers by grade" },
      { name: "Timetable", description: "Weekly timetable (Comcigan)" },
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
        "NEIS school data and Comcigan timetables for Korean schools.",
    },
  },
};
