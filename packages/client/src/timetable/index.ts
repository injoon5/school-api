import iconv from "iconv-lite";
import {
  TimetableAmbiguousSchoolError,
  TimetableInvalidWeekError,
  TimetableParseError,
  TimetableSchoolNotFoundError,
} from "./errors.js";
import { fetchNeisTimeTable } from "./neis.js";
import type { FetchTimeTableOptions, TimeTableData, TimeTableResult } from "./types.js";

export type {
  FetchTimeTableOptions,
  Lecture,
  TimeTableData,
  TimeTableResult,
  TimetableSource,
} from "./types.js";
export {
  fetchNeisTimeTable,
  mapNeisTimetableRows,
  weekYmdRange,
  formatYmdDash,
  kstYmd,
} from "./neis.js";
export type { FetchNeisTimeTableOptions } from "./neis.js";
export {
  TimetableAmbiguousSchoolError,
  TimetableError,
  TimetableInvalidWeekError,
  TimetableParseError,
  TimetableSchoolNotFoundError,
} from "./errors.js";

const COMCIGAN_URL = "http://comci.net:4082";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
};
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * The `/st` route/field codes change rarely, so cache them briefly to avoid a
 * scrape + parse on every timetable request. TTL keeps us resilient to the
 * occasional upstream layout change without a process restart.
 */
const CODE_CACHE_TTL_MS = 5 * 60_000;
let codeCache: { value: ComciganCodes; expiresAt: number } | null = null;

interface ComciganCodes {
  comciganCode: string;
  code0: string;
  code1: string;
  code2: string;
  code3: string;
  code4: string;
  code5: string;
}

type ComciganMatrix = unknown[][][][];

interface ComciganResponse {
  지역명: string;
  학년도: number;
  시작일: string;
  일과시간: string[];
  담임: number[][];
  [key: string]: unknown;
}

