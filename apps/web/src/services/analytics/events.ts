import { app } from '../firebase/client';

export type AnalyticsEvent =
  | 'login_completed'
  | 'group_created'
  | 'group_joined'
  | 'outing_opened'
  | 'spin_completed'
  | 'payment_completed'
  | 'payment_corrected'
  | 'pwa_installed';

type SafeParameters = Partial<Record<'mode' | 'source' | 'result' | 'participant_bucket', string>>;

export async function trackEvent(name: AnalyticsEvent, parameters: SafeParameters = {}) {
  if (!app || import.meta.env.DEV) return;
  try {
    const { getAnalytics, isSupported, logEvent } = await import('firebase/analytics');
    if (!await isSupported()) return;
    logEvent(getAnalytics(app), name, parameters);
  } catch {
    // Analytics must never block the product flow.
  }
}
