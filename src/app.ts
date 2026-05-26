import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { CORS_ORIGINS, NEIS_API_KEY } from "./config.js";
import { Neispy } from "./neispy/client.js";
import { fetchTimeTable } from "./timetable/index.js";

const REMOVE_PAREN_PATTERN = /\([^)]*\)/g;

function errorResponse(message: string) {
  return { error: true, message, data: null };
}

function bothSchoolParams(schoolname?: string, schoolcode?: string) {
  return Boolean(schoolname && schoolcode);
}

export const app = new Elysia({ name: "schoolkit" })
  .use(
    cors({
      origin: CORS_ORIGINS,
      credentials: true,
    }),
  )
  .get("/", () => ({ Hello: "World" }))
  .get("/school", async ({ query }) => {
    const schoolname = query.schoolname ?? "목운중학교";
    try {
      const neis = new Neispy({ key: NEIS_API_KEY });
      const rows = await neis.schoolInfo({ SCHUL_NM: schoolname });
      return rows;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return errorResponse(message);
    }
  })
  .get("/classes", async ({ query }) => {
    const { schoolname, schoolcode, grade } = query;

    if (!grade) {
      return errorResponse("grade is required");
    }

    if (bothSchoolParams(schoolname, schoolcode)) {
      return errorResponse("Cannot provide both schoolname and schoolcode");
    }

    try {
      const neis = new Neispy({ key: NEIS_API_KEY });
      const rows = schoolname
        ? await neis.schoolInfo({ SCHUL_NM: schoolname })
        : await neis.schoolInfo({ SD_SCHUL_CODE: schoolcode });

      const school = rows[0];
      if (!school) {
        return errorResponse("School not found");
      }

      const classRows = await neis.classInfo({
        ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
        SD_SCHUL_CODE: school.SD_SCHUL_CODE,
      });

      const classNames = [...new Set(classRows.map((row) => row.CLASS_NM))].sort(
        (a, b) => {
          const ai = Number.parseInt(a, 10);
          const bi = Number.parseInt(b, 10);
          if (Number.isNaN(ai) || Number.isNaN(bi)) return 0;
          return ai - bi;
        },
      );

      void grade;
      return classNames;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return errorResponse(message);
    }
  })
  .get("/timetable", async ({ query }) => {
    const schoolname = query.schoolname;
    const schoolcodeParam = query.schoolcode;
    const grade = Number(query.grade);
    const classno = Number(query.classno);
    const week = Math.min(1, Math.max(0, Number(query.week ?? "0")));

    if (bothSchoolParams(schoolname, schoolcodeParam)) {
      return errorResponse("Cannot provide both schoolname and schoolcode");
    }

    const schoolcode = schoolcodeParam ?? "7081492";

    try {
      let resolvedSchoolName = schoolname;

      if (!resolvedSchoolName) {
        const neis = new Neispy({ key: NEIS_API_KEY });
        const rows = await neis.schoolInfo({ SD_SCHUL_CODE: schoolcode });
        resolvedSchoolName = rows[0]?.SCHUL_NM;
        if (!resolvedSchoolName) {
          return errorResponse("School not found");
        }
      }

      const timetable = await fetchTimeTable({
        schoolName: resolvedSchoolName,
        schoolCode: schoolname ? undefined : Number(schoolcode),
        weekNum: week,
      });

      const slice = timetable.timetable[grade]?.[classno]?.slice(1) ?? [];

      return {
        day_time: timetable.dayTime,
        timetable: slice,
        update_date: JSON.stringify(timetable.updateDate),
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return errorResponse(message);
    }
  })
  .get("/lunch", async ({ query }) => {
    const { schoolname, schoolcode, startdate, enddate } = query;

    if (bothSchoolParams(schoolname, schoolcode)) {
      return errorResponse("Cannot provide both schoolname and schoolcode");
    }

    if (!startdate || !enddate) {
      return errorResponse("startdate and enddate are required");
    }

    try {
      const neis = new Neispy({ key: NEIS_API_KEY });
      const schools = schoolname
        ? await neis.schoolInfo({ SCHUL_NM: schoolname })
        : await neis.schoolInfo({ SD_SCHUL_CODE: schoolcode });

      const school = schools[0];
      if (!school) {
        return errorResponse("School not found");
      }

      const meals = await neis.mealServiceDietInfo({
        ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
        SD_SCHUL_CODE: school.SD_SCHUL_CODE,
        MLSV_FROM_YMD: startdate,
        MLSV_TO_YMD: enddate,
      });

      return meals.map((item) => ({
        ...item,
        DDISH_NM: item.DDISH_NM
          .replace(REMOVE_PAREN_PATTERN, "")
          .replaceAll(" <br/>", "\n")
          .replaceAll("<br/>", "\n"),
      }));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return errorResponse(message);
    }
  })
  .get("/schedule", async ({ query }) => {
    const { schoolname, schoolcode, startdate, enddate } = query;

    if (bothSchoolParams(schoolname, schoolcode)) {
      return errorResponse("Cannot provide both schoolname and schoolcode");
    }

    if (!startdate || !enddate) {
      return errorResponse("startdate and enddate are required");
    }

    try {
      const neis = new Neispy({ key: NEIS_API_KEY });
      const schools = schoolname
        ? await neis.schoolInfo({ SCHUL_NM: schoolname })
        : await neis.schoolInfo({ SD_SCHUL_CODE: schoolcode });

      const school = schools[0];
      if (!school) {
        return errorResponse("School not found");
      }

      return neis.schoolSchedule({
        ATPT_OFCDC_SC_CODE: school.ATPT_OFCDC_SC_CODE,
        SD_SCHUL_CODE: school.SD_SCHUL_CODE,
        AA_FROM_YMD: startdate,
        AA_TO_YMD: enddate,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return errorResponse(message);
    }
  });

export default app;
