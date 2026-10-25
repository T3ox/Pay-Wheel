import { describe, expect, it } from 'vitest';
import type { DocumentReference, Transaction } from 'firebase-admin/firestore';
import { analyticsFromDocument, applyPaymentToAdminAnalytics } from '../src/repositories/admin-analytics';

function fakeTransaction() {
  const documents = new Map<string, Record<string, unknown>>();
  const transaction = {
    async get(reference: DocumentReference) {
      const data = documents.get(reference.path);
      return { exists: Boolean(data), data: () => data };
    },
    set(reference: DocumentReference, value: Record<string, unknown>, options?: { merge?: boolean }) {
      documents.set(reference.path, options?.merge ? { ...documents.get(reference.path), ...value } : value);
      return transaction;
    },
    update(reference: DocumentReference, value: Record<string, unknown>) {
      documents.set(reference.path, { ...documents.get(reference.path), ...value });
      return transaction;
    }
  };
  return { transaction: transaction as unknown as Transaction, documents };
}

const input = {
  groupId: 'company',
  weekId: '2026-10-19',
  outingId: 'outing-1',
  payerUserId: 'anna',
  payerDisplayName: 'Anna',
  amountCents: 900,
  drawnAt: new Date('2026-10-20T12:00:00.000Z'),
  participants: [
    { userId: 'anna', displayName: 'Anna', eligible: true },
    { userId: 'bruno', displayName: 'Bruno', eligible: true },
    { userId: 'carla', displayName: 'Carla', eligible: false }
  ]
} as const;

describe('admin analytics repository', () => {
  it('applies an outing once and treats an identical replay as a no-op', async () => {
    const { transaction, documents } = fakeTransaction();
    const first = await applyPaymentToAdminAnalytics(transaction, input);
    const replay = await applyPaymentToAdminAnalytics(transaction, input);
    const stored = analyticsFromDocument(input.weekId, documents.get(`groups/company/adminAnalytics/${input.weekId}`));

    expect(first.applied).toBe(true);
    expect(replay.applied).toBe(false);
    expect(stored).toMatchObject({ completedOutingCount: 1, sourcePaymentCount: 1, totalSpentCents: 900 });
    expect(stored.personStats.carla).toMatchObject({ eligibleParticipationCount: 0, totalParticipationCount: 1 });
  });

  it('updates only the amount when the applied outing is corrected', async () => {
    const { transaction, documents } = fakeTransaction();
    await applyPaymentToAdminAnalytics(transaction, input);
    await applyPaymentToAdminAnalytics(transaction, { ...input, amountCents: 650 });
    const stored = analyticsFromDocument(input.weekId, documents.get(`groups/company/adminAnalytics/${input.weekId}`));

    expect(stored).toMatchObject({ completedOutingCount: 1, sourcePaymentCount: 1, totalSpentCents: 650 });
    expect(stored.personStats.anna).toMatchObject({ spentCents: 650, drawCount: 1, eligibleParticipationCount: 1, totalParticipationCount: 1 });
  });

  it('marks a source incomplete when draw eligibility is unavailable', async () => {
    const { transaction, documents } = fakeTransaction();
    await applyPaymentToAdminAnalytics(transaction, { ...input, participants: input.participants.map((participant) => ({ ...participant, eligible: null })) });
    const stored = analyticsFromDocument(input.weekId, documents.get(`groups/company/adminAnalytics/${input.weekId}`));

    expect(stored.incompleteSourceCount).toBe(1);
    expect(stored.personStats.anna?.eligibleParticipationCount).toBeNull();
  });
});
