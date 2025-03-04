from typing import Union
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import json
import timetable_api
from neispy import Neispy
from neispy.domain.abc import Row
from neispy.types.mealservicedietinfo import MealServiceDietInfoRowDict
from aiohttp import ClientSession
import re

description = """
SchoolKit provides an awesome API for interacting with the Neis API. 

## You can get...

 - Timetable
 - Lunch Menus
 - School schedule

"""

app = FastAPI(
    title="SchoolKit",
    description=description,
    summary="A simple API for interacting with the Neis API",
    version="0.0.1",
)

# Enable CORS for the specified domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://timetable.injoon5.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

neis = Neispy.sync(KEY="64db83c20c8a4f66b54ac8637b1d044f")

remove_pattern = r'\([^)]*\)'

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/timetable")
def read_timetable(
        grade: int,
        classno: int, week: int = Query(0, ge=0, le=1),
        schoolname: str = "목운중학교",
):
    timetable = timetable_api.TimeTable(schoolname, week_num=week)
    return {
        "day_time": timetable.day_time,
        "timetable": json.loads(json.dumps(timetable.timetable[grade][classno][1:], default=lambda o: o.__dict__, sort_keys=False, ensure_ascii=False)),
        "update_date": json.dumps(timetable.update_date)
    }

@app.get("/lunch")
async def read_lunch(startdate: int, enddate: int, schoolname: str = "목운중학교"):
    async with ClientSession() as session:
        neis = Neispy(KEY="64db83c20c8a4f66b54ac8637b1d044f", session=session)
        scinfo = await neis.schoolInfo(SCHUL_NM=schoolname)
        row = scinfo.schoolInfo[1].row[0]
        AE, SE = row.ATPT_OFCDC_SC_CODE, row.SD_SCHUL_CODE
        scmeal = await neis.mealServiceDietInfo(ATPT_OFCDC_SC_CODE=AE, SD_SCHUL_CODE=SE, MLSV_FROM_YMD=f"{startdate}", MLSV_TO_YMD=f"{enddate}")
        row = scmeal.mealServiceDietInfo[1]
        for item in row.row:
            item.DDISH_NM = re.sub(pattern=remove_pattern, repl='', string=item.DDISH_NM).replace(" <br/>", "\n")
        return json.loads(json.dumps(row.row, default=lambda o: o.__dict__, sort_keys=False, ensure_ascii=False))

@app.get("/schedule")
async def read_schedule(startdate: int, enddate: int, schoolname: str = "목운중학교"):
    async with ClientSession() as session:
        neis = Neispy(KEY="64db83c20c8a4f66b54ac8637b1d044f", session=session)
        scinfo = await neis.schoolInfo(SCHUL_NM=schoolname)
        row = scinfo.schoolInfo[1].row[0]
        AE, SE = row.ATPT_OFCDC_SC_CODE, row.SD_SCHUL_CODE
        scschedule = await neis.SchoolSchedule(ATPT_OFCDC_SC_CODE=AE, SD_SCHUL_CODE=SE, AA_FROM_YMD=f"{startdate}", AA_TO_YMD=f"{enddate}")
        return scschedule.SchoolSchedule[1].row
