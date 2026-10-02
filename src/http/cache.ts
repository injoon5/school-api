import { createHash } from "node:crypto";

/**
 * `Cache-Control` per route. `max-age` stays 0 so clients decide when to ask;
 * `s-maxage` lets the Vercel CDN absorb repeated polls, and the ETag makes
 * client revalidation cheap (304, empty body).
 */
export const CacheControl = {
  timetable: "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
  calendar: "public, max-age=0, s-maxage=21600, stale-while-revalidate=86400",
  directory: "public, max-age=0, s-maxage=86400",
  neisDataNotFound: "public, max-age=0, s-maxage=3600",
  noStore: "no-store",
} as const;

export type CacheControlValue = (typeof CacheControl)[keyof typeof CacheControl];

/** `Cache-Control` for an error response: only "no data" may be cached. */
export function errorCacheControl(
  status: number,
  code: string,
): CacheControlValue {
  return status === 404 && code === "NEIS_DATA_NOT_FOUND"
    ? CacheControl.neisDataNotFound
    : CacheControl.noStore;
}

/** Strong ETag: quoted base64url SHA-256 of the serialised body. */
export function computeEtag(body: string): string {
  return `"${createHash("sha256").update(body).digest("base64url")}"`;
}

function opaqueTag(tag: string): string {
  const trimmed = tag.trim();
  return trimmed.startsWith("W/") ? trimmed.slice(2) : trimmed;
}

/**
 * RFC 9110 §13.1.2: `If-None-Match` uses weak comparison, so `W/"x"` matches
 * `"x"` (a CDN may weaken the tag when it compresses the body). `*` matches
 * any current representation.
 */
export function ifNoneMatchMatches(
  header: string | null | undefined,
  etag: string,
): boolean {
  if (!header) return false;
  if (header.trim() === "*") return true;
  const target = opaqueTag(etag);
  return header.split(",").some((tag) => opaqueTag(tag) === target);
}

export interface CachedJsonResult {
  status: 200 | 304;
  body: string | null;
  headers: Record<string, string>;
}

/**
 * Serialise a 200 JSON body, tag it, and decide between `200` and `304`.
 * Pure so it can be tested without the app.
 */
export function cachedJson(
  value: unknown,
  cacheControl: CacheControlValue,
  ifNoneMatch: string | null | undefined,
): CachedJsonResult {
  const body = JSON.stringify(value);
  const etag = computeEtag(body);
  const headers = { etag, "cache-control": cacheControl };
  if (ifNoneMatchMatches(ifNoneMatch, etag)) {
    return { status: 304, body: null, headers };
  }
  return {
    status: 200,
    body,
    headers: { ...headers, "content-type": "application/json" },
  };
}

interface MapResponseContext {
  responseValue: unknown;
  request: Request;
  set: { status?: number | string; headers: Record<string, string | number> };
}

/**
 * Elysia `mapResponse` hook for a JSON GET route: adds `ETag` and
 * `Cache-Control` to `200` bodies and answers a matching `If-None-Match`
 * with `304`. Errors are left to `onError`.
 */
export function httpCache(cacheControl: CacheControlValue) {
  return ({ responseValue, request, set }: MapResponseContext) => {
    if (responseValue instanceof Response) return;
    if (set.status !== undefined && set.status !== 200) return;

    const result = cachedJson(
      responseValue,
      cacheControl,
      request.headers.get("if-none-match"),
    );
    Object.assign(set.headers, result.headers);
    set.status = result.status;
    return new Response(result.body, {
      status: result.status,
      headers: set.headers as Record<string, string>,
    });
  };
}
