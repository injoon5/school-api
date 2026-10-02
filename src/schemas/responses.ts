import { t } from "elysia";

const neisString = (description: string, example: string) =>
  t.String({ description, examples: [example] });

const neisOptionalString = (description: string, example: string) =>
  t.Optional(t.String({ description, examples: [example] }));

/** GET / */
export const ApiMetaSchema = t.Object({
  name: t.String({ examples: ["TimeforSchool"] }),
  version: t.String({ examples: ["0.0.1"] }),
  docs: t.String({ examples: ["/docs"] }),
  openapi: t.String({ examples: ["/docs/json"] }),
});

/** NEIS schoolInfo row */
export const SchoolInfoRowSchema = t.Object(
  {
    ATPT_OFCDC_SC_CODE: neisString("Office of education code", "B10"),
    ATPT_OFCDC_SC_NM: neisString("Office of education name", "서울특별시교육청"),
    SD_SCHUL_CODE: neisString("School code", "7010208"),
    SCHUL_NM: neisString("School name", "양정고등학교"),
    ENG_SCHUL_NM: neisString("English school name", "Yangjeong High School"),
    SCHUL_KND_SC_NM: neisString("School kind", "고등학교"),
    LCTN_SC_NM: neisString("Location", "서울특별시"),
    JU_ORG_NM: neisString("Administrative organization", "서울특별시교육청"),
    FOND_SC_NM: neisString("Establishment type", "사립"),
    ORG_RDNZC: neisString("Postal code", "07985"),
    ORG_RDNMA: neisString("Road address", "서울특별시 양천구 안양천로 1039"),
    ORG_RDNDA: neisString("Address detail", "(목동)"),
    ORG_TELNO: neisString("Phone", "02-2649-7072"),
    HMPG_ADRES: neisString("Website", "https://yangchung.sen.hs.kr"),
    COEDU_SC_NM: neisString("Coeducation", "남"),
    ORG_FAXNO: neisString("Fax", "02-2649-7079"),
    HS_SC_NM: neisOptionalString("High school division", "일반고"),
    INDST_SPECL_CCCCL_EXST_YN: neisString("Industry cluster exists", "N"),
    HS_GNRL_BUSNS_SC_NM: neisOptionalString("General/vocational", "일반계"),
    SPCLY_PURPS_HS_ORD_NM: neisOptionalString(
      "Special-purpose high school order",
      "해당없음",
    ),
    ENE_BFE_SEHF_SC_NM: neisString("Energy before self-help", "해당없음"),
    DGHT_SC_NM: neisString("Day/night", "주간"),
    FOND_YMD: neisString("Founded date", "19700301"),
    FOAS_MEMRD: neisString("Anniversary", "19700301"),
    LOAD_DTM: neisString("Loaded at", "20250526120000"),
  },
  { additionalProperties: true },
);

export const SchoolInfoListSchema = t.Array(SchoolInfoRowSchema, {
  examples: [
    [
      {
        ATPT_OFCDC_SC_CODE: "B10",
        ATPT_OFCDC_SC_NM: "서울특별시교육청",
        SD_SCHUL_CODE: "7010208",
        SCHUL_NM: "양정고등학교",
        ENG_SCHUL_NM: "Yangjeong High School",
        SCHUL_KND_SC_NM: "고등학교",
        LCTN_SC_NM: "서울특별시",
        JU_ORG_NM: "서울특별시교육청",
        FOND_SC_NM: "사립",
        ORG_RDNZC: "07985",
        ORG_RDNMA: "서울특별시 양천구 안양천로 1039",
        ORG_RDNDA: "(목동)",
        ORG_TELNO: "02-2649-7072",
        HMPG_ADRES: "https://yangchung.sen.hs.kr",
        COEDU_SC_NM: "남",
        ORG_FAXNO: "02-2649-7079",
        HS_SC_NM: "일반고",
        INDST_SPECL_CCCCL_EXST_YN: "N",
        HS_GNRL_BUSNS_SC_NM: "일반계",
        ENE_BFE_SEHF_SC_NM: "해당없음",
        DGHT_SC_NM: "주간",
        FOND_YMD: "19700301",
        FOAS_MEMRD: "19700301",
        LOAD_DTM: "20250526120000",
      },
    ],
  ],
});

