import { raiseForNeisResult } from "./errors.js";
import type {
  ClassInfoParams,
  ClassInfoRow,
  MealServiceDietInfoParams,
  MealServiceDietInfoRow,
  NeisApiResponse,
  SchoolInfoParams,
  SchoolInfoRow,
  SchoolScheduleParams,
  SchoolScheduleRow,
} from "./types.js";

const NEIS_BASE = "https://open.neis.go.kr/hub";
const DEFAULT_TIMEOUT_MS = 10_000;

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

/**
 * Async client for the NEIS Open API (school info, classes, meals, calendar).
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
      throw new Error(`NEIS HTTP ${response.status}: ${response.statusText}`);
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

  schoolInfo(params: SchoolInfoParams = {}): Promise<SchoolInfoRow[]> {
    return this.request<SchoolInfoRow>("/schoolInfo", params).then((data) =>
      extractRows(data, "schoolInfo"),
    );
  }

  classInfo(params: ClassInfoParams): Promise<ClassInfoRow[]> {
    return this.request<ClassInfoRow>("/classInfo", params).then((data) =>
      extractRows(data, "classInfo"),
    );
  }

  mealServiceDietInfo(
    params: MealServiceDietInfoParams,
  ): Promise<MealServiceDietInfoRow[]> {
    return this.request<MealServiceDietInfoRow>(
      "/mealServiceDietInfo",
      params,
    ).then((data) => extractRows(data, "mealServiceDietInfo"));
  }

  schoolSchedule(params: SchoolScheduleParams): Promise<SchoolScheduleRow[]> {
    return this.request<SchoolScheduleRow>("/SchoolSchedule", params).then(
      (data) => extractRows(data, "SchoolSchedule"),
    );
  }
}

/** @deprecated Use {@link NeisClient} */
export const Neispy = NeisClient;

/** @deprecated Use {@link NeisClientOptions} */
export type NeispyOptions = NeisClientOptions;
