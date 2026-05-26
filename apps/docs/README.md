# @timeforschool/docs

[Fumadocs](https://www.fumadocs.dev/) documentation site for:

- **`@timeforschool/client`** — hand-written MDX under `content/docs/client/`
- **HTTP API** — OpenAPI-driven pages from `openapi/openapi.json`

## Commands

From the repository root:

```bash
npm run dev:docs
npm run build:docs
npm run openapi:sync   # export spec from Elysia + regenerate API MDX
```

## Deploy (Vercel)

Set **Root Directory** to `apps/docs`. The install/build commands in `vercel.json` run from the monorepo root so workspaces resolve.

Optional env:

| Variable | Description |
| -------- | ----------- |
| `NEXT_PUBLIC_DOCS_URL` | Canonical site URL for metadata (default `https://timefor.school`) |
