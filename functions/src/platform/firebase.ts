import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

if (getApps().length === 0) initializeApp();

export const db = getFirestore();
export const adminAuth = getAuth();
db.settings({ ignoreUndefinedProperties: true });

export const internalWorkspaceId = process.env.INTERNAL_GROUP_ID?.trim() || 'company';
const allowedDomains = (process.env.INTERNAL_ALLOWED_DOMAINS || '')
  .split(',')
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

export function requireUid(request: CallableRequest<unknown>): string {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Devi accedere per continuare.', { code: 'UNAUTHENTICATED' });
  return request.auth.uid;
}

export function requireInternalIdentity(request: CallableRequest<unknown>): string {
  const uid = requireUid(request);
  if (process.env.FUNCTIONS_EMULATOR === 'true') return uid;
  const email = String(request.auth?.token.email ?? '').toLowerCase();
  const emailVerified = request.auth?.token.email_verified === true;
  const domain = email.split('@')[1] ?? '';
  if (!emailVerified || !domain || !allowedDomains.includes(domain)) {
    throw new HttpsError('permission-denied', 'Questo account non può accedere all’app.', { code: 'INTERNAL_ACCESS_DENIED' });
  }
  return uid;
}

export async function requireInternalMember(uid: string) {
  return requireActiveMember(internalWorkspaceId, uid);
}

export function hasInternalAdminClaim(request: CallableRequest<unknown>, membership?: FirebaseFirestore.DocumentData) {
  return request.auth?.token.payWheelAdmin === true || membership?.access === 'admin';
}

export async function requireActiveMember(groupId: string, uid: string) {
  const membership = await db.doc(`groups/${groupId}/memberships/${uid}`).get();
  if (!membership.exists || membership.data()?.status !== 'active') throw new HttpsError('permission-denied', 'Non fai parte di questo gruppo.', { code: 'NOT_GROUP_MEMBER' });
  return membership.data()!;
}

export async function requireOwner(groupId: string, uid: string) {
  const membership = await requireActiveMember(groupId, uid);
  if (membership.role !== 'owner') throw new HttpsError('permission-denied', 'Solo l’owner può eseguire questa azione.', { code: 'FORBIDDEN' });
  return membership;
}
