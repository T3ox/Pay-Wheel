import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { requestIdSchema } from '@pay-wheel/domain';
import { z } from 'zod';
import { adminAuth, db, requireUid } from '../platform/firebase.js';
import { refs } from '../repositories/firestore.js';

const options = { region: 'europe-west1', enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' } as const;

export const requestAccountDeletion = onCall(options, async (request) => {
  const uid = requireUid(request); const input = z.object({ requestId: requestIdSchema, confirmation: z.literal('DELETE') }).parse(request.data);
  const authTimeMs = Number(request.auth?.token.auth_time ?? 0) * 1000;
  if (process.env.FUNCTIONS_EMULATOR !== 'true' && (!authTimeMs || Date.now() - authTimeMs > 5 * 60_000)) throw new HttpsError('unauthenticated', 'Accedi di nuovo prima di eliminare l’account.', { code: 'RECENT_LOGIN_REQUIRED' });
  const now = Timestamp.now(); const scheduledFor = Timestamp.fromMillis(Date.now() + 7 * 86400000); await db.runTransaction(async (transaction) => { transaction.set(db.doc(`accountDeletionRequests/${input.requestId}`), { userId: uid, status: 'pending', createdAt: now, scheduledFor }); transaction.set(refs.user(uid), { status: 'deletion_pending', updatedAt: now }, { merge: true }); }); return { deletionRequestId: input.requestId, status: 'pending', scheduledFor: scheduledFor.toDate().toISOString() };
});

export const processAccountDeletions = onSchedule({ region: 'europe-west1', schedule: 'every day 03:00', timeZone: 'Europe/Rome' }, async () => {
  const pending = await db.collection('accountDeletionRequests').where('status', '==', 'pending').where('scheduledFor', '<=', Timestamp.now()).limit(100).get();
  for (const request of pending.docs) {
    const uid = request.data().userId as string; const userRef = refs.user(uid); const user = await userRef.get(); const groupId = (user.data()?.workspaceId ?? user.data()?.activeGroupId) as string | null;
    if (groupId) {
      const [payments, outings, summaries] = await Promise.all([
        db.collection(`groups/${groupId}/payments`).where('payerUserId', '==', uid).get(),
        db.collection(`groups/${groupId}/outings`).where('payerUserId', '==', uid).get(),
        db.collection(`groups/${groupId}/weeklySummaries`).get()
      ]);
      const batch = db.batch();
      batch.set(refs.membership(groupId, uid), { displayNameSnapshot: 'Utente eliminato', photoUrlSnapshot: null, status: 'anonymized', userId: uid, leftAt: Timestamp.now() }, { merge: true });
      batch.update(refs.group(groupId), { activeMemberCount: FieldValue.increment(-1), updatedAt: Timestamp.now() });
      payments.docs.forEach((payment) => batch.update(payment.ref, { payerDisplayNameSnapshot: 'Utente eliminato' }));
      outings.docs.forEach((outing) => batch.update(outing.ref, { payerDisplayNameSnapshot: 'Utente eliminato' }));
      summaries.docs.forEach((summary) => { const memberStats = summary.data().memberStats ?? {}; if (memberStats[uid]) batch.update(summary.ref, new FieldPath('memberStats', uid, 'displayNameSnapshot'), 'Utente eliminato'); });
      await batch.commit();
    }
    await userRef.delete(); await adminAuth.deleteUser(uid).catch(() => undefined); await request.ref.update({ status: 'completed', completedAt: Timestamp.now() });
  }
});
