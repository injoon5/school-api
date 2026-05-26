import { ApiError, ErrorCode } from "../errors/api-error.js";
import {
  assertSingleSchoolParam,
  requireSchoolParam,
} from "../shared/school.js";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectApiError(fn: () => void, code: ErrorCode): void {
  try {
    fn();
    throw new Error(`expected ApiError ${code}`);
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    assert(error.code === code, `expected ${code}, got ${error.code}`);
  }
}

expectApiError(
  () =>
    assertSingleSchoolParam({
      schoolname: "양정고등학교",
      schoolcode: "7010208",
    }),
  ErrorCode.CONFLICTING_SCHOOL_PARAMS,
);

assertSingleSchoolParam({});

expectApiError(() => requireSchoolParam({}), ErrorCode.MISSING_SCHOOL_IDENTIFIER);

assertSingleSchoolParam({ schoolname: "양정고등학교" });
assertSingleSchoolParam({ schoolcode: "7010208" });
requireSchoolParam({ schoolname: "양정고등학교" });

console.log("✓ school validation unit checks passed");
