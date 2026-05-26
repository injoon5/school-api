export class NeisException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NeisException";
  }
}

export class NeisHttpException extends NeisException {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`${code} ${message}`);
    this.name = "NeisHttpException";
    this.code = code;
  }
}

export class NeisDataNotFoundError extends NeisHttpException {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "NeisDataNotFoundError";
  }
}

const exceptionMapping: Record<string, typeof NeisHttpException> = {
  "INFO-200": NeisDataNotFoundError,
};

export function raiseForNeisResult(code: string, message: string): never {
  const ExceptionClass = exceptionMapping[code] ?? NeisHttpException;
  throw new ExceptionClass(code, message);
}
