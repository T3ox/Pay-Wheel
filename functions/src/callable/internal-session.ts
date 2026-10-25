import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { requestIdSchema } from '@pay-wheel/domain';
import { z } from 'zod';
import { db, hasInternalAdminClaim, internalWorkspaceId, requireInternalIdentity } from '../platform/firebase.js';
import { refs } from '../repositories/firestore.js';
import { readRevision } from '../domain/shared-wheel.js';

const options = { region: 'europe-west1', enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' } as const;

export const bootstrapInternalSession = onCall(options, async (request) => {
  const uid = requireInternalIdentity(request);
  z.object({ requestId: requestIdSchema }).parse(request.data);

  return db.runTransaction(async (transaction) => {
    const groupRef = refs.group(internalWorkspaceId);
    const userRef = refs.user(uid);
    const membershipRef = refs.membership(internalWorkspaceId, uid);
    const [groupSnapshot, userSnapshot, membershipSnapshot] = await Promise.all([
      transaction.get(groupRef),
      transaction.get(userRef),
      transaction.get(membershipRef)
    ]);
    if (membershipSnapshot.data()?.status === 'disabled' || userSnapshot.data()?.status === 'disabled') {
      throw new HttpsError('permission-denied', 'Account disabilitato.', { code: 'ACCOUNT_DISABLED' });
    }

    const now = Timestamp.now();
    const displayName = String(request.auth?.token.name ?? membershipSnapshot.data()?.displayNameSnapshot ?? 'Collega').slice(0, 80);
    const photoUrl = request.auth?.token.picture ?? null;
    const email = String(request.auth?.token.email ?? '').toLowerCase();
    const access = hasInternalAdminClaim(request, membershipSnapshot.data()) ? 'admin' : 'member';
    const stateRevision = readRevision(groupSnapshot.data()?.stateRevision);

    if (!groupSnapshot.exists) {
      transaction.set(groupRef, {
        mode: 'internal_singleton',
        name: 'Pay Wheel',
        currency: 'EUR',
        timezone: 'Europe/Rome',
        ownerUserId: null,
        status: 'active',
        archivedAt: null,
        openOutingId: null,
        stateRevision,
        completedOutingSequence: 0,
        activeMemberCount: 0,
        algorithmVersion: 'fairness-v1',
        maxPaymentCents: 50000,
        createdAt: now,
        updatedAt: now
      });
    } else if (!Number.isInteger(groupSnapshot.data()?.stateRevision)) {
      transaction.set(groupRef, { stateRevision }, { merge: true });
    }

    transaction.set(membershipRef, {
      userId: uid,
      displayNameSnapshot: displayName,
      photoUrlSnapshot: photoUrl,
      role: 'member',
      access,
      status: 'active',
      joinedAt: membershipSnapshot.exists ? membershipSnapshot.data()?.joinedAt : now,
      lastSeenAt: now,
      leftAt: null,
      lastPaidWeekId: membershipSnapshot.data()?.lastPaidWeekId ?? null,
      lastPaidAt: membershipSnapshot.data()?.lastPaidAt ?? null
    }, { merge: true });

    transaction.set(userRef, {
      displayName,
      email,
      photoUrl,
      workspaceId: internalWorkspaceId,
      activeGroupId: internalWorkspaceId,
      locale: userSnapshot.data()?.locale ?? 'it-IT',
      reduceMotionOverride: userSnapshot.data()?.reduceMotionOverride ?? 'system',
      status: 'active',
      createdAt: userSnapshot.exists ? userSnapshot.data()?.createdAt : now,
      updatedAt: now
    }, { merge: true });

    if (!membershipSnapshot.exists) {
      transaction.set(groupRef, { activeMemberCount: (groupSnapshot.data()?.activeMemberCount ?? 0) + 1, updatedAt: now }, { merge: true });
    }

    return {
      user: { userId: uid, displayName, photoUrl },
      workspace: { status: 'active', timezone: 'Europe/Rome', currency: 'EUR' },
      membership: { status: 'active', access },
      currentOutingId: groupSnapshot.data()?.openOutingId ?? null,
      stateRevision
    };
  });
});
