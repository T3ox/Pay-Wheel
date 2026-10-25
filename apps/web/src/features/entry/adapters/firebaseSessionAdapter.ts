import type { User } from 'firebase/auth';
import { callFunction, newRequestId } from '../../../services/firebase/callable';
import type { SessionAdapter, SessionUser } from '../session';

function mapUser(user: User): SessionUser {
  return {
    uid: user.uid,
    displayName: user.displayName ?? 'Collega',
    email: user.email,
    photoURL: user.photoURL,
    mode: 'firebase',
    demo: false
  };
}

async function getConfiguredAuth() {
  const [{ auth }, authApi] = await Promise.all([import('../../../services/firebase/client'), import('firebase/auth')]);
  if (!auth) throw new Error('Firebase non è configurato per questo ambiente.');
  return { auth, authApi };
}

async function bootstrapAndJoin(user: User) {
  await callFunction('bootstrapInternalSession', { requestId: newRequestId() });
  await callFunction('joinCurrentOuting', { requestId: newRequestId(), participating: true });
  return mapUser(user);
}

export const firebaseSessionAdapter: SessionAdapter = {
  async restore() {
    const { auth } = await getConfiguredAuth();
    return auth.currentUser ? bootstrapAndJoin(auth.currentUser) : null;
  },
  async enter() {
    const { auth, authApi } = await getConfiguredAuth();
    const provider = new authApi.GoogleAuthProvider();
    const redirect = matchMedia('(display-mode: standalone)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
    if (redirect) {
      await authApi.signInWithRedirect(auth, provider);
      throw new Error('Accesso in corso…');
    }
    const result = await authApi.signInWithPopup(auth, provider);
    return bootstrapAndJoin(result.user);
  },
  async signOut() {
    const { auth, authApi } = await getConfiguredAuth();
    await authApi.signOut(auth);
  },
  async reauthenticate() {
    const { auth, authApi } = await getConfiguredAuth();
    if (auth.currentUser) await authApi.reauthenticateWithPopup(auth.currentUser, new authApi.GoogleAuthProvider());
  }
};

export async function observeFirebaseSession(onChange: (user: SessionUser | null) => void, onError: (error: Error) => void) {
  const { auth, authApi } = await getConfiguredAuth();
  await authApi.getRedirectResult(auth).catch((error: Error) => onError(error));
  return authApi.onAuthStateChanged(auth, (user) => {
    if (!user) {
      onChange(null);
      return;
    }
    void bootstrapAndJoin(user).then(onChange).catch((error: Error) => onError(error));
  });
}
