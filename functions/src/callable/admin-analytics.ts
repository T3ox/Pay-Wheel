import { adminAnalyticsPeriodSchema } from '@pay-wheel/domain';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasInternalAdminClaim, internalWorkspaceId, requireInternalIdentity, requireInternalMember } from '../platform/firebase.js';
import { readAdminAnalytics } from '../repositories/admin-analytics.js';

const options = { region: 'europe-west1', enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' } as const;

export const getAdminAnalytics = onCall(options, async (request) => {
  const uid = requireInternalIdentity(request);
  const membership = await requireInternalMember(uid);
  if (!hasInternalAdminClaim(request, membership)) {
    logger.warn('admin.analytics.denied', { uid, reason: 'admin_required' });
    throw new HttpsError('permission-denied', 'Accesso amministratore richiesto.', { code: 'ADMIN_REQUIRED' });
  }
  const parsed = adminAnalyticsPeriodSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'Periodo non valido.', { code: 'INVALID_PERIOD' });
  try {
    const result = await readAdminAnalytics(internalWorkspaceId, parsed.data);
    logger.info('admin.analytics.read', { uid, period: parsed.data.period, rowCount: result.rows.length });
    return result;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error('admin.analytics.failed', { uid, period: parsed.data.period, error });
    throw new HttpsError('unavailable', 'Dashboard temporaneamente non disponibile.', { code: 'ANALYTICS_UNAVAILABLE' });
  }
});
