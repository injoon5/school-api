# SchoolKit

TypeScript API for NEIS school data (school info, classes, lunch, schedule) and Comcigan timetables.

Built with [Elysia](https://elysiajs.com).

## Setup

```bash
npm install
```

Copy `.env.example` to `.env.local` for local overrides.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEIS_API_KEY` | No | NEIS API key (falls back to bundled sample key) |
| `PORT` | No | Local dev port (default `8000`) |

## Development

```bash
npm run dev
```

Or with Vercel’s dev server (matches production routing):

```bash
npx vercel dev
```

## Scripts

- `npm run build` — compile to `dist/` (local / Render)
- `npm start` — run compiled server
- `npm test` — smoke tests + comparison with api.timefor.school

## Endpoints

| Route | Description |
|-------|-------------|
| `GET /` | Health check |
| `GET /school` | School info (`schoolname`) |
| `GET /classes` | Class numbers (`grade`, `schoolname` or `schoolcode`) |
| `GET /timetable` | Weekly timetable (`grade`, `classno`, `week`, `schoolname` or `schoolcode`) |
| `GET /lunch` | Meal menus (`startdate`, `enddate`, `schoolname` or `schoolcode`) |
| `GET /schedule` | School calendar (`startdate`, `enddate`, `schoolname` or `schoolcode`) |

## Deploy to Vercel

Vercel detects Elysia automatically when `src/app.ts` default-exports the app ([docs](https://vercel.com/docs/frameworks/backend/elysia)).

1. Import this repo in [Vercel](https://vercel.com/new).
2. **Environment variables** (Production):
   - `NEIS_API_KEY` — your NEIS key (recommended for production traffic).
3. Deploy. No custom build command required; framework preset is **Other** / auto-detected Elysia.

CLI:

```bash
npx vercel link
npx vercel env add NEIS_API_KEY
npx vercel deploy --prod
```

`vercel.json` sets region `icn1` (Seoul) and `maxDuration: 30` for timetable/NEIS upstream calls.

### Custom domain

Point `api.timefor.school` (or your domain) to the Vercel project under **Settings → Domains**.
