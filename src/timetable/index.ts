import iconv from "iconv-lite";
import type { Lecture, TimeTableData, TimeTableResult } from "./types.js";

const COMCIGAN_URL = "http://comci.net:4082";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
};

interface ComciganCodes {
  comciganCode: string;
  code0: string;
  code1: string;
  code2: string;
  code3: string;
  code4: string;
  code5: string;
}

// Comcigan nests counts and period codes in heterogeneous arrays.
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
  const response = await fetch(url, { headers: HEADERS });
  const buffer = Buffer.from(await response.arrayBuffer());
  if (encoding === "euc-kr") {
    return iconv.decode(buffer, "euc-kr");
  }
  return buffer.toString("utf-8");
}

async function getCode(): Promise<ComciganCodes> {
  const text = await fetchText(`${COMCIGAN_URL}/st`, "euc-kr");

  const comciganMatch = text.match(/\.\/[0-9]+\?[0-9]+l/);
  if (!comciganMatch) throw new Error("Failed to parse comcigan route code");

  const code0 = text.match(/sc_data\('([0-9]+)_/)?.[1];
  const code1 = text.match(/Q성명\(자료\.자료(\d+)/)?.[1];
  const code2 = text.match(/자료\.자료(\d+)\[sb\]/)?.[1];
  const code3 = text.match(/=H시간표\.자료(\d+)/)?.[1];
  const code4 = text.match(/일일자료=Q자료\(자료\.자료(\d+)/)?.[1];
  const code5 = text.match(/원자료=Q자료\(자료\.자료(\d+)/)?.[1];

  if (!code0 || !code1 || !code2 || !code3 || !code4 || !code5) {
    throw new Error("Failed to parse comcigan data field codes");
  }

  return {
    comciganCode: comciganMatch[0].slice(1),
    code0,
    code1,
    code2,
    code3,
    code4,
    code5,
  };
}

function encodeSchoolName(schoolName: string): string {
  const bytes = iconv.encode(schoolName, "euc-kr");
  return Array.from(bytes)
    .map((byte) => `%${byte.toString(16).toUpperCase().padStart(2, "0")}`)
    .join("");
}

async function getSchoolCode(
  schoolName: string,
  localCode: number,
  schoolCode: number,
  comciganCode: string,
): Promise<[number, string, number] | [-1, -1, unknown] | [-2, -2, unknown]> {
  const url = `${COMCIGAN_URL}${comciganCode}${encodeSchoolName(schoolName)}`;
  const text = await fetchText(url);
  const cleaned = text.replace(/\0/g, "").trim();
  const resp = JSON.parse(cleaned) as {
    학교검색: [number, string, string, number][];
  };

  if (resp.학교검색.length === 0) {
    return [-2, -2, resp];
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
    return [-1, -1, resp];
  }

  const first = resp.학교검색[0];
  return [first[0], first[2], first[3]];
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value !== "") return Number(value);
  return 0;
}

function getMatrix(resp: ComciganResponse, code: string): ComciganMatrix {
  return resp[`자료${code}`] as ComciganMatrix;
}

function getStringList(resp: ComciganResponse, code: string): string[] {
  return [...(resp[`자료${code}`] as string[])];
}

export async function fetchTimeTable(options: {
  schoolName: string;
  localCode?: number;
  schoolCode?: number;
  weekNum?: number;
}): Promise<TimeTableResult> {
  const weekNum = options.weekNum ?? 0;
  if (weekNum !== 0 && weekNum !== 1) {
    throw new Error("weekNum must be 0 or 1");
  }

  const localCode = Number(options.localCode ?? 0);
  const schoolCodeHint = Number(options.schoolCode ?? 0);

  const codes = await getCode();
  const schoolLookup = await getSchoolCode(
    options.schoolName,
    localCode,
    schoolCodeHint,
    codes.comciganCode,
  );

  if (schoolLookup[0] === -1) {
    throw new Error("학교가 2개 이상 존재합니다.");
  }
  if (schoolLookup[0] === -2) {
    throw new Error("학교를 찾을 수 없습니다.");
  }

  const resolvedLocalCode = schoolLookup[0] as number;
  const resolvedSchoolName = schoolLookup[1] as string;
  const resolvedSchoolCode = schoolLookup[2] as number;
  const payload = `${codes.code0}_${resolvedSchoolCode}_0_${weekNum + 1}`;
  const encoded = Buffer.from(payload, "utf-8").toString("base64");
  const timetableUrl = `${COMCIGAN_URL}${codes.comciganCode.slice(0, 7)}${encoded}`;
  const raw = await fetchText(timetableUrl);
  const jsonLine = raw.split("\n")[0];
  const resp = JSON.parse(jsonLine) as ComciganResponse;

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

      const classOriginal = originalTimetable[grade]?.[cls] as unknown[] | undefined;
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
          const teacherIndex = periodNum % 100;

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
              teacher: teacherList[originalPeriod % 100] ?? "",
            };
          }

          data[grade][cls][day].push(entry);
        }
      }
      cls += 1;
    }
  }

  const homeroomRaw = structuredClone(resp.담임) as number[][];
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

export type { Lecture, TimeTableData, TimeTableResult };
