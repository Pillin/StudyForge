/** A typed error mapped to an HTTP status + machine code. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (msg = "Not found") => new HttpError(404, "NOT_FOUND", msg);
export const conflict = (code: string, msg: string) => new HttpError(409, code, msg);
export const unprocessable = (msg: string, details?: unknown) =>
  new HttpError(422, "VALIDATION_FAILED", msg, details);
export const unauthorized = (msg = "Unauthenticated") => new HttpError(401, "UNAUTHENTICATED", msg);
