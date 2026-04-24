/**
 * Typed application errors. The global error handler maps these to HTTP responses.
 * Throw `new ApiError(...)` from anywhere; never throw raw strings.
 */

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const BadRequest = (message = "Bad request", details?: unknown) =>
  new ApiError(400, "BAD_REQUEST", message, details);
export const Unauthorized = (message = "Unauthorized") =>
  new ApiError(401, "UNAUTHORIZED", message);
export const Forbidden = (message = "Forbidden") => new ApiError(403, "FORBIDDEN", message);
export const NotFound = (message = "Not found") => new ApiError(404, "NOT_FOUND", message);
export const Conflict = (message = "Conflict", details?: unknown) =>
  new ApiError(409, "CONFLICT", message, details);
export const Unprocessable = (message = "Unprocessable entity", details?: unknown) =>
  new ApiError(422, "UNPROCESSABLE", message, details);
export const TooMany = (message = "Too many requests") =>
  new ApiError(429, "TOO_MANY_REQUESTS", message);
export const NotImplemented = (message = "Not implemented") =>
  new ApiError(501, "NOT_IMPLEMENTED", message);