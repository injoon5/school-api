# @schoolkit/client

TypeScript client for Korean school data APIs:

- **NEIS Open API** — school profiles, classes, lunch menus, calendars
- **Comcigan** — weekly class timetables

## Install

```bash
npm install @schoolkit/client
```

In this monorepo:

```json
{ "dependencies": { "@schoolkit/client": "workspace:*" } }
```

## NEIS

```typescript
import { NeisClient, NeisDataNotFoundError } from "@schoolkit/client";

const neis = new NeisClient({ key: process.env.NEIS_API_KEY });

const schools = await neis.schoolInfo({ SCHUL_NM: "양정고등학교" });
const school = schools[0];

const classes = await neis.classInfo({
  ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
  SD_SCHUL_CODE: school.SD_SCHUL_CODE,
  GRADE: "1",
});

const meals = await neis.mealServiceDietInfo({
  ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
  SD_SCHUL_CODE: school.SD_SCHUL_CODE,
  MLSV_FROM_YMD: "20250526",
  MLSV_TO_YMD: "20250526",
});

try {
  await neis.schoolSchedule({
    ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
    SD_SCHUL_CODE: school.SD_SCHUL_CODE,
    AA_FROM_YMD: "20250301",
    AA_TO_YMD: "20250331",
  });
} catch (e) {
  if (e instanceof NeisDataNotFoundError) {
    // no events in range
  }
}
```

Subpath import: `@schoolkit/client/neis`

## Timetable (Comcigan)

```typescript
import {
  fetchTimeTable,
  TimetableAmbiguousSchoolError,
  TimetableSchoolNotFoundError,
} from "@schoolkit/client";

const table = await fetchTimeTable({
  schoolName: "양정고등학교",
  weekNum: 0,
});

const grade1Class3 = table.timetable[1][3].slice(1); // weekdays only
console.log(table.dayTime, table.updateDate);
```

Subpath import: `@schoolkit/client/timetable`

## Errors

| Class | When |
|-------|------|
| `NeisDataNotFoundError` | NEIS `INFO-200` |
| `NeisHttpException` | Other NEIS API errors |
| `TimetableSchoolNotFoundError` | Comcigan school search empty |
| `TimetableAmbiguousSchoolError` | Multiple Comcigan matches |
| `TimetableParseError` | HTML/JSON parse failure |
| `TimetableInvalidWeekError` | `weekNum` not 0 or 1 |

## License

MIT
