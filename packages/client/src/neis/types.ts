export interface SchoolRelatedRow {
  ATPT_OFCDC_SC_CODE: string;
  ATPT_OFCDC_SC_NM: string;
  LOAD_DTM: string;
  SD_SCHUL_CODE: string;
  SCHUL_NM: string;
  [key: string]: string | number | null | undefined;
}

export interface SchoolInfoRow extends SchoolRelatedRow {
  ENG_SCHUL_NM: string;
  SCHUL_KND_SC_NM: string;
  LCTN_SC_NM: string;
  JU_ORG_NM: string;
  FOND_SC_NM: string;
  ORG_RDNZC: string;
  ORG_RDNMA: string;
  ORG_RDNDA: string;
  ORG_TELNO: string;
  HMPG_ADRES: string;
  COEDU_SC_NM: string;
  ORG_FAXNO: string;
  HS_SC_NM: string | null;
  INDST_SPECL_CCCCL_EXST_YN: string;
  HS_GNRL_BUSNS_SC_NM?: string | null;
  SPCLY_PURPS_HS_ORD_NM: string | null;
  ENE_BFE_SEHF_SC_NM: string;
  DGHT_SC_NM: string;
  FOND_YMD: string;
  FOAS_MEMRD: string;
}

export interface ClassInfoRow extends SchoolRelatedRow {
  AY: string;
  GRADE: string;
  DGHT_CRSE_SC_NM: string;
  SCHUL_CRSE_SC_NM: string;
  ORD_SC_NM: string;
  DDDEP_NM: string;
  CLASS_NM: string;
}

export interface MealServiceDietInfoRow extends SchoolRelatedRow {
  MMEAL_SC_CODE: string;
  MMEAL_SC_NM: string;
  MLSV_YMD: string;
  MLSV_FGR: number;
  DDISH_NM: string;
  ORPLC_INFO: string;
  CAL_INFO: string;
  NTR_INFO: string;
  MLSV_FROM_YMD: string;
  MLSV_TO_YMD: string;
}

export interface SchoolScheduleRow extends SchoolRelatedRow {
  AY: string;
  DGHT_CRSE_SC_NM: string;
  SCHUL_CRSE_SC_NM: string;
  SBTR_DD_SC_NM: string;
  AA_YMD: string;
  EVENT_NM: string;
  EVENT_CNTNT: string;
  ONE_GRADE_EVENT_YN: string;
  TW_GRADE_EVENT_YN: string;
  THREE_GRADE_EVENT_YN: string;
  FR_GRADE_EVENT_YN: string;
  FIV_GRADE_EVENT_YN: string;
  SIX_GRADE_EVENT_YN: string;
}

/** Shared fields on els/mis/his/sps timetable rows. */
export interface TimetableRow extends SchoolRelatedRow {
  AY: string;
  SEM: string;
  ALL_TI_YMD: string;
  GRADE: string;
  CLASS_NM: string;
  PERIO: string;
  ITRT_CNTNT: string;
  DGHT_CRSE_SC_NM?: string;
  SCHUL_CRSE_SC_NM?: string;
  ORD_SC_NM?: string;
  DDDEP_NM?: string;
  CLRM_NM?: string;
}

export type ElsTimetableRow = TimetableRow;
export type MisTimetableRow = TimetableRow;
export type HisTimetableRow = TimetableRow;
export type SpsTimetableRow = TimetableRow;

export interface SchoolMajorInfoRow extends SchoolRelatedRow {
  DGHT_CRSE_SC_NM: string;
  ORD_SC_NM: string;
  DDDEP_NM: string;
}

export interface SchulAflcoInfoRow extends SchoolRelatedRow {
  DGHT_CRSE_SC_NM: string;
  ORD_SC_NM: string;
}

export interface TiClrmInfoRow extends SchoolRelatedRow {
  AY: string;
  GRADE: string;
  SEM: string;
  SCHUL_CRSE_SC_NM: string;
  DGHT_CRSE_SC_NM: string;
  ORD_SC_NM: string;
  DDDEP_NM: string;
  CLRM_NM: string;
}

