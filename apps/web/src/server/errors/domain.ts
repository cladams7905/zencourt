export type DomainErrorKind =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "dependency"
  | "internal";

export class DomainError extends Error {
  readonly kind: DomainErrorKind;
  readonly details?: Record<string, unknown>;

  constructor(
    kind: DomainErrorKind,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "DomainError";
    this.kind = kind;
    this.details = details;
  }
}

export class DomainValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("validation", message, details);
    this.name = "DomainValidationError";
  }
}

export class DomainDependencyError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("dependency", message, details);
    this.name = "DomainDependencyError";
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
