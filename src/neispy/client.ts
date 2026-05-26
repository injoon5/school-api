import { raiseForNeisResult } from "./errors.js";
import type {
  ClassInfoRow,
  MealServiceDietInfoRow,
  NeisApiResponse,
  SchoolInfoRow,
  SchoolScheduleRow,
} from "./types.js";

const NEIS_BASE = "https://open.neis.go.kr/hub";

export interface NeispyOptions {
  key?: string;
  pIndex?: number;
  pSize?: number;
}

type QueryParams = Record<string, string | number | undefined>;

function extractRows<T>(data: NeisApiResponse<T>, key: string): T[] {
  const section = data[key]?.[1]?.row;
  if (!section) return [];
  return section;
}

export class Neispy {
  private readonly key?: string;
  private readonly pIndex: number;
  private readonly pSize: number;

  constructor(options: NeispyOptions = {}) {
    this.key = options.key;
    this.pIndex = options.pIndex ?? 1;
    this.pSize = options.pSize ?? 100;
  }

  private async request<T>(
    endpoint: string,
    params: QueryParams,
  ): Promise<NeisApiResponse<T>> {
    const search = new URLSearchParams({
      pIndex: String(this.pIndex),
      pSize: String(this.pSize),
      type: "json",
      ...(this.key ? { KEY: this.key } : {}),
    });

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        search.set(key, String(value));
      }
    }

    const url = `${NEIS_BASE}${endpoint}?${search}`;
    const response = await fetch(url);
    const data = (await response.json()) as NeisApiResponse<T> & {
      RESULT?: { CODE: string; MESSAGE: string };
    };

    if (data.RESULT) {
      const { CODE, MESSAGE } = data.RESULT;
      if (CODE !== "INFO-000") {
        raiseForNeisResult(CODE, MESSAGE);
      }
    }

    return data;
  }

  async schoolInfo(
    params: {
      SCHUL_NM?: string;
      SD_SCHUL_CODE?: string;
      ATPT_OFCDC_SC_CODE?: string;
    } = {},
  ): Promise<SchoolInfoRow[]> {
    const data = await this.request<SchoolInfoRow>("/schoolInfo", params);
    return extractRows(data, "schoolInfo");
  }

  async classInfo(params: {
    ATPT_OFCDC_SC_CODE: string;
    SD_SCHUL_CODE: string;
    AY?: string;
    GRADE?: string;
  }): Promise<ClassInfoRow[]> {
    const data = await this.request<ClassInfoRow>("/classInfo", params);
    return extractRows(data, "classInfo");
  }

  async mealServiceDietInfo(params: {
    ATPT_OFCDC_SC_CODE: string;
    SD_SCHUL_CODE: string;
    MLSV_FROM_YMD?: string;
    MLSV_TO_YMD?: string;
    MLSV_YMD?: string;
  }): Promise<MealServiceDietInfoRow[]> {
    const data = await this.request<MealServiceDietInfoRow>(
      "/mealServiceDietInfo",
      params,
    );
    return extractRows(data, "mealServiceDietInfo");
  }

  async schoolSchedule(params: {
    ATPT_OFCDC_SC_CODE: string;
    SD_SCHUL_CODE: string;
    AA_FROM_YMD?: string;
    AA_TO_YMD?: string;
    AA_YMD?: string;
  }): Promise<SchoolScheduleRow[]> {
    const data = await this.request<SchoolScheduleRow>(
      "/SchoolSchedule",
      params,
    );
    return extractRows(data, "SchoolSchedule");
  }
}
