import { t } from "elysia";

/** YYYYMMDD */
export const DateYmd = t.String({
  pattern: "^\\d{8}$",
  description: "Calendar date in YYYYMMDD format (e.g. 20250526).",
  examples: ["20250526"],
});

export const SchoolName = t.String({
  minLength: 1,
  description:
    "Korean school name as registered in NEIS (e.g. 양정고등학교). Required on GET /school.",
  examples: ["양정고등학교"],
});

export const SchoolCode = t.String({
  pattern: "^\\d{7}$",
  description: "NEIS standard school code (SD_SCHUL_CODE), 7 digits.",
  examples: ["7010208"],
});

export const SchoolQuery = t.Object(
  {
    schoolname: t.Optional(SchoolName),
    schoolcode: t.Optional(SchoolCode),
  },
  {
    description:
      "Identify a school by name or code. Exactly one of schoolname or schoolcode must be provided on most endpoints.",
  },
);

export const Grade = t.Numeric({
  minimum: 1,
  maximum: 6,
  description: "Grade level (학년).",
  examples: [1],
});

export const ClassNo = t.Numeric({
  minimum: 1,
  maximum: 30,
  description: "Class number within the grade (반).",
  examples: [3],
});

export const Week = t.Optional(
  t.Numeric({
    minimum: 0,
    maximum: 1,
    default: 0,
    description: "0 = current week, 1 = next week.",
  }),
);

export const TimetableSource = t.Optional(
  t.Union([t.Literal("auto"), t.Literal("comcigan"), t.Literal("neis")], {
    description:
      "Timetable source. `auto` (default) fetches Comcigan and NEIS together and merges per period: whichever side has a subject, shorter name when both do, weekday gaps fill from the other. NEIS Saturday is ignored. Pin `comcigan` or `neis` for a single upstream.",
  }),
);

export const ApiErrorSchema = t.Object({
  ok: t.Literal(false),
  error: t.Object({
    code: t.String(),
    message: t.String(),
    details: t.Optional(
      t.Record(
        t.String(),
        t.Union([
          t.String(),
          t.Number(),
          t.Boolean(),
          t.Array(t.String()),
        ]),
      ),
    ),
  }),
});
