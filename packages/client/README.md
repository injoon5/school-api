# @timeforschool/client

TypeScript client for Korean school data APIs:

- **NEIS Open API** — school profiles, classes, lunch menus, calendars
- **Comcigan + NEIS timetables** — `fetchTimeTable` defaults to `source: "auto"` (one source if the other is empty; otherwise shorter subject wins and weekday gaps fill). Pin `comcigan` or `neis` to call one upstream.

## Install

```bash
npm install @timeforschool/client
```

Full docs: [docs.timefor.school](https://docs.timefor.school) (monorepo: `apps/docs/`).

In this monorepo:

```json
{ "dependencies": { "@timeforschool/client": "workspace:*" } }
```

## NEIS

```typescript
import { NeisClient, NeisDataNotFoundError } from "@timeforschool/client";

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

const periods = await neis.hisTimetable({
  ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
  SD_SCHUL_CODE: school.SD_SCHUL_CODE,
  TI_FROM_YMD: "20260511",
  TI_TO_YMD: "20260515",
  GRADE: "1",
  CLASS_NM: "3",
});
```

`NeisClient` covers the same endpoints as Python [neispy](https://github.com/SaidBySolo/neispy): `schoolInfo`, `classInfo`, `mealServiceDietInfo`, `schoolSchedule`, `acaInsTiInfo`, `elsTimetable` / `misTimetable` / `hisTimetable` / `spsTimetable` (plus pre-2023 `*bgs` routes), `schoolMajorinfo`, `schulAflcoinfo`, `tiClrminfo`.

Subpath import: `@timeforschool/client/neis`

## Timetable

```typescript
import {
  fetchTimeTable,
  TimetableAmbiguousSchoolError,
  TimetableSchoolNotFoundError,
} from "@timeforschool/client";

const table = await fetchTimeTable({
  schoolName: "양정고등학교",
  weekNum: 0,
  key: process.env.NEIS_API_KEY, // used by default `source: "auto"`
});

const neisOnly = await fetchTimeTable({
  schoolName: "용인한국외국어대학교부설고등학교",
  schoolCode: 7531146,
  weekNum: 0,
  source: "neis",
  key: process.env.NEIS_API_KEY,
});

const grade1Class3 = table.timetable[1][3].slice(1); // Mon–Fri
console.log(table.dayTime, table.updateDate);
```

Default merge: if only one source has subjects, that result is used as-is. Otherwise shorter subject wins, missing weekdays/periods fill from the other source, cancelled Comcigan periods stay cancelled. NEIS Saturday (`토요휴업일`) is dropped. NEIS leaves `teacher`, `dayTime`, `homeroomTeachers`, and `original` blank when Comcigan has nothing to overlay.

Subpath import: `@timeforschool/client/timetable`

## Errors

| Class | When |
|-------|------|
| `NeisDataNotFoundError` | NEIS `INFO-200` |
| `NeisHttpException` | Other NEIS API errors |
| `TimetableSchoolNotFoundError` | Comcigan/NEIS school search empty |
| `TimetableAmbiguousSchoolError` | Multiple Comcigan matches |
| `TimetableParseError` | HTML/JSON parse failure |
| `TimetableInvalidWeekError` | `weekNum` not 0 or 1 |

## License

MIT
