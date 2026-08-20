import { NeisException, NeisHttpException, raiseForNeisResult } from "./errors.js";
import type {
  AcaInsTiInfoParams,
  AcaInsTiInfoRow,
  ClassInfoParams,
  ClassInfoRow,
  ElsTimetableRow,
  HisTimetableRow,
  MealServiceDietInfoParams,
  MealServiceDietInfoRow,
  MisTimetableRow,
  NeisApiResponse,
  SchoolInfoParams,
  SchoolInfoRow,
  SchoolMajorInfoParams,
  SchoolMajorInfoRow,
  SchoolScheduleParams,
  SchoolScheduleRow,
  SchulAflcoInfoParams,
  SchulAflcoInfoRow,
  SpsTimetableRow,
  TiClrmInfoParams,
  TiClrmInfoRow,
  TimetableParams,
  TimetableRow,
} from "./types.js";

const NEIS_BASE = "https://open.neis.go.kr/hub";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_PAGES = 100;

export interface NeisClientOptions {
  /** NEIS Open API key. When omitted, requests are sent anonymously (stricter rate limits apply). */
  key?: string;
  pIndex?: number;
  /** Rows per page (NEIS allows up to 1000). Defaults to 1000 to avoid silent truncation. */
  pSize?: number;
  /** Per-request timeout in milliseconds. Defaults to 10s. */
  timeoutMs?: number;
}

function extractRows<T>(data: NeisApiResponse<T>, key: string): T[] {
  const section = data[key]?.[1]?.row;
  if (!section) return [];
  return section;
}

function extractTotal<T>(data: NeisApiResponse<T>, key: string): number {
  const head = data[key]?.[0]?.head;
  if (!Array.isArray(head) || head.length === 0) return 0;
  const first = head[0] as { list_total_count?: number } | undefined;
  return typeof first?.list_total_count === "number" ? first.list_total_count : 0;
}

function yearOf(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value);
  if (text.length < 4) return undefined;
  const year = Number(text.slice(0, 4));
  return Number.isFinite(year) ? year : undefined;
}

/** Pre-2023 timetable rows live on the `*Timetablebgs` endpoints. */
export function isLegacyTimetable(params: TimetableParams): boolean {
  const years = [
    yearOf(params.AY),
    yearOf(params.ALL_TI_YMD),
    yearOf(params.TI_FROM_YMD),
    yearOf(params.TI_TO_YMD),
  ].filter((year): year is number => year !== undefined);
  return years.some((year) => year < 2023);
}

export type SchoolTimetableKind = "els" | "mis" | "his" | "sps";

/**
 * Map NEIS `SCHUL_KND_SC_NM` (학교종류명) onto the matching timetable endpoint.
 */
export function timetableKindFromSchool(
  schoolKindName: string | undefined,
): SchoolTimetableKind {
  const kind = schoolKindName ?? "";
  if (kind.includes("초등")) return "els";
  if (kind.includes("중학")) return "mis";
  if (kind.includes("특수")) return "sps";
  if (kind.includes("고등")) return "his";
  throw new NeisException(
    `Unsupported SCHUL_KND_SC_NM: ${schoolKindName ?? "(missing)"}`,
  );
}

/**
 * Async client for the NEIS Open API (school info, classes, meals, calendar, timetables).
 *
 * Method names match the Python `neispy` package.
 */
export class NeisClient {
  private readonly key?: string;
  private readonly pIndex: number;
  private readonly pSize: number;
  private readonly timeoutMs: number;

