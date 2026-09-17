import type { PublicationIssue } from "./visibility";

/**
 * Errors the admin knows how to show. The API returns them as JSON with a
 * status code, and the admin's HTTP client rebuilds the matching class, so a
 * form can put a server-side message beside the field that caused it.
 *
 *   401 UnauthorisedError   {"error"}
 *   403 ForbiddenError      {"error", "capability"}
 *   404 NotFoundError       {"error"}
 *   409 ConflictError       {"error", "currentUpdatedAt"}
 *   422 ValidationError     {"error", "fields"?, "issues"?}
 */

export class AdminApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminApiError";
  }
}

export class UnauthorisedError extends AdminApiError {
  constructor(message = "Your session has ended. Sign in again to continue.") {
    super(message);
    this.name = "UnauthorisedError";
  }
}

export class ForbiddenError extends AdminApiError {
  constructor(
    message = "Your role does not allow this. Nothing was changed.",
    readonly capability?: string,
  ) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AdminApiError {
  constructor(message = "This record could not be found. It may have been deleted.") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Someone else saved this record after it was opened. */
export class ConflictError extends AdminApiError {
  constructor(
    message = "Someone else saved this record after you opened it. Reload to see their changes.",
    readonly currentUpdatedAt?: string,
  ) {
    super(message);
    this.name = "ConflictError";
  }
}

export class ValidationError extends AdminApiError {
  constructor(
    /** Field path → message, e.g. `{ "slug": "Another car already uses this web address." }`. */
    readonly fields: Record<string, string> = {},
    message = "Some details need attention. Nothing was changed.",
    /** Publishing blockers, when a publish was refused. */
    readonly issues: PublicationIssue[] = [],
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/** A thrown value, described in a sentence fit for a toast. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Nothing was changed."): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
