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
  HS_GNRL_BUSNS_SC_NM: string;
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

interface NeisListSection<T> {
  head: unknown[];
  row: T[];
}

export type NeisApiResponse<T> = Record<string, NeisListSection<T>[]>;

export interface SchoolInfoParams {
  SCHUL_NM?: string;
  SD_SCHUL_CODE?: string;
  ATPT_OFCDC_SC_CODE?: string;
}

export interface ClassInfoParams {
  ATPT_OFCDC_SC_CODE: string;
  SD_SCHUL_CODE: string;
  AY?: string;
  GRADE?: string;
}

export interface MealServiceDietInfoParams {
  ATPT_OFCDC_SC_CODE: string;
  SD_SCHUL_CODE: string;
  MLSV_FROM_YMD?: string;
  MLSV_TO_YMD?: string;
  MLSV_YMD?: string;
}

export interface SchoolScheduleParams {
  ATPT_OFCDC_SC_CODE: string;
  SD_SCHUL_CODE: string;
  AA_FROM_YMD?: string;
  AA_TO_YMD?: string;
  AA_YMD?: string;
}