/** NEIS mealServiceDietInfo row */
export const MealRowSchema = t.Object(
  {
    ATPT_OFCDC_SC_CODE: neisString("Office of education code", "B10"),
    ATPT_OFCDC_SC_NM: neisString("Office of education name", "서울특별시교육청"),
    SD_SCHUL_CODE: neisString("School code", "7010208"),
    SCHUL_NM: neisString("School name", "양정고등학교"),
    MMEAL_SC_CODE: neisString("Meal code", "1"),
    MMEAL_SC_NM: neisString("Meal name", "조식"),
    MLSV_YMD: neisString("Meal date", "20250526"),
    MLSV_FGR: t.Number({ description: "Meal sequence", examples: [1] }),
    DDISH_NM: neisString("Menu", "밥\n미역국\n불고기"),
    ORPLC_INFO: neisString("Origin info", "쌀: 국내산"),
    CAL_INFO: neisString("Calories", "650 Kcal"),
    NTR_INFO: neisString("Nutrition info", "탄수화물 90g"),
    MLSV_FROM_YMD: neisString("Range start", "20250526"),
    MLSV_TO_YMD: neisString("Range end", "20250526"),
    LOAD_DTM: neisString("Loaded at", "20250526120000"),
  },
  { additionalProperties: true },
);

export const MealListSchema = t.Array(MealRowSchema, {
  examples: [
    [
      {
        ATPT_OFCDC_SC_CODE: "B10",
        SD_SCHUL_CODE: "7010208",
        SCHUL_NM: "양정고등학교",
        MMEAL_SC_CODE: "2",
        MMEAL_SC_NM: "중식",
        MLSV_YMD: "20250526",
        MLSV_FGR: 1,
        DDISH_NM: "밥\n미역국\n불고기",
        ORPLC_INFO: "쌀: 국내산",
        CAL_INFO: "650 Kcal",
        NTR_INFO: "탄수화물 90g",
        MLSV_FROM_YMD: "20250526",
        MLSV_TO_YMD: "20250526",
        LOAD_DTM: "20250526120000",
      },
    ],
  ],
});

/** NEIS SchoolSchedule row */
export const ScheduleRowSchema = t.Object(
  {
    ATPT_OFCDC_SC_CODE: neisString("Office of education code", "B10"),
    ATPT_OFCDC_SC_NM: neisString("Office of education name", "서울특별시교육청"),
    SD_SCHUL_CODE: neisString("School code", "7010208"),
    SCHUL_NM: neisString("School name", "양정고등학교"),
    AY: neisString("Academic year", "2025"),
    DGHT_CRSE_SC_NM: neisString("Day/night course", "주간"),
    SCHUL_CRSE_SC_NM: neisString("School course", "고등학교"),
    SBTR_DD_SC_NM: neisString("Holiday type", "공휴일"),
    AA_YMD: neisString("Event date", "20250505"),
    EVENT_NM: neisString("Event name", "어린이날"),
    EVENT_CNTNT: neisString("Event content", "휴업일"),
    ONE_GRADE_EVENT_YN: neisString("Applies to grade 1", "Y"),
    TW_GRADE_EVENT_YN: neisString("Applies to grade 2", "Y"),
    THREE_GRADE_EVENT_YN: neisString("Applies to grade 3", "Y"),
    FR_GRADE_EVENT_YN: neisString("Applies to grade 4", "N"),
    FIV_GRADE_EVENT_YN: neisString("Applies to grade 5", "N"),
    SIX_GRADE_EVENT_YN: neisString("Applies to grade 6", "N"),
    LOAD_DTM: neisString("Loaded at", "20250526120000"),
  },
  { additionalProperties: true },
);

export const ScheduleListSchema = t.Array(ScheduleRowSchema, {
  examples: [
    [
      {
        ATPT_OFCDC_SC_CODE: "B10",
        SD_SCHUL_CODE: "7010208",
        SCHUL_NM: "양정고등학교",
        AY: "2025",
        AA_YMD: "20250505",
        EVENT_NM: "어린이날",
        EVENT_CNTNT: "휴업일",
        LOAD_DTM: "20250526120000",
      },
    ],
  ],
});

export const TimetableLectureSchema = t.Object({
  period: t.Number({ examples: [1] }),
  subject: t.String({ examples: ["영어"] }),
  teacher: t.String({ examples: ["김교사"] }),
});

/** Pre-substitution class; null when unchanged, object when replaced (may be partial). */
export const TimetableOriginalSchema = t.Union(
  [
    TimetableLectureSchema,
    t.Null(),
    t.Object(
      {
        period: t.Optional(t.Number()),
        subject: t.Optional(t.String()),
        teacher: t.Optional(t.String()),
      },
      { additionalProperties: true },
    ),
  ],
  {
    description:
      "The lesson Comcigan originally scheduled for this slot: an object `{period, subject, teacher}` when `replaced` is true, otherwise `null`. Always `null` for `source=neis`. When the lesson was cancelled (e.g. on exam days), `subject` is empty, `cancelled` is true and `original` names the dropped lesson.",
    examples: [
      null,
      { period: 1, subject: "국사", teacher: "김기*" },
    ],
  },
);

