# Agent instructions (TimeForSchool monorepo)

Instructions for Cursor Cloud Agents and other automation working in this repository.

## Repository map

| Area | Path | Purpose |
| ---- | ---- | ------- |
| HTTP API | `src/` | Elysia app; OpenAPI at `/docs/json` |
| Client library | `packages/client/` | `@timeforschool/client` (npm) |
| Docs site | `apps/docs/` | Fumadocs + Next.js |
| OpenAPI artifact | `apps/docs/openapi/openapi.json` | Committed spec for docs |
| Generated API MDX | `apps/docs/content/docs/api/` | Do not hand-edit |

Deployment plan: **[docs/vercel-deploy.md](docs/vercel-deploy.md)**.

---

## Keep docs in sync with the API

When a change **might** affect the public HTTP API or its OpenAPI description, refresh docs **in the same PR** before finishing.

### Triggers (run sync if you touch any of these)

- `src/app.ts` — routes, handlers, validation
- `src/openapi-config.ts` — titles, tags, servers, descriptions
- `src/schemas/**` — request/response models
- `src/services/**` — behavior that changes API outputs or errors
- `src/errors/**` — error codes/messages exposed to clients

**Not required** for-only changes: `packages/client/` (unless mirroring new public API behavior in hand-written client MDX), `apps/docs/content/docs/client/**`, tests, README typos.

### Command

From repository root:

```bash
npm run openapi:sync
```

This runs `build:client` → `scripts/export-openapi.ts` → `apps/docs` OpenAPI MDX generation.

### Commit these paths when they change

```
apps/docs/openapi/openapi.json
apps/docs/content/docs/api/**
```

Do **not** delete `apps/docs/content/docs/api/meta.mdx` if regenerated—it is the “Meta” tag page. Keep `apps/docs/content/docs/api/meta.json` in sync with the generated page list.

### Hand-written docs

Update `apps/docs/content/docs/client/**` when you change the **client** API surface (new exports, renames, error classes). No generator for that yet.

### Verify

```bash
npm run build:docs
```

---

## Vercel

- **Two projects** from one repo: API root `.`, docs root `apps/docs`. See [docs/vercel-deploy.md](docs/vercel-deploy.md).
- Do not merge API and docs into one Vercel project.
- Docs production build must run `openapi:sync` (already in `apps/docs/vercel.json` `buildCommand`).

---

## npm client

- Publish only `packages/client` (`@timeforschool/client`).
- Before release: `npm run build -w @timeforschool/client`, version bump in `packages/client/package.json`.
- CI publish: `.github/workflows/publish-client.yml` on GitHub Release + `NPM_TOKEN`.

---

## Quality bar before opening/updating a PR

1. If API triggers above applied → `npm run openapi:sync` and commit generated files.
2. `npm run build` (API + client compile).
3. `npm run build:docs` when `apps/docs/**` or API surface changed.
4. `npm test` when touching runtime behavior.

---

## Stop conditions

- Do not commit secrets (`.env`, `NEIS_API_KEY`).
- Do not edit generated `apps/docs/content/docs/api/*.mdx` by hand—re-run `openapi:sync`.
- If `openapi:sync` fails, fix the Elysia app export first (`app.handle` → `/docs/json` must return 200).
