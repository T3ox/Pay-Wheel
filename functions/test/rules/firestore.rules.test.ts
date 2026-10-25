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
      await setDoc(doc(context.firestore(), 'users/b'), { workspaceId: 'g2', locale: 'it-IT', reduceMotionOverride: 'system' });
      await setDoc(doc(context.firestore(), 'groups/g1'), { name: 'Uno' });
      await setDoc(doc(context.firestore(), 'groups/g1/memberships/a'), { status: 'active' });
      await setDoc(doc(context.firestore(), 'groups/g2'), { name: 'Due' });
      await setDoc(doc(context.firestore(), 'groups/g2/memberships/b'), { status: 'active' });
    });
    const alice = environment.authenticatedContext('a').firestore();
    await expect(getDoc(doc(alice, 'groups/g1'))).resolves.toBeDefined();
    await expect(getDoc(doc(alice, 'groups/g2'))).rejects.toThrow();
    await expect(setDoc(doc(alice, 'groups/g1/outings/o1'), { status: 'open' })).rejects.toThrow();
    await expect(getDoc(doc(alice, 'groups/g1/idempotencyKeys/private'))).rejects.toThrow();
    await expect(getDoc(doc(alice, 'groups/g1/invites/private'))).rejects.toThrow();
  });
});
