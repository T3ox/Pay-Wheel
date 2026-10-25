import { createHash, randomBytes } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { groupNameSchema, requestIdSchema } from '@pay-wheel/domain';
import { z } from 'zod';
import { db, requireOwner, requireUid } from '../platform/firebase.js';
import { getIdempotentResult, saveIdempotentResult } from '../platform/idempotency.js';
import { refs } from '../repositories/firestore.js';

const options = { region: 'europe-west1', enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' } as const;

export const createGroup = onCall(options, async (request) => {
  const uid = requireUid(request);
  const input = z.object({ requestId: requestIdSchema, name: groupNameSchema, timezone: z.string().default('Europe/Rome'), currency: z.literal('EUR') }).parse(request.data);
  const groupRef = db.collection('groups').doc();
  const result = { groupId: groupRef.id, membershipRole: 'owner' };
  await db.runTransaction(async (transaction) => {
    const userRef = refs.user(uid); const user = await transaction.get(userRef);
    if (user.data()?.activeGroupId) throw new HttpsError('failed-precondition', 'Hai già un gruppo attivo.', { code: 'CONFLICT' });
    const now = Timestamp.now();
    transaction.set(groupRef, { name: input.name, currency: 'EUR', timezone: input.timezone, ownerUserId: uid, status: 'active', archivedAt: null, openOutingId: null, completedOutingSequence: 0, activeMemberCount: 1, algorithmVersion: 'fairness-v1', maxPaymentCents: 50000, createdAt: now, updatedAt: now });
    transaction.set(refs.membership(groupRef.id, uid), { userId: uid, displayNameSnapshot: request.auth?.token.name ?? 'Collega', photoUrlSnapshot: request.auth?.token.picture ?? null, role: 'owner', status: 'active', joinedAt: now, leftAt: null, lastPaidWeekId: null, lastPaidAt: null });
    transaction.set(userRef, { displayName: request.auth?.token.name ?? 'Collega', email: request.auth?.token.email ?? '', photoUrl: request.auth?.token.picture ?? null, activeGroupId: groupRef.id, locale: 'it-IT', reduceMotionOverride: 'system', status: 'active', createdAt: user.exists ? user.data()?.createdAt : now, updatedAt: now }, { merge: true });
    saveIdempotentResult(transaction, groupRef.id, input.requestId, 'createGroup', uid, groupRef.id, input, result);
  });
  return result;
});

export const createInvite = onCall(options, async (request) => {
  const uid = requireUid(request);
  const input = z.object({ requestId: requestIdSchema, groupId: z.string(), maxUses: z.number().int().min(1).max(25).default(20), expiresInDays: z.number().int().min(1).max(30).default(7) }).parse(request.data);
  await requireOwner(input.groupId, uid);
  const group = await refs.group(input.groupId).get();
  if (group.data()?.status !== 'active') throw new HttpsError('failed-precondition', 'Il gruppo è archiviato.', { code: 'GROUP_ARCHIVED' });
  const replay = await getIdempotentResult(input.groupId, input.requestId, 'createInvite', uid, input); if (replay) return replay;
  const code = `CAFFE-${randomBytes(3).toString('hex').toUpperCase()}`;
  const hash = createHash('sha256').update(code).digest('hex'); const inviteRef = db.collection(`groups/${input.groupId}/invites`).doc();
  const expiresAt = Timestamp.fromMillis(Date.now() + input.expiresInDays * 86400000);
  const result = { inviteId: inviteRef.id, code, expiresAt: expiresAt.toDate().toISOString() };
  await db.runTransaction(async (transaction) => {
    transaction.set(inviteRef, { codeHash: hash, createdBy: uid, status: 'active', maxUses: input.maxUses, useCount: 0, expiresAt, createdAt: Timestamp.now() });
    transaction.set(db.doc(`inviteCodes/${hash}`), { groupId: input.groupId, inviteId: inviteRef.id, expiresAt });
    saveIdempotentResult(transaction, input.groupId, input.requestId, 'createInvite', uid, inviteRef.id, input, result);
  });
  return result;
});

export const revokeInvite = onCall(options, async (request) => {
  const uid = requireUid(request); const input = z.object({ requestId: requestIdSchema, groupId: z.string(), inviteId: z.string() }).parse(request.data);
  await requireOwner(input.groupId, uid); const replay = await getIdempotentResult(input.groupId, input.requestId, 'revokeInvite', uid, input); if (replay) return replay; const result = { inviteId: input.inviteId, status: 'revoked' as const }; await db.runTransaction(async (transaction) => { transaction.update(db.doc(`groups/${input.groupId}/invites/${input.inviteId}`), { status: 'revoked' }); saveIdempotentResult(transaction, input.groupId, input.requestId, 'revokeInvite', uid, input.inviteId, input, result); }); return result;
});

export const joinGroup = onCall(options, async (request) => {
  const uid = requireUid(request); const input = z.object({ requestId: requestIdSchema, inviteCode: z.string().trim().toUpperCase() }).parse(request.data);
  const hash = createHash('sha256').update(input.inviteCode).digest('hex'); const lookupRef = db.doc(`inviteCodes/${hash}`);
  const initialLookup = await lookupRef.get();
  if (initialLookup.exists) { const replay = await getIdempotentResult(initialLookup.data()!.groupId, input.requestId, 'joinGroup', uid, input); if (replay) return replay; }
  const result = await db.runTransaction(async (transaction) => {
    const lookup = await transaction.get(lookupRef); if (!lookup.exists) throw new HttpsError('not-found', 'Invito non valido.', { code: 'NOT_FOUND' });
    const { groupId, inviteId } = lookup.data()!; const inviteRef = db.doc(`groups/${groupId}/invites/${inviteId}`); const invite = await transaction.get(inviteRef); const userRef = refs.user(uid); const user = await transaction.get(userRef); const group = await transaction.get(refs.group(groupId));
    if (!invite.exists || invite.data()?.status !== 'active' || invite.data()!.expiresAt.toMillis() <= Date.now() || invite.data()!.useCount >= invite.data()!.maxUses) throw new HttpsError('failed-precondition', 'Invito scaduto o esaurito.', { code: 'INVITE_UNAVAILABLE' });
    if (!group.exists || group.data()?.status !== 'active') throw new HttpsError('failed-precondition', 'Il gruppo non è più attivo.', { code: 'GROUP_ARCHIVED' });
    if ((group.data()?.activeMemberCount ?? 0) >= 25) throw new HttpsError('resource-exhausted', 'Il gruppo ha raggiunto il limite di 25 membri.', { code: 'GROUP_FULL' });
    if (user.data()?.activeGroupId) throw new HttpsError('failed-precondition', 'Hai già un gruppo attivo.', { code: 'CONFLICT' });
    const now = Timestamp.now();
    transaction.update(inviteRef, { useCount: FieldValue.increment(1) });
    transaction.update(refs.group(groupId), { activeMemberCount: FieldValue.increment(1), updatedAt: now });
    transaction.set(refs.membership(groupId, uid), { userId: uid, displayNameSnapshot: request.auth?.token.name ?? 'Collega', photoUrlSnapshot: request.auth?.token.picture ?? null, role: 'member', status: 'active', joinedAt: now, leftAt: null, lastPaidWeekId: null, lastPaidAt: null });
    transaction.set(userRef, { displayName: request.auth?.token.name ?? 'Collega', email: request.auth?.token.email ?? '', photoUrl: request.auth?.token.picture ?? null, activeGroupId: groupId, locale: 'it-IT', reduceMotionOverride: 'system', status: 'active', createdAt: user.exists ? user.data()?.createdAt : now, updatedAt: now }, { merge: true });
    const joined = { groupId, groupName: group.data()?.name, membershipRole: 'member' as const };
    saveIdempotentResult(transaction, groupId, input.requestId, 'joinGroup', uid, uid, input, joined);
    return joined;
  });
  return result;
});
