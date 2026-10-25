import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { testMode } from '../../config/env';
import { localTestSessionAdapter } from './adapters/localTestSessionAdapter';
import type { SessionUser } from './session';

interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
  entering: boolean;
  error: string;
  isTestMode: boolean;
  enter(): Promise<void>;
  signOut(): Promise<void>;
  reauthenticate(): Promise<void>;
  signInGoogle(): Promise<void>;
  signInDemo(): void;
  demoAvailable: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;
    if (testMode) {
      void localTestSessionAdapter.restore().then((restored) => {
        if (active) setUser(restored);
      }).finally(() => {
        if (active) setLoading(false);
      });
    } else {
      void import('./adapters/firebaseSessionAdapter').then(({ observeFirebaseSession }) => observeFirebaseSession((next) => {
        if (!active) return;
        setUser(next);
        setLoading(false);
      }, (cause) => {
        if (!active) return;
        setError(cause.message);
        setLoading(false);
      })).then((stop) => {
        if (active) unsubscribe = stop;
        else stop();
      }).catch((cause: Error) => {
        if (active) {
          setError(cause.message);
          setLoading(false);
        }
      });
    }
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  async function enter() {
    setError('');
    setEntering(true);
    try {
      const next = testMode
        ? await localTestSessionAdapter.enter()
        : await (await import('./adapters/firebaseSessionAdapter')).firebaseSessionAdapter.enter();
      setUser(next);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Accesso non riuscito.';
      if (message !== 'Accesso in corso…') setError(message);
    } finally {
      setEntering(false);
      setLoading(false);
    }
  }

  async function signOut() {
    if (testMode) await localTestSessionAdapter.signOut();
    else await (await import('./adapters/firebaseSessionAdapter')).firebaseSessionAdapter.signOut();
    setUser(null);
  }

  async function reauthenticate() {
    if (!testMode) await (await import('./adapters/firebaseSessionAdapter')).firebaseSessionAdapter.reauthenticate();
  }

  const value = useMemo<SessionContextValue>(() => ({
    user,
    loading,
    entering,
    error,
    isTestMode: testMode,
    enter,
    signOut,
    reauthenticate,
    signInGoogle: enter,
    signInDemo: () => { void enter(); },
    demoAvailable: testMode
  }), [user, loading, entering, error]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be inside SessionProvider');
  return value;
}
