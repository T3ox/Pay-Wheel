import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { requestIdSchema } from '@pay-wheel/domain';
import { z } from 'zod';
import { db, requireActiveMember, requireOwner, requireUid } from '../platform/firebase.js';
import { refs } from '../repositories/firestore.js';

const options = { region: 'europe-west1', enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' } as const;

export const removeMember = onCall(options, async (request) => {
  const uid = requireUid(request); const input = z.object({ requestId: requestIdSchema, groupId: z.string(), memberUserId: z.string() }).parse(request.data); await requireOwner(input.groupId, uid); if (input.memberUserId === uid) throw new HttpsError('invalid-argument', 'Non puoi rimuovere te stesso.');
  await db.runTransaction(async (transaction) => { const groupRef = refs.group(input.groupId); const group = await transaction.get(groupRef); if (group.data()?.openOutingId) throw new HttpsError('failed-precondition', 'Concludi prima l’uscita attiva.', { code: 'CONFLICT' }); const target = await transaction.get(refs.membership(input.groupId, input.memberUserId)); if (target.data()?.status !== 'active') throw new HttpsError('failed-precondition', 'Il membro non è attivo.'); const now = Timestamp.now(); transaction.update(refs.membership(input.groupId, input.memberUserId), { status: 'removed', leftAt: now }); transaction.update(refs.user(input.memberUserId), { activeGroupId: null, updatedAt: now }); transaction.update(groupRef, { activeMemberCount: FieldValue.increment(-1), updatedAt: now }); }); return { groupId: input.groupId, memberUserId: input.memberUserId, membershipStatus: 'removed' };
});

export const transferOwnership = onCall(options, async (request) => {
  const uid = requireUid(request); const input = z.object({ requestId: requestIdSchema, groupId: z.string(), newOwnerUserId: z.string() }).parse(request.data); await requireOwner(input.groupId, uid);
  await db.runTransaction(async (transaction) => { const target = await transaction.get(refs.membership(input.groupId, input.newOwnerUserId)); if (target.data()?.status !== 'active') throw new HttpsError('failed-precondition', 'Il nuovo owner deve essere attivo.'); transaction.update(refs.group(input.groupId), { ownerUserId: input.newOwnerUserId, updatedAt: Timestamp.now() }); transaction.update(refs.membership(input.groupId, uid), { role: 'member' }); transaction.update(refs.membership(input.groupId, input.newOwnerUserId), { role: 'owner' }); }); return { groupId: input.groupId, previousOwnerUserId: uid, ownerUserId: input.newOwnerUserId };
});

export const archiveGroup = onCall(options, async (request) => {
  const uid = requireUid(request); const input = z.object({ requestId: requestIdSchema, groupId: z.string(), confirmation: z.literal('ARCHIVE') }).parse(request.data); await requireOwner(input.groupId, uid);
  const now = Timestamp.now(); await db.runTransaction(async (transaction) => { const groupRef = refs.group(input.groupId); const group = await transaction.get(groupRef); if (group.data()?.openOutingId) throw new HttpsError('failed-precondition', 'Concludi prima l’uscita attiva.', { code: 'CONFLICT' }); transaction.update(groupRef, { status: 'archived', archivedAt: now, updatedAt: now }); }); return { groupId: input.groupId, status: 'archived', archivedAt: now.toDate().toISOString() };
});

export const leaveGroup = onCall(options, async (request) => {
  const uid = requireUid(request); const input = z.object({ requestId: requestIdSchema, groupId: z.string() }).parse(request.data); const membership = await requireActiveMember(input.groupId, uid); const group = (await refs.group(input.groupId).get()).data(); if (membership.role === 'owner' && group?.status === 'active') throw new HttpsError('failed-precondition', 'Trasferisci la proprietà o archivia il gruppo.', { code: 'OWNERSHIP_UNRESOLVED' }); if (group?.openOutingId) throw new HttpsError('failed-precondition', 'Concludi prima l’uscita attiva.', { code: 'CONFLICT' }); await db.runTransaction(async (transaction) => { const now = Timestamp.now(); transaction.update(refs.membership(input.groupId, uid), { status: 'left', leftAt: now }); transaction.update(refs.user(uid), { activeGroupId: null, updatedAt: now }); transaction.update(refs.group(input.groupId), { activeMemberCount: FieldValue.increment(-1), updatedAt: now }); }); return { groupId: input.groupId, membershipStatus: 'left' };
});
