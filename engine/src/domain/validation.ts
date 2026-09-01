export class InvalidStickFigureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStickFigureError';
  }
}

export function requireRecord(
  value: unknown,
  message: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InvalidStickFigureError(message);
  }
  return value as Record<string, unknown>;
}

export function requireArray(
  value: unknown,
  property: string,
): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new InvalidStickFigureError(`Figure ${property} must be an array.`);
  }
  return value;
}

export function requireNonEmptyString(
  value: unknown,
  property: string,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidStickFigureError(
      `${property} must be a non-empty string.`,
    );
  }
  return value.trim();
}

export function requireFiniteNumber(value: unknown, property: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new InvalidStickFigureError(`${property} must be a finite number.`);
  }
  return value;
}

export function optionalPositiveNumber(
  value: unknown,
  fallback: number,
  property: string,
): number {
  if (value === undefined) {
    return fallback;
  }
  const number = requireFiniteNumber(value, property);
  if (number <= 0) {
    throw new InvalidStickFigureError(`${property} must be greater than zero.`);
  }
  return number;
}

export function optionalBoolean(
  value: unknown,
  property: string,
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw new InvalidStickFigureError(`${property} must be true or false.`);
  }
  return value;
}

export function optionalString(
  value: unknown,
  fallback: string,
  property: string,
): string {
  return value === undefined
    ? fallback
    : requireNonEmptyString(value, property);
}