export const TimetablePeriodSchema = t.Object({
  period: t.Number({ examples: [1] }),
  subject: t.String({ examples: ["수학"] }),
  teacher: t.String({
    description:
      "Teacher name from Comcigan. Empty when only NEIS data is available (NEIS does not publish teachers).",
    examples: ["김교사"],
  }),
  replaced: t.Boolean({
    description: "true only when this period was substituted; most periods are false. Always false for `source=neis`.",
    examples: [false],
  }),
  original: TimetableOriginalSchema,
  cancelled: t.Boolean({
    description:
      "true when the lesson was cancelled: `replaced` is true and `subject` is empty (e.g. exam days). `original` holds the cancelled lesson.",
    examples: [false],
  }),
  makeup: t.Boolean({
    description:
      "true for a make-up lesson: `subject` starts with `[보강]`. `subject` is left as is, prefix included.",
    examples: [false],
  }),
});

export const TimetableDaySchema = t.Object({
  date: t.String({
    pattern: "^\\d{8}$",
    description: "Calendar date (YYYYMMDD) of this timetable day.",
    examples: ["20261009"],
  }),
  closed: t.Boolean({
    description:
      "true when NEIS SchoolSchedule marks the day as a holiday (`공휴일`) or school closure (`휴업일`) for this grade. The timetable for that day may still repeat the holiday name in every period.",
    examples: [true],
  }),
  events: t.Array(t.String(), {
    description:
      "SchoolSchedule `EVENT_NM`s for this day that apply to the requested grade, without `토요휴업일`. Empty when there are none.",
    examples: [["한글날"]],
  }),
});

export const TimetableResponseSchema = t.Object({
  day_time: t.Array(t.String({ examples: ["1(08:10)"] }), {
    description:
      "Bell times from Comcigan, one string per period in the form `\"<period>(HH:MM)\"`, e.g. `\"1(08:10)\"`. Start times only, no end times. Always taken from Comcigan, so it is an empty array when Comcigan has none (`source=neis`, schools not on Comcigan, or Comcigan unreachable). NEIS does not publish bell times.",
    examples: [["1(08:10)", "2(09:10)", "3(10:10)", "4(11:10)", "5(13:10)", "6(14:10)", "7(15:10)"]],
  }),
  timetable: t.Array(t.Array(TimetablePeriodSchema), {
    examples: [
      [
        [
          {
            period: 1,
            subject: "수학",
            teacher: "김교사",
            replaced: false,
            original: null,
            cancelled: false,
            makeup: false,
          },
          {
            period: 2,
            subject: "체육",
            teacher: "이교사",
            replaced: false,
            original: null,
            cancelled: false,
            makeup: false,
          },
          {
            period: 3,
            subject: "자율",
            teacher: "",
            replaced: true,
            original: {
              period: 3,
              subject: "영어",
              teacher: "박교사",
            },
            cancelled: false,
            makeup: false,
          },
          {
            period: 4,
            subject: "",
            teacher: "",
            replaced: true,
            original: {
              period: 4,
              subject: "국사",
              teacher: "김기*",
            },
            cancelled: true,
            makeup: false,
          },
          {
            period: 5,
            subject: "[보강]음악 연주와 창작",
            teacher: "",
            replaced: false,
            original: null,
            cancelled: false,
            makeup: true,
          },
        ],
      ],
    ],
  }),
  update_date: t.String({
    description:
      "Comcigan last-updated stamp, or NEIS LOAD_DTM as YYYY-MM-DD. Empty if NEIS omitted it.",
    examples: ["2025-05-26"],
  }),
  week_start: t.String({
    pattern: "^\\d{8}$",
    description:
      "Monday of the week this response describes, as YYYYMMDD in KST. `week=0` is the current Mon–Sun week in Korea, `week=1` the one after. Keep it with a cached response: a cached `week=1` whose `week_start` is now the current Monday has become this week.",
    examples: ["20261005"],
  }),
  days: t.Optional(
    t.Array(TimetableDaySchema, {
      description:
        "Per-day status from NEIS SchoolSchedule, index-aligned with `timetable` (`days[i]` describes `timetable[i]`, starting at `week_start`). Only rows that apply to the requested grade count. A week with no schedule rows returns every day with `closed: false` and `events: []`. **Omitted** when the schedule lookup fails or is slow; the timetable is still returned.",
      examples: [
        [
          { date: "20261005", closed: true, events: ["대체공휴일"] },
          { date: "20261006", closed: false, events: [] },
          { date: "20261007", closed: false, events: ["중간고사"] },
          { date: "20261008", closed: false, events: ["중간고사"] },
          { date: "20261009", closed: true, events: ["한글날"] },
        ],
      ],
    }),
  ),
});