async function fetchText(
  url: string,
  encoding?: "euc-kr" | "utf-8",
): Promise<string> {
  const response = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new TimetableParseError(
      `Comcigan HTTP ${response.status}: ${response.statusText}`,
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (encoding === "euc-kr") {
    return iconv.decode(buffer, "euc-kr");
  }
  return buffer.toString("utf-8");
}

async function getCode(): Promise<ComciganCodes> {
  if (codeCache && codeCache.expiresAt > Date.now()) {
    return codeCache.value;
  }

  const text = await fetchText(`${COMCIGAN_URL}/st`, "euc-kr");

  const comciganMatch = text.match(/\.\/[0-9]+\?[0-9]+l/);
  if (!comciganMatch) {
    throw new TimetableParseError("Failed to parse Comcigan route code from /st");
  }

  const code0 = text.match(/sc_data\('([0-9]+)_/)?.[1];
  const code1 = text.match(/Q성명\(자료\.자료(\d+)/)?.[1];
  const code2 = text.match(/자료\.자료(\d+)\[sb\]/)?.[1];
  const code3 = text.match(/=H시간표\.자료(\d+)/)?.[1];
  const code4 = text.match(/일일자료=Q자료\(자료\.자료(\d+)/)?.[1];
  const code5 = text.match(/원자료=Q자료\(자료\.자료(\d+)/)?.[1];

  if (!code0 || !code1 || !code2 || !code3 || !code4 || !code5) {
    throw new TimetableParseError(
      "Failed to parse Comcigan timetable field codes (page layout may have changed)",
    );
  }

  const value: ComciganCodes = {
    comciganCode: comciganMatch[0].slice(1),
    code0,
    code1,
    code2,
    code3,
    code4,
    code5,
  };
  codeCache = { value, expiresAt: Date.now() + CODE_CACHE_TTL_MS };
  return value;
}

function encodeSchoolName(schoolName: string): string {
  const bytes = iconv.encode(schoolName, "euc-kr");
  return Array.from(bytes)
    .map((byte) => `%${byte.toString(16).toUpperCase().padStart(2, "0")}`)
    .join("");
}

async function resolveComciganSchool(
  schoolName: string,
  localCode: number,
  schoolCode: number,
  comciganCode: string,
): Promise<[number, string, number]> {
  const url = `${COMCIGAN_URL}${comciganCode}${encodeSchoolName(schoolName)}`;
  const text = await fetchText(url);
  const cleaned = text.replace(/\0/g, "").trim();

  let resp: { 학교검색: [number, string, string, number][] };
  try {
    resp = JSON.parse(cleaned) as typeof resp;
  } catch {
    throw new TimetableParseError("Invalid JSON from Comcigan school search");
  }

  if (!Array.isArray(resp?.학교검색)) {
    throw new TimetableParseError(
      "Unexpected Comcigan school-search payload (missing 학교검색 list)",
    );
  }

  if (resp.학교검색.length === 0) {
    throw new TimetableSchoolNotFoundError(schoolName);
  }

  if (resp.학교검색.length > 1) {
    if (schoolCode) {
      for (const data of resp.학교검색) {
        if (data[3] === schoolCode) {
          return [data[0], data[2], data[3]];
        }
      }
    }
    if (localCode) {
      for (const data of resp.학교검색) {
        if (data[0] === localCode) {
          return [data[0], data[2], data[3]];
        }
      }
    }
    throw new TimetableAmbiguousSchoolError(schoolName);
  }

  const first = resp.학교검색[0];
  return [first[0], first[2], first[3]];
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getMatrix(resp: ComciganResponse, code: string): ComciganMatrix {
  const field = resp[`자료${code}`];
  if (!Array.isArray(field)) {
    throw new TimetableParseError(
      `Comcigan response missing expected matrix field 자료${code}`,
    );
  }
  return field as ComciganMatrix;
}

function getStringList(resp: ComciganResponse, code: string): string[] {
  const field = resp[`자료${code}`];
  if (!Array.isArray(field)) {
    throw new TimetableParseError(
      `Comcigan response missing expected list field 자료${code}`,
    );
  }
  return [...(field as string[])];
}

/**
 * Fetch a weekly class timetable from Comcigan (컴시간), or from NEIS when
 * `source` is `"neis"`.
 */
export async function fetchTimeTable(
  options: FetchTimeTableOptions,
): Promise<TimeTableResult> {
  if ((options.source ?? "comcigan") === "neis") {
    return fetchNeisTimeTable(options);
  }

  const weekNum = options.weekNum ?? 0;
  if (weekNum !== 0 && weekNum !== 1) {
    throw new TimetableInvalidWeekError(weekNum);
  }

  const localCode = Number(options.localCode ?? 0);
  const schoolCodeHint = Number(options.schoolCode ?? 0);

  const codes = await getCode();
  const [resolvedLocalCode, resolvedSchoolName, resolvedSchoolCode] =
    await resolveComciganSchool(
      options.schoolName,
      localCode,
      schoolCodeHint,
      codes.comciganCode,
    );

  const payload = `${codes.code0}_${resolvedSchoolCode}_0_${weekNum + 1}`;
  const encoded = Buffer.from(payload, "utf-8").toString("base64");
  const timetableUrl = `${COMCIGAN_URL}${codes.comciganCode.slice(0, 7)}${encoded}`;
  const raw = await fetchText(timetableUrl);
  const jsonLine = raw.split("\n")[0];

  let resp: ComciganResponse;
  try {
    resp = JSON.parse(jsonLine) as ComciganResponse;
  } catch {
    throw new TimetableParseError("Invalid JSON from Comcigan timetable endpoint");
  }

  const teacherList = getStringList(resp, codes.code1);
  teacherList[0] = "";
  const subList = getStringList(resp, codes.code2);
  subList[0] = "";

  const originalTimetable = getMatrix(resp, codes.code5);
  const dailyTimetable = getMatrix(resp, codes.code4);

  const data: TimeTableData[][][][] = [];

  for (let gradeIdx = 0; gradeIdx < dailyTimetable.length; gradeIdx += 1) {
    const classRow = dailyTimetable[gradeIdx];
    if (gradeIdx === 0) {
      data.push([]);
      continue;
    }

    data.push([]);
    const grade = gradeIdx;
    let cls = 0;

    if (!Array.isArray(classRow)) continue;

    for (const dayRow of classRow) {
      if (cls === 0) {
        data[grade].push([[]]);
        cls += 1;
        continue;
      }

      data[grade].push([[]]);

      const classOriginal = originalTimetable[grade]?.[cls] as
        | unknown[]
        | undefined;
      const maxDay = asNumber(classOriginal?.[0]);
      for (let day = 1; day <= maxDay; day += 1) {
        data[grade][cls].push([]);

        const dayOriginal = classOriginal?.[day] as unknown[] | undefined;
        const maxPeriod = asNumber(dayOriginal?.[0]);
        for (let period = 1; period <= maxPeriod; period += 1) {
          const originalPeriod = asNumber(dayOriginal?.[period]);
          const dayCells = dayRow[day] as unknown[] | undefined;
          const dayPeriodCount = asNumber(dayCells?.[0] ?? 0);
          const periodNum =
            dayPeriodCount < period ? 0 : asNumber(dayCells?.[period] ?? 0);

          const subjectIndex = Math.floor(periodNum / 1000);
          const teacherIndex = periodNum % 1000;

          const entry: TimeTableData = {
            period,
            subject: subList[subjectIndex] ?? "",
            teacher: teacherList[teacherIndex] ?? "",
            replaced: periodNum !== originalPeriod,
            original: null,
          };

          if (periodNum !== originalPeriod) {
            entry.original = {
              period,
              subject: subList[Math.floor(originalPeriod / 1000)] ?? "",
              teacher: teacherList[originalPeriod % 1000] ?? "",
            };
          }

          data[grade][cls][day].push(entry);
        }
      }
      cls += 1;
    }
  }

  const homeroomRaw = (resp.담임 ?? []) as number[][];
  const homeroomStrings: string[][] = [];

  for (let g = 0; g < homeroomRaw.length; g += 1) {
    homeroomStrings[g] = [];
    for (let c = 0; c < homeroomRaw[g].length; c += 1) {
      const value = homeroomRaw[g][c];
      if (value === 0 || value === 255) break;
      homeroomStrings[g][c] = teacherList[value] ?? "";
    }
  }

  return {
    schoolCode: resolvedSchoolCode,
    schoolName: resolvedSchoolName,
    localCode: resolvedLocalCode,
    localName: String(resp.지역명),
    schoolYear: Number(resp.학년도),
    startDate: String(resp.시작일),
    dayTime: resp.일과시간,
    updateDate: String(resp[`자료${codes.code3}`]),
    timetable: data,
    homeroomTeachers: homeroomStrings,
  };
}