  constructor(options: NeisClientOptions = {}) {
    this.key = options.key;
    this.pIndex = options.pIndex ?? 1;
    this.pSize = options.pSize ?? 1000;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async request<T>(
    endpoint: string,
    params: object,
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
    const response = await fetch(url, {
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new NeisHttpException(
        `HTTP-${response.status}`,
        response.statusText || "NEIS request failed",
      );
    }

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

  private async requestRows<T>(
    endpoint: string,
    key: string,
    params: object,
  ): Promise<T[]> {
    const all: T[] = [];
    let page = this.pIndex;

    for (let i = 0; i < MAX_PAGES; i += 1) {
      const data = await this.request<T>(endpoint, {
        ...params,
        pIndex: page,
        pSize: this.pSize,
      });
      const rows = extractRows(data, key);
      all.push(...rows);
      const total = extractTotal(data, key);
      if (total <= 0 || all.length >= total || rows.length === 0) break;
      page += 1;
    }

    return all;
  }

  private timetableEndpoint(kind: SchoolTimetableKind, params: TimetableParams): string {
    const suffix = isLegacyTimetable(params) ? "bgs" : "";
    return `/${kind}Timetable${suffix}`;
  }

  schoolInfo(params: SchoolInfoParams = {}): Promise<SchoolInfoRow[]> {
    return this.requestRows<SchoolInfoRow>("/schoolInfo", "schoolInfo", params);
  }

  classInfo(params: ClassInfoParams): Promise<ClassInfoRow[]> {
    return this.requestRows<ClassInfoRow>("/classInfo", "classInfo", params);
  }

  mealServiceDietInfo(
    params: MealServiceDietInfoParams,
  ): Promise<MealServiceDietInfoRow[]> {
    return this.requestRows<MealServiceDietInfoRow>(
      "/mealServiceDietInfo",
      "mealServiceDietInfo",
      params,
    );
  }

  schoolSchedule(params: SchoolScheduleParams): Promise<SchoolScheduleRow[]> {
    return this.requestRows<SchoolScheduleRow>(
      "/SchoolSchedule",
      "SchoolSchedule",
      params,
    );
  }

  acaInsTiInfo(params: AcaInsTiInfoParams): Promise<AcaInsTiInfoRow[]> {
    return this.requestRows<AcaInsTiInfoRow>("/acaInsTiInfo", "acaInsTiInfo", params);
  }

  elsTimetable(params: TimetableParams): Promise<ElsTimetableRow[]> {
    return this.requestRows<ElsTimetableRow>(
      this.timetableEndpoint("els", params),
      "elsTimetable",
      params,
    );
  }

  misTimetable(params: TimetableParams): Promise<MisTimetableRow[]> {
    return this.requestRows<MisTimetableRow>(
      this.timetableEndpoint("mis", params),
      "misTimetable",
      params,
    );
  }

  hisTimetable(params: TimetableParams): Promise<HisTimetableRow[]> {
    return this.requestRows<HisTimetableRow>(
      this.timetableEndpoint("his", params),
      "hisTimetable",
      params,
    );
  }

  spsTimetable(params: TimetableParams): Promise<SpsTimetableRow[]> {
    return this.requestRows<SpsTimetableRow>(
      this.timetableEndpoint("sps", params),
      "spsTimetable",
      params,
    );
  }

  /**
   * Dispatch to els/mis/his/sps timetable using `SCHUL_KND_SC_NM`.
   */
  schoolTimetable(
    schoolKindName: string | undefined,
    params: TimetableParams,
  ): Promise<TimetableRow[]> {
    const kind = timetableKindFromSchool(schoolKindName);
    return this.requestRows<TimetableRow>(
      this.timetableEndpoint(kind, params),
      `${kind}Timetable`,
      params,
    );
  }

  schoolMajorinfo(params: SchoolMajorInfoParams): Promise<SchoolMajorInfoRow[]> {
    return this.requestRows<SchoolMajorInfoRow>(
      "/schoolMajorinfo",
      "schoolMajorinfo",
      params,
    );
  }

  schulAflcoinfo(params: SchulAflcoInfoParams): Promise<SchulAflcoInfoRow[]> {
    return this.requestRows<SchulAflcoInfoRow>(
      "/schulAflcoinfo",
      "schulAflcoinfo",
      params,
    );
  }

  tiClrminfo(params: TiClrmInfoParams): Promise<TiClrmInfoRow[]> {
    return this.requestRows<TiClrmInfoRow>("/tiClrminfo", "tiClrminfo", params);
  }
}
