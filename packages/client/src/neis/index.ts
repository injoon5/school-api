export {
  NeisClient,
  isLegacyTimetable,
  timetableKindFromSchool,
  type NeisClientOptions,
  type SchoolTimetableKind,
} from "./client.js";
export {
  NeisDataNotFoundError,
  NeisException,
  NeisHttpException,
} from "./errors.js";
export { pickSchoolRow } from "./pick-school.js";
export type {
  PickSchoolResult,
  SchoolQuery as PickSchoolQuery,
} from "./pick-school.js";
export type {
  AcaInsTiInfoParams,
  AcaInsTiInfoRow,
  ClassInfoParams,
  ClassInfoRow,
  ElsTimetableRow,
  HisTimetableRow,
  MealServiceDietInfoParams,
  MealServiceDietInfoRow,
  MisTimetableRow,
  SchoolInfoParams,
  SchoolInfoRow,
  SchoolMajorInfoParams,
  SchoolMajorInfoRow,
  SchoolScheduleParams,
  SchoolScheduleRow,
  SchulAflcoInfoParams,
  SchulAflcoInfoRow,
  SpsTimetableRow,
  TiClrmInfoParams,
  TiClrmInfoRow,
  TimetableParams,
  TimetableRow,
} from "./types.js";
