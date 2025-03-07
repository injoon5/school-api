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
import uvicorn

description = """
SchoolKit provides an awesome API for interacting with the Neis API. 

## You can get...

 - Timetable
 - Lunch Menus
 - School schedule

 7081492
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

@app.get("/school")
async def read_school(schoolname: str = "목운중학교"):
    try:
        async with ClientSession() as session:
            neis = Neispy(KEY="64db83c20c8a4f66b54ac8637b1d044f", session=session)
            scinfo = await neis.schoolInfo(SCHUL_NM=schoolname)
            return scinfo.schoolInfo[1].row
    except Exception as e:
        return {
            "error": True,
            "message": str(e),
            "data": None
        }

@app.get("/classes") 
async def read_classes(grade, schoolname: str | None = None, schoolcode: str | None = None):
    if schoolname and schoolcode:
        return {
            "error": True,
            "message": "Cannot provide both schoolname and schoolcode",
            "data": None
        }
    
    try:
        async with ClientSession() as session:
            neis = Neispy(KEY="64db83c20c8a4f66b54ac8637b1d044f", session=session)
            
            if schoolname:
                scinfo = await neis.schoolInfo(SCHUL_NM=schoolname)
                row = scinfo.schoolInfo[1].row[0]
                AE, SE = row.ATPT_OFCDC_SC_CODE, row.SD_SCHUL_CODE
            else:
                # When using schoolcode, we still need ATPT_OFCDC_SC_CODE
                # Get it from schoolInfo using the code
                scinfo = await neis.schoolInfo(SD_SCHUL_CODE=schoolcode)
                row = scinfo.schoolInfo[1].row[0]
                AE, SE = row.ATPT_OFCDC_SC_CODE, schoolcode
                
            scclass = await neis.classInfo(
                ATPT_OFCDC_SC_CODE=AE, SD_SCHUL_CODE=SE
            )
            print(scclass.classInfo)
            class_info = sorted(list(set([i.CLASS_NM for i in scclass.classInfo[1].row])), key=lambda x: int(x) if x.isdigit() else 0)
            return class_info
    except Exception as e:
        return {
            "error": True,
            "message": str(e),
            "data": None
        }

@app.get("/timetable")
async def read_timetable(
        grade: int,
        classno: int, 
        week: int = Query(0, ge=0, le=1),
        schoolname: str | None = None,
        schoolcode: str = "7081492"
):
    if schoolname and schoolcode:
        return {
            "error": True,
            "message": "Cannot provide both schoolname and schoolcode",
            "data": None
        }

    try:
        if schoolname:
            timetable = timetable_api.TimeTable(school_name=schoolname, week_num=week)
        else:
            # Get school name from NEIS API using school code
            async with ClientSession() as session:
                neis = Neispy(KEY="64db83c20c8a4f66b54ac8637b1d044f", session=session)
                scinfo = await neis.schoolInfo(SD_SCHUL_CODE=schoolcode)
                school_name = scinfo.schoolInfo[1].row[0].SCHUL_NM
            timetable = timetable_api.TimeTable(school_name=school_name, school_code=int(schoolcode), week_num=week)
            
        return {
            "day_time": timetable.day_time,
            "timetable": json.loads(json.dumps(timetable.timetable[grade][classno][1:], default=lambda o: o.__dict__, sort_keys=False, ensure_ascii=False)),
            "update_date": json.dumps(timetable.update_date)
        }
    except Exception as e:
        return {
            "error": True,
            "message": str(e),
            "data": None
        }
    

@app.get("/lunch")
async def read_lunch(startdate: int, enddate: int, schoolname: str | None = None, schoolcode: str | None = None):
    if schoolname and schoolcode:
        return {
            "error": True,
            "message": "Cannot provide both schoolname and schoolcode",
            "data": None
        }
    try:
        async with ClientSession() as session:
            neis = Neispy(KEY="64db83c20c8a4f66b54ac8637b1d044f", session=session)
            
            if schoolname:
                scinfo = await neis.schoolInfo(SCHUL_NM=schoolname)
            else:
                scinfo = await neis.schoolInfo(SD_SCHUL_CODE=schoolcode)
                
            row = scinfo.schoolInfo[1].row[0]
            AE, SE = row.ATPT_OFCDC_SC_CODE, row.SD_SCHUL_CODE
            scmeal = await neis.mealServiceDietInfo(ATPT_OFCDC_SC_CODE=AE, SD_SCHUL_CODE=SE, MLSV_FROM_YMD=f"{startdate}", MLSV_TO_YMD=f"{enddate}")
            row = scmeal.mealServiceDietInfo[1]
            for item in row.row:
                item.DDISH_NM = re.sub(pattern=remove_pattern, repl='', string=item.DDISH_NM).replace(" <br/>", "\n")
            return json.loads(json.dumps(row.row, default=lambda o: o.__dict__, sort_keys=False, ensure_ascii=False))
    except Exception as e:
        return {
            "error": True,
            "message": str(e),
            "data": None
        }

@app.get("/schedule")
async def read_schedule(startdate: int, enddate: int, schoolname: str | None = None, schoolcode: str | None = None):
    if schoolname and schoolcode:
        return {
            "error": True,
            "message": "Cannot provide both schoolname and schoolcode",
            "data": None
        }
    try:
        async with ClientSession() as session:
            neis = Neispy(KEY="64db83c20c8a4f66b54ac8637b1d044f", session=session)
            
            if schoolname:
                scinfo = await neis.schoolInfo(SCHUL_NM=schoolname)
            else:
                scinfo = await neis.schoolInfo(SD_SCHUL_CODE=schoolcode)
                
            row = scinfo.schoolInfo[1].row[0]
            AE, SE = row.ATPT_OFCDC_SC_CODE, row.SD_SCHUL_CODE
            scschedule = await neis.SchoolSchedule(ATPT_OFCDC_SC_CODE=AE, SD_SCHUL_CODE=SE, AA_FROM_YMD=f"{startdate}", AA_TO_YMD=f"{enddate}")
            return scschedule.SchoolSchedule[1].row
    except Exception as e:
        return {
            "error": True,
            "message": str(e),
            "data": None
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
