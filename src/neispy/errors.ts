export class NeispyException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NeispyException";
  }
}

export class NeispyHttpException extends NeispyException {
  code: string;

  constructor(code: string, message: string) {
    super(`${code} ${message}`);
    this.name = "NeispyHttpException";
    this.code = code;
  }
}

export class DataNotFound extends NeispyHttpException {}

const exceptionMapping: Record<string, typeof NeispyHttpException> = {
  "INFO-200": DataNotFound,
};

export function raiseForNeisResult(code: string, message: string): never {
  const ExceptionClass = exceptionMapping[code] ?? NeispyHttpException;
  throw new ExceptionClass(code, message);
}
