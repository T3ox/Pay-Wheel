import { buildFairnessPreview, createPreviewVersion, getWeekId, type FairnessInput } from '@pay-wheel/domain';
import type { Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { refs } from '../repositories/firestore.js';
import { readRevision } from './shared-wheel.js';

export async function calculateOutingPreview(groupId: string, outingId: string, transaction?: Transaction) {
  const get = <T extends FirebaseFirestore.DocumentData>(ref: FirebaseFirestore.DocumentReference<T>) => transaction ? transaction.get(ref) : ref.get();
  const getQuery = <T extends FirebaseFirestore.DocumentData>(query: FirebaseFirestore.Query<T>) => transaction ? transaction.get(query) : query.get();
  const groupSnapshot = await get(refs.group(groupId));
  const outingSnapshot = await get(refs.outing(groupId, outingId));
  if (!groupSnapshot.exists || !outingSnapshot.exists) throw new HttpsError('not-found', 'Uscita non trovata.', { code: 'NOT_FOUND' });
  const group = groupSnapshot.data()!; const outing = outingSnapshot.data()!;
  if (outing.status !== 'open') throw new HttpsError('failed-precondition', 'L’uscita non è aperta.', { code: 'OUTING_NOT_OPEN' });
  const participantSnapshots = await getQuery(refs.participants(groupId, outingId).orderBy('joinedAt'));
  const weekId = getWeekId(new Date(), group.timezone);
  const summarySnapshot = await get(refs.summary(groupId, weekId));
  const summary = summarySnapshot.data();
  const inputs: FairnessInput[] = [];
  for (const participantDoc of participantSnapshots.docs) {
    const participant = participantDoc.data();
    const membership = (await get(refs.membership(groupId, participantDoc.id))).data();
    if (!membership || membership.status !== 'active') continue;
    inputs.push({
      userId: participantDoc.id,
      displayName: participant.displayNameSnapshot,
      joinedAt: participant.joinedAt.toDate().toISOString(),
      spentCents: summary?.memberStats?.[participantDoc.id]?.spentCents ?? 0,
      lastPaidWeekId: membership.lastPaidWeekId ?? null,
      lastPaidAt: membership.lastPaidAt?.toDate().toISOString() ?? null
    });
  }
  if (inputs.length < 1) throw new HttpsError('failed-precondition', 'Nessun partecipante.', { code: 'NOT_ENOUGH_PARTICIPANTS' });
  const preview = buildFairnessPreview(inputs, weekId, summary?.averageCents ?? 0);
  const previewVersion = await createPreviewVersion(preview);
  return {
    ...preview,
    previewVersion,
    participantCount: inputs.length,
    revision: readRevision(outing.revision, 1),
    stateRevision: readRevision(group.stateRevision)
  };
}
