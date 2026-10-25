export function readRevision(value: unknown, fallback = 0): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fallback;
}

export function nextRevision(value: unknown, fallback = 0): number {
  return readRevision(value, fallback) + 1;
}

export function isTerminalWheelStatus(value: unknown): boolean {
  return value === 'completed' || value === 'cancelled';
}

export function revisionMatches(current: unknown, expected: unknown): boolean {
  return Number.isInteger(expected) && readRevision(current) === expected;
}

interface PersistedSpinResult {
  status: 'drawn';
  payerUserId: string;
  payerDisplayNameSnapshot: string;
  fairnessSnapshot?: Record<string, unknown>;
  revision?: unknown;
  drawnAt?: { toDate(): Date };
}

export function hasPersistedSpinResult(value: unknown): value is PersistedSpinResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return candidate.status === 'drawn'
    && typeof candidate.payerUserId === 'string'
    && typeof candidate.payerDisplayNameSnapshot === 'string';
}
