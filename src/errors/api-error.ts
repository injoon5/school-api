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

    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    if (message.includes("학교를 찾을 수 없습니다")) {
      return new ApiError(
        ErrorCode.TIMETABLE_SCHOOL_NOT_FOUND,
        404,
        "Comcigan could not find this school. Check the name or use schoolcode.",
      );
    }

    if (message.includes("학교가 2개 이상")) {
      return new ApiError(
        ErrorCode.TIMETABLE_AMBIGUOUS_SCHOOL,
        409,
        "Multiple schools matched. Pass schoolcode to disambiguate.",
      );
    }

    if (message.includes("INFO-200") || message.includes("데이터가 없습니다")) {
      return ApiError.neisDataNotFound({ upstream: message });
    }

    if (message.startsWith("INFO-") || message.startsWith("ERROR-")) {
      return new ApiError(ErrorCode.NEIS_UPSTREAM, 502, "NEIS API request failed.", {
        upstream: message,
      });
    }

    if (
      message.includes("Failed to parse comcigan") ||
      message.includes("Comcigan")
    ) {
      return new ApiError(
        ErrorCode.TIMETABLE_UPSTREAM,
        502,
        "Could not load timetable from Comcigan.",
        { upstream: message },
      );
    }

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

/** Legacy production shape: `{ error: true, message, data: null }` */
export function isLegacyErrorBody(
  body: unknown,
): body is { error: true; message: string; data: null } {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { error?: boolean }).error === true &&
    !("ok" in (body as object))
  );
}
