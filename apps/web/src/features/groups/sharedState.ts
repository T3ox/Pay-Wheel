export function shouldApplyRevision(current: number | null | undefined, incoming: number): boolean {
  return incoming >= (current ?? 0);
}
