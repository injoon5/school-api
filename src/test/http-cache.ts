/**
 * Unit tests for ETag / If-None-Match / Cache-Control (no network).
 */
import { Elysia } from "elysia";
import { app } from "../app.js";
import {
  CacheControl,
  cachedJson,
  computeEtag,
  errorCacheControl,
  httpCache,
  ifNoneMatchMatches,
} from "../http/cache.js";
import { assert } from "./helpers.js";

async function run(): Promise<void> {
  const etag = computeEtag('{"a":1}');
  assert(/^"[A-Za-z0-9_-]{43}"$/.test(etag), "ETag is a quoted strong SHA-256 tag");
  assert(etag === computeEtag('{"a":1}'), "ETag is deterministic");
  assert(etag !== computeEtag('{"a":2}'), "ETag changes with the body");

  assert(!ifNoneMatchMatches(null, etag), "no header never matches");
  assert(!ifNoneMatchMatches("", etag), "empty header never matches");
  assert(ifNoneMatchMatches(etag, etag), "exact tag matches");
  assert(ifNoneMatchMatches(`W/${etag}`, etag), "weak form matches (weak comparison)");
  assert(ifNoneMatchMatches(`"other", ${etag}`, etag), "tag in a list matches");
  assert(ifNoneMatchMatches("*", etag), "* matches");
  assert(!ifNoneMatchMatches('"other"', etag), "different tag does not match");
  assert(
    !ifNoneMatchMatches(etag.slice(1, -1), etag),
    "unquoted tag does not match",
  );

  const fresh = cachedJson({ a: 1 }, CacheControl.timetable, null);
  assert(fresh.status === 200 && fresh.body === '{"a":1}', "200 carries the body");
  assert(fresh.headers.etag === etag, "200 carries the ETag");
  assert(fresh.headers["cache-control"] === CacheControl.timetable, "200 carries Cache-Control");
  const revalidated = cachedJson({ a: 1 }, CacheControl.timetable, etag);
  assert(revalidated.status === 304 && revalidated.body === null, "304 has an empty body");
  assert(revalidated.headers.etag === etag, "304 repeats the ETag");

  assert(
    errorCacheControl(404, "NEIS_DATA_NOT_FOUND") === CacheControl.neisDataNotFound,
    "NEIS_DATA_NOT_FOUND is CDN-cacheable",
  );
  assert(errorCacheControl(404, "SCHOOL_NOT_FOUND") === "no-store", "other 404s are no-store");
  assert(errorCacheControl(400, "VALIDATION_ERROR") === "no-store", "400 is no-store");
  assert(errorCacheControl(502, "NEIS_UPSTREAM_ERROR") === "no-store", "502 is no-store");

  // The hook inside a real Elysia app.
  const mini = new Elysia()
    .onError(({ set }) => {
      set.status = 500;
      return { ok: false };
    })
    .get("/ok", () => ({ a: 1 }), { mapResponse: httpCache(CacheControl.directory) })
    .get(
      "/fail",
      () => {
        throw new Error("boom");
      },
      { mapResponse: httpCache(CacheControl.directory) },
    );
  const first = await mini.handle(new Request("http://127.0.0.1/ok"));
  assert(first.status === 200, "mini: 200");
  assert(first.headers.get("etag") === etag, "mini: ETag header");
  assert(first.headers.get("cache-control") === CacheControl.directory, "mini: Cache-Control");
  assert(first.headers.get("content-type") === "application/json", "mini: JSON content type");
  assert((await first.text()) === '{"a":1}', "mini: body unchanged");
  const second = await mini.handle(
    new Request("http://127.0.0.1/ok", { headers: { "if-none-match": etag } }),
  );
  assert(second.status === 304, "mini: 304 on match");
  assert((await second.text()) === "", "mini: 304 body empty");
  assert(second.headers.get("etag") === etag, "mini: 304 ETag");
  const failed = await mini.handle(new Request("http://127.0.0.1/fail"));
  assert(failed.status === 500 && !failed.headers.has("etag"), "mini: errors get no ETag");

  // Real app: validation errors fail before any upstream call.
  const invalid = await app.handle(
    new Request("http://127.0.0.1/timetable?schoolcode=7010208&grade=9&classno=3"),
  );
  assert(invalid.status === 400, "invalid grade is still 400");
  assert(invalid.headers.get("cache-control") === "no-store", "400 is no-store");
  assert(!invalid.headers.has("etag"), "400 has no ETag");

  const invalidGrade = await app.handle(
    new Request(
      "http://127.0.0.1/schedule?schoolcode=7010208&startdate=20261005&enddate=20261010&grade=7",
    ),
  );
  assert(invalidGrade.status === 400, "/schedule grade outside 1–6 is 400");
  assert(invalidGrade.headers.get("cache-control") === "no-store", "/schedule 400 is no-store");

  console.log("✓ http cache: ETag, If-None-Match, Cache-Control");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