export interface AcaInsTiInfoRow {
  ATPT_OFCDC_SC_CODE: string;
  ATPT_OFCDC_SC_NM: string;
  LOAD_DTM: string;
  ADMST_ZONE_NM: string;
  ACA_INSTI_SC_NM: string;
  ACA_ASNUM: string;
  ACA_NM: string;
  ESTBL_YMD: string;
  REG_YMD: string;
  REG_STTUS_NM: string;
  CAA_BEGIN_YMD: string;
  CAA_END_YMD: string;
  TOFOR_SMTOT: string;
  DTM_RCPTN_ABLTY_NMPR_SMTOT: string;
  REALM_SC_NM: string;
  LE_ORD_NM: string;
  LE_CRSE_LIST_NM: string;
  LE_CRSE_NM: string;
  PSNBY_THCC_CNTNT: string;
  THCC_OTHBC_YN: string;
  BRHS_ACA_YN: string;
  FA_RDNZC: string;
  FA_RDNMA: string;
  FA_RDNDA: string;
  [key: string]: string | number | null | undefined;
}

interface NeisListSection<T> {
  head: unknown[];
  row: T[];
}

export type NeisApiResponse<T> = Record<string, NeisListSection<T>[]>;

export interface SchoolInfoParams {
  SCHUL_NM?: string;
  SD_SCHUL_CODE?: string;
  ATPT_OFCDC_SC_CODE?: string;
  SCHUL_KND_SC_NM?: string;
  LCTN_SC_NM?: string;
  FOND_SC_NM?: string;
}

export interface ClassInfoParams {
  ATPT_OFCDC_SC_CODE: string;
  SD_SCHUL_CODE: string;
  AY?: string;
  GRADE?: string;
  SCHUL_CRSE_SC_NM?: string;
  DDDEP_NM?: string;
  DGHT_CRSE_SC_NM?: string;
  ORD_SC_NM?: string;
}

export interface MealServiceDietInfoParams {
  ATPT_OFCDC_SC_CODE: string;
  SD_SCHUL_CODE: string;
  MLSV_FROM_YMD?: string;
  MLSV_TO_YMD?: string;
  MLSV_YMD?: string;
  MMEAL_SC_CODE?: string;
}

export interface SchoolScheduleParams {
  ATPT_OFCDC_SC_CODE: string;
  SD_SCHUL_CODE: string;
  AA_FROM_YMD?: string;
  AA_TO_YMD?: string;
  AA_YMD?: string;
}

export interface TimetableParams {
  ATPT_OFCDC_SC_CODE: string;
  SD_SCHUL_CODE: string;
  AY?: string;
  SEM?: string;
  ALL_TI_YMD?: string | number;
  TI_FROM_YMD?: string | number;
  TI_TO_YMD?: string | number;
  GRADE?: string;
  CLASS_NM?: string;
  PERIO?: string | number;
  CLRM_NM?: string;
  DGHT_CRSE_SC_NM?: string;
  ORD_SC_NM?: string;
  DDDEP_NM?: string;
}

export interface SchoolMajorInfoParams {
  ATPT_OFCDC_SC_CODE: string;
  SD_SCHUL_CODE: string;
  DGHT_CRSE_SC_NM?: string;
  ORD_SC_NM?: string;
}

export type SchulAflcoInfoParams = SchoolMajorInfoParams;

export interface TiClrmInfoParams {
  ATPT_OFCDC_SC_CODE: string;
  SD_SCHUL_CODE: string;
  AY?: string;
  GRADE?: string;
  SEM?: string;
  DGHT_CRSE_SC_NM?: string;
  ORD_SC_NM?: string;
  DDDEP_NM?: string;
  SCHUL_CRSE_SC_NM?: string;
}

export interface AcaInsTiInfoParams {
  ATPT_OFCDC_SC_CODE: string;
  ADMST_ZONE_NM?: string;
  ACA_ASNUM?: string;
  REALM_SC_NM?: string;
  LE_ORD_NM?: string;
  LE_CRSE_NM?: string;
}
