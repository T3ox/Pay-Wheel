export interface SessionUser {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  mode: 'test' | 'firebase';
  access: 'member' | 'admin';
  /** Compatibility flag for domain adapters that still distinguish local state. */
  demo: boolean;
}

export interface SessionAdapter {
  restore(): Promise<SessionUser | null>;
  enter(): Promise<SessionUser>;
  signOut(): Promise<void>;
  reauthenticate(): Promise<void>;
}
