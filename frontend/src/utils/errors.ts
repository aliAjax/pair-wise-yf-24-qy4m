import { ERROR_CODES } from "../constants/errorCodes";
import type { ErrorCode } from "../constants/errorCodes";
import { renderErrorMessage } from "../constants/errorMessages";

/** 业务异常：service 层抛出，store/controller 层捕获后分别包装 */
export class PolicyDiffError extends Error {
  code: ErrorCode;
  params: Record<string, string | number>;

  constructor(
    code: keyof typeof ERROR_CODES,
    params: Record<string, string | number> = {},
    cause?: unknown
  ) {
    super(renderErrorMessage(code, params));
    this.name = "PolicyDiffError";
    this.code = ERROR_CODES[code];
    this.params = params;
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

/** service 层包装：未知异常统一转为 STORAGE/PARSE 类业务异常 */
export function wrapServiceError(code: keyof typeof ERROR_CODES, cause: unknown, params = {}): PolicyDiffError {
  return new PolicyDiffError(code, params, cause);
}
