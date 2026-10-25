import { z } from 'zod';

const schema = z.object({
  VITE_FIREBASE_API_KEY: z.string().optional(),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  VITE_FIREBASE_PROJECT_ID: z.string().optional(),
  VITE_FIREBASE_APP_ID: z.string().optional(),
  VITE_FIREBASE_MEASUREMENT_ID: z.string().optional(),
  VITE_APP_CHECK_SITE_KEY: z.string().optional(),
  VITE_USE_FIREBASE_EMULATORS: z.string().optional(),
  VITE_TEST_MODE: z.string().optional()
});

export const env = schema.parse(import.meta.env);
export const firebaseConfigured = Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_AUTH_DOMAIN && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID);
export const testMode = env.VITE_TEST_MODE === 'true' || !firebaseConfigured;
export const useEmulators = env.VITE_USE_FIREBASE_EMULATORS === 'true';
