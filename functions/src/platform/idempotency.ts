import { createHash } from 'node:crypto';
import { Timestamp, type Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { canonicalize } from '@pay-wheel/domain';
import { db } from './firebase.js';

export function requestHash(payload: unknown) { return createHash('sha256').update(canonicalize(payload)).digest('hex'); }

export async function getIdempotentResult(groupId: string, requestId: string, operation: string, actorUserId: string, payload: unknown) {
  const snapshot = await db.doc(`groups/${groupId}/idempotencyKeys/${requestId}`).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data()!;
  if (data.operation !== operation || data.actorUserId !== actorUserId || data.requestHash !== requestHash(payload)) {
    throw new HttpsError('already-exists', 'La chiave è già stata usata con dati diversi.', { code: 'IDEMPOTENCY_MISMATCH' });
  }
  return data.result;
}

export function saveIdempotentResult(transaction: Transaction, groupId: string, requestId: string, operation: string, actorUserId: string, resourceId: string, payload: unknown, result: unknown) {
  transaction.set(db.doc(`groups/${groupId}/idempotencyKeys/${requestId}`), {
    operation, actorUserId, resourceId, requestHash: requestHash(payload), result,
    createdAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(Date.now() + 30 * 86400000)
  });
}

