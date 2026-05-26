export class TimetableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimetableError";
  }
}

export class TimetableSchoolNotFoundError extends TimetableError {
  readonly schoolName: string;

  constructor(schoolName: string) {
    super(`No Comcigan school found for "${schoolName}".`);
    this.name = "TimetableSchoolNotFoundError";
    this.schoolName = schoolName;
  }
}

export class TimetableAmbiguousSchoolError extends TimetableError {
  readonly schoolName: string;

  constructor(schoolName: string) {
    super(
      `Multiple Comcigan schools matched "${schoolName}". Pass schoolCode to disambiguate.`,
    );
    this.name = "TimetableAmbiguousSchoolError";
    this.schoolName = schoolName;
  }
}

export class TimetableParseError extends TimetableError {
  constructor(message: string) {
    super(message);
    this.name = "TimetableParseError";
  }
}

export class TimetableInvalidWeekError extends TimetableError {
  constructor(weekNum: number) {
    super(`weekNum must be 0 or 1, received ${weekNum}.`);
    this.name = "TimetableInvalidWeekError";
  }
}
