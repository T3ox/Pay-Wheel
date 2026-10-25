import type { FairnessEntry, FairnessInput, FairnessPreview } from './schema.js';

const BASE_WEIGHT = 1_000_000;
const PROBABILITY_SCALE = 1_000_000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function calculateWeeklyAverage(spentCents: number[]): number {
  if (spentCents.length === 0) return 0;
  return Math.round(spentCents.reduce((sum, value) => sum + value, 0) / spentCents.length);
}

export function buildFairnessPreview(
  inputs: FairnessInput[],
  weekId: string,
  averageCents = calculateWeeklyAverage(inputs.map((entry) => entry.spentCents))
): FairnessPreview {
  if (inputs.length < 1) throw new RangeError('At least one participant is required');
  const ordered = [...inputs].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt) || a.userId.localeCompare(b.userId));
  const initiallyEligible = ordered.filter((entry) => entry.lastPaidWeekId !== weekId);
  let overrideIds = new Set<string>();
  let cooldownOverrideApplied = false;

  if (initiallyEligible.length === 0) {
    cooldownOverrideApplied = true;
    const oldest = Math.min(...ordered.map((entry) => entry.lastPaidAt ? Date.parse(entry.lastPaidAt) : 0));
    overrideIds = new Set(ordered.filter((entry) => (entry.lastPaidAt ? Date.parse(entry.lastPaidAt) : 0) === oldest).map((entry) => entry.userId));
  }

  const weighted = ordered.map((entry) => {
    const protectedUntilWeekEnd = entry.lastPaidWeekId === weekId;
    const canPay = !protectedUntilWeekEnd || overrideIds.has(entry.userId);
    const relativeGap = averageCents === 0 ? 0 : clamp((averageCents - entry.spentCents) / averageCents, -1, 1);
    const weightMicros = canPay ? Math.round(BASE_WEIGHT * clamp(1 + relativeGap, 0.5, 2)) : 0;
    return {
      ...entry,
      protectedUntilWeekEnd,
      eligibility: (overrideIds.has(entry.userId) ? 'override' : canPay ? 'eligible' : 'protected') as FairnessEntry['eligibility'],
      weightMicros,
      probabilityMicros: 0
    };
  });

  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weightMicros, 0);
  let assigned = 0;
  const positiveIndexes = weighted.map((entry, index) => entry.weightMicros > 0 ? index : -1).filter((index) => index >= 0);
  const lastPositive = positiveIndexes.at(-1);
  const entries = weighted.map((entry, index) => {
    const probabilityMicros = index === lastPositive
      ? PROBABILITY_SCALE - assigned
      : Math.floor((entry.weightMicros / totalWeight) * PROBABILITY_SCALE);
    if (index !== lastPositive) assigned += probabilityMicros;
    return { ...entry, probabilityMicros };
  });

  return { algorithmVersion: 'fairness-v1', weekId, weeklyAverageCents: averageCents, cooldownOverrideApplied, entries };
}

export function selectWeightedUser(entries: FairnessEntry[], randomValue: number): string {
  const total = entries.reduce((sum, entry) => sum + entry.weightMicros, 0);
  if (!Number.isInteger(randomValue) || randomValue < 0 || randomValue >= total) throw new RangeError('randomValue outside weight range');
  let cursor = 0;
  for (const entry of entries) {
    cursor += entry.weightMicros;
    if (randomValue < cursor) return entry.userId;
  }
  throw new Error('No weighted user selected');
}

