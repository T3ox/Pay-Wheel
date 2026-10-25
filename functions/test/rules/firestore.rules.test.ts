import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFile } from 'node:fs/promises';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let environment: RulesTestEnvironment;
const emulatorAvailable = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!emulatorAvailable)('Firestore security rules', () => {
  beforeAll(async () => { environment = await initializeTestEnvironment({ projectId: 'pay-wheel-test', firestore: { rules: await readFile('../firebase/firestore.rules', 'utf8') } }); });
  afterAll(async () => environment.cleanup());
  it('denies anonymous user documents', async () => {
    await expect(getDoc(doc(environment.unauthenticatedContext().firestore(), 'users/a'))).rejects.toThrow();
  });
  it('allows only the owner to update allowlisted preferences', async () => {
    await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), 'users/a'), { locale: 'it-IT', reduceMotionOverride: 'system' }));
    await expect(setDoc(doc(environment.authenticatedContext('a').firestore(), 'users/a'), { locale: 'it-IT', reduceMotionOverride: 'on' }, { merge: true })).resolves.toBeUndefined();
  });
  it('isolates group reads and denies direct domain writes', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/a'), { workspaceId: 'g1', locale: 'it-IT', reduceMotionOverride: 'system' });
      await setDoc(doc(context.firestore(), 'users/c'), { workspaceId: 'g1', locale: 'it-IT', reduceMotionOverride: 'system' });
      await setDoc(doc(context.firestore(), 'users/b'), { workspaceId: 'g2', locale: 'it-IT', reduceMotionOverride: 'system' });
      await setDoc(doc(context.firestore(), 'groups/g1'), { name: 'Uno', openOutingId: 'o1', stateRevision: 3 });
      await setDoc(doc(context.firestore(), 'groups/g1/memberships/a'), { status: 'active' });
      await setDoc(doc(context.firestore(), 'groups/g1/memberships/c'), { status: 'active' });
      await setDoc(doc(context.firestore(), 'groups/g1/outings/o1'), { status: 'open', revision: 2, participantCount: 2 });
      await setDoc(doc(context.firestore(), 'groups/g1/outings/o1/participants/a'), { displayNameSnapshot: 'Alice' });
      await setDoc(doc(context.firestore(), 'groups/g1/outings/o1/participants/c'), { displayNameSnapshot: 'Carlo' });
      await setDoc(doc(context.firestore(), 'groups/g2'), { name: 'Due' });
      await setDoc(doc(context.firestore(), 'groups/g2/memberships/b'), { status: 'active' });
    });
    const alice = environment.authenticatedContext('a').firestore();
    const carlo = environment.authenticatedContext('c').firestore();
    await expect(getDoc(doc(alice, 'groups/g1'))).resolves.toBeDefined();
    await expect(getDoc(doc(alice, 'groups/g1/outings/o1'))).resolves.toBeDefined();
    await expect(getDoc(doc(carlo, 'groups/g1/outings/o1'))).resolves.toBeDefined();
    await expect(getDoc(doc(alice, 'groups/g1/outings/o1/participants/c'))).resolves.toBeDefined();
    await expect(getDoc(doc(carlo, 'groups/g1/outings/o1/participants/a'))).resolves.toBeDefined();
    await expect(getDoc(doc(alice, 'groups/g2'))).rejects.toThrow();
    await expect(setDoc(doc(alice, 'groups/g1/outings/o1'), { status: 'open' })).rejects.toThrow();
    await expect(setDoc(doc(carlo, 'groups/g1/outings/o1/participants/c'), { displayNameSnapshot: 'Alterato' })).rejects.toThrow();
    await expect(getDoc(doc(alice, 'groups/g1/idempotencyKeys/private'))).rejects.toThrow();
    await expect(getDoc(doc(alice, 'groups/g1/invites/private'))).rejects.toThrow();
  });
  it('denies direct admin analytics access to members and admins', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users/member'), { workspaceId: 'g1' });
      await setDoc(doc(context.firestore(), 'users/admin'), { workspaceId: 'g1' });
      await setDoc(doc(context.firestore(), 'groups/g1'), { name: 'Uno' });
      await setDoc(doc(context.firestore(), 'groups/g1/memberships/member'), { status: 'active', access: 'member' });
      await setDoc(doc(context.firestore(), 'groups/g1/memberships/admin'), { status: 'active', access: 'admin' });
      await setDoc(doc(context.firestore(), 'groups/g1/adminAnalytics/2026-10-19'), { totalSpentCents: 900 });
      await setDoc(doc(context.firestore(), 'groups/g1/adminAnalytics/2026-10-19/appliedOutings/o1'), { amountCents: 900 });
    });
    for (const uid of ['member', 'admin']) {
      const firestore = environment.authenticatedContext(uid, uid === 'admin' ? { payWheelAdmin: true } : {}).firestore();
      await expect(getDoc(doc(firestore, 'groups/g1/adminAnalytics/2026-10-19'))).rejects.toThrow();
      await expect(getDoc(doc(firestore, 'groups/g1/adminAnalytics/2026-10-19/appliedOutings/o1'))).rejects.toThrow();
      await expect(setDoc(doc(firestore, 'groups/g1/adminAnalytics/2026-10-19'), { totalSpentCents: 1 })).rejects.toThrow();
    }
  });
});
