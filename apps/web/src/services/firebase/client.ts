import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { env, firebaseConfigured, testMode, useEmulators } from '../../config/env';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let functions: Functions | null = null;

if (firebaseConfigured && !testMode) {
  app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY!,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN!,
    projectId: env.VITE_FIREBASE_PROJECT_ID!,
    appId: env.VITE_FIREBASE_APP_ID!,
    ...(env.VITE_FIREBASE_MEASUREMENT_ID ? { measurementId: env.VITE_FIREBASE_MEASUREMENT_ID } : {})
  });
  auth = getAuth(app);
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  functions = getFunctions(app, 'europe-west1');

  if (useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  } else if (env.VITE_APP_CHECK_SITE_KEY) {
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(env.VITE_APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
  }
}

export { app, auth, db, functions };
