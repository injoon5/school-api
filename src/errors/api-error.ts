import {
  NeisDataNotFoundError,
  NeisHttpException,
  TimetableAmbiguousSchoolError,
  TimetableInvalidWeekError,
  TimetableParseError,
  TimetableSchoolNotFoundError,
} from "@timeforschool/client";
import type { Static } from "elysia";
import { ApiErrorSchema } from "../schemas/common.js";

export const ErrorCode = {
  VALIDATION: "VALIDATION_ERROR",
  CONFLICTING_SCHOOL_PARAMS: "CONFLICTING_SCHOOL_PARAMS",
  MISSING_SCHOOL_IDENTIFIER: "MISSING_SCHOOL_IDENTIFIER",
  SCHOOL_NOT_FOUND: "SCHOOL_NOT_FOUND",
  NEIS_DATA_NOT_FOUND: "NEIS_DATA_NOT_FOUND",
  NEIS_UPSTREAM: "NEIS_UPSTREAM_ERROR",
  TIMETABLE_SCHOOL_NOT_FOUND: "TIMETABLE_SCHOOL_NOT_FOUND",
  TIMETABLE_AMBIGUOUS_SCHOOL: "TIMETABLE_AMBIGUOUS_SCHOOL",
  TIMETABLE_INVALID_GRADE_CLASS: "TIMETABLE_INVALID_GRADE_CLASS",
  TIMETABLE_UPSTREAM: "TIMETABLE_UPSTREAM_ERROR",
  INTERNAL: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export type ApiErrorBody = Static<typeof ApiErrorSchema>;

export class ApiError extends Error {
  readonly code: ErrorCode;
  /** HTTP status; named httpStatus so Elysia does not treat this as a built-in status error. */
  readonly httpStatus: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    httpStatus: number,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }

  toJSON(): ApiErrorBody {
    const body: ApiErrorBody = {
      ok: false,
      error: {
        code: this.code,
        message: this.message,
      },
    };
    if (this.details) {
      body.error.details = this.details as NonNullable<
        ApiErrorBody["error"]["details"]
      >;
    }
    return body;
  }

  static conflictingSchoolParams(): ApiError {
    return new ApiError(
      ErrorCode.CONFLICTING_SCHOOL_PARAMS,
      400,
      "Provide either schoolname or schoolcode, not both.",
      {
        hint: "Use schoolname for display search, or schoolcode (NEIS SD_SCHUL_CODE) alone.",
      },
    );
  }

  static missingSchoolIdentifier(): ApiError {
    return new ApiError(
      ErrorCode.MISSING_SCHOOL_IDENTIFIER,
      400,
      "A school identifier is required.",
      { requiredOneOf: ["schoolname", "schoolcode"] },
    );
  }

  static schoolNotFound(identifier: Record<string, string>): ApiError {
    return new ApiError(
      ErrorCode.SCHOOL_NOT_FOUND,
      404,
      "No school matched the given identifier.",
      identifier,
    );
  }

  static neisDataNotFound(context: Record<string, string>): ApiError {
    return new ApiError(
      ErrorCode.NEIS_DATA_NOT_FOUND,
      404,
      "NEIS has no data for this school and date range.",
      context,
    );
  }

  static validation(
    message: string,
    details?: Record<string, unknown>,
  ): ApiError {
    return new ApiError(ErrorCode.VALIDATION, 400, message, details);
  }

  static fromUnknown(error: unknown): ApiError {
    if (error instanceof ApiError) return error;

    if (error instanceof TimetableSchoolNotFoundError) {
      return new ApiError(
        ErrorCode.TIMETABLE_SCHOOL_NOT_FOUND,
        404,
        "Comcigan could not find this school. Check the name or use schoolcode.",
        { schoolname: error.schoolName },
      );
    }

    if (error instanceof TimetableAmbiguousSchoolError) {
      return new ApiError(
        ErrorCode.TIMETABLE_AMBIGUOUS_SCHOOL,
        409,
        "Multiple schools matched. Pass schoolcode to disambiguate.",
        { schoolname: error.schoolName },
      );
    }

    if (error instanceof TimetableInvalidWeekError) {
      return ApiError.validation(error.message);
    }

    if (error instanceof TimetableParseError) {
      return new ApiError(
        ErrorCode.TIMETABLE_UPSTREAM,
        502,
        "Could not load timetable from Comcigan.",
        { upstream: error.message },
      );
    }

    if (error instanceof NeisDataNotFoundError) {
      return ApiError.neisDataNotFound({ upstream: error.message });
    }

    if (error instanceof NeisHttpException) {
      return new ApiError(ErrorCode.NEIS_UPSTREAM, 502, "NEIS API request failed.", {
        upstream: error.message,
        code: error.code,
      });
    }

    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    return new ApiError(ErrorCode.INTERNAL, 500, message);
  }
}

export function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as ApiErrorBody).ok === false &&
    typeof (body as ApiErrorBody).error?.code === "string"
  );
}
