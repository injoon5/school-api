import {
  NeisDataNotFoundError,
  NeisException,
  NeisHttpException,
  TimetableAmbiguousSchoolError,
  TimetableInvalidWeekError,
  TimetableParseError,
  TimetableSchoolNotFoundError,
} from "@timeforschool/client";

export const ErrorCode = {
  VALIDATION: "VALIDATION_ERROR",
  CONFLICTING_SCHOOL_PARAMS: "CONFLICTING_SCHOOL_PARAMS",
  MISSING_SCHOOL_IDENTIFIER: "MISSING_SCHOOL_IDENTIFIER",
  SCHOOL_NOT_FOUND: "SCHOOL_NOT_FOUND",
  SCHOOL_AMBIGUOUS: "SCHOOL_AMBIGUOUS",
  NEIS_DATA_NOT_FOUND: "NEIS_DATA_NOT_FOUND",
  NEIS_UPSTREAM: "NEIS_UPSTREAM_ERROR",
  TIMETABLE_SCHOOL_NOT_FOUND: "TIMETABLE_SCHOOL_NOT_FOUND",
  TIMETABLE_AMBIGUOUS_SCHOOL: "TIMETABLE_AMBIGUOUS_SCHOOL",
  TIMETABLE_INVALID_GRADE_CLASS: "TIMETABLE_INVALID_GRADE_CLASS",
  TIMETABLE_UPSTREAM: "TIMETABLE_UPSTREAM_ERROR",
  INTERNAL: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiErrorBody {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    status: number,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  toJSON(): ApiErrorBody {
    return {
      ok: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
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

  static schoolAmbiguous(
    identifier: string,
    details: Record<string, unknown>,
  ): ApiError {
    return new ApiError(
      ErrorCode.SCHOOL_AMBIGUOUS,
      409,
      "Multiple schools matched. Pass schoolcode to disambiguate.",
      { identifier, ...details },
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
        "No school matched this name. Check the name or use schoolcode.",
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

    if (error instanceof NeisException) {
      return new ApiError(ErrorCode.NEIS_UPSTREAM, 502, "NEIS API request failed.", {
        upstream: error.message,
      });
    }

    // Unknown/unmapped errors may carry internal details (paths, dependency
    // internals). Log the real error server-side; return a generic message.
    console.error("Unhandled error:", error);

    return new ApiError(
      ErrorCode.INTERNAL,
      500,
      "An unexpected error occurred.",
    );
  }
}
