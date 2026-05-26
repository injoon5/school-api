# SchoolKit

TypeScript API for NEIS school data (school info, classes, lunch, schedule) and Comcigan timetables.

Built with [Elysia](https://elysiajs.com).

## Setup

```bash
npm install
```

Optional: set `NEIS_API_KEY` (defaults to the key from the original project).

## Development

```bash
npm run dev
```

Server listens on port `8000` by default (`PORT` env overrides).

## Scripts

- `npm run build` — compile to `dist/`
- `npm start` — run compiled server
- `npm test` — smoke-test all endpoints

## Endpoints

| Route | Description |
|-------|-------------|
| `GET /` | Health check |
| `GET /school` | School info (`schoolname`) |
| `GET /classes` | Class numbers (`grade`, `schoolname` or `schoolcode`) |
| `GET /timetable` | Weekly timetable (`grade`, `classno`, `week`, `schoolname` or `schoolcode`) |
| `GET /lunch` | Meal menus (`startdate`, `enddate`, `schoolname` or `schoolcode`) |
| `GET /schedule` | School calendar (`startdate`, `enddate`, `schoolname` or `schoolcode`) |
