import { t } from "elysia";

const neisString = (description: string, example: string) =>
  t.String({ description, examples: [example] });

const neisOptionalString = (description: string, example: string) =>
  t.Optional(t.String({ description, examples: [example] }));

/** GET / */
export const ApiMetaSchema = t.Object({
  name: t.String({ examples: ["TimeForSchool"] }),
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
    ENG_SCHUL_NM: neisString("English school name", "Yangchung High School"),
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
    HS_GNRL_BUSNS_SC_NM: neisString("General/vocational", "일반계"),
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
  minItems: 1,
  examples: [
    [
      {
        ATPT_OFCDC_SC_CODE: "B10",
        ATPT_OFCDC_SC_NM: "서울특별시교육청",
        SD_SCHUL_CODE: "7010208",
        SCHUL_NM: "양정고등학교",
        ENG_SCHUL_NM: "Yangchung High School",
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
  minItems: 1,
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
  minItems: 1,
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
export const TimetableOriginalSchema = t.Union([
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
]);

export const TimetablePeriodSchema = t.Object({
  period: t.Number({ examples: [1] }),
  subject: t.String({ examples: ["수학"] }),
  teacher: t.String({ examples: ["김교사"] }),
  replaced: t.Boolean({
    description: "true only when this period was substituted; most periods are false.",
    examples: [false],
  }),
  original: TimetableOriginalSchema,
});

export const TimetableResponseSchema = t.Object({
  day_time: t.Array(t.String({ examples: ["09:00"] }), {
    minItems: 1,
    examples: [["09:00", "09:50", "10:00"]],
  }),
  timetable: t.Array(t.Array(TimetablePeriodSchema), {
    minItems: 1,
    examples: [
      [
        [
          {
            period: 1,
            subject: "수학",
            teacher: "김교사",
            replaced: false,
            original: null,
          },
          {
            period: 2,
            subject: "체육",
            teacher: "이교사",
            replaced: false,
            original: null,
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
          },
        ],
      ],
    ],
  }),
  update_date: t.String({ examples: ["2025-05-26"] }),
});
