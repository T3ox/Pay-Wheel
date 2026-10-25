interface BootstrapUser {
  uid: string;
}

export interface SessionBootstrap<TUser extends BootstrapUser, TSession> {
  resolve(user: TUser): Promise<TSession>;
  clear(uid?: string): void;
}

export function createSessionBootstrap<TUser extends BootstrapUser, TSession>(
  load: (user: TUser) => Promise<TSession>
): SessionBootstrap<TUser, TSession> {
  let activeUid: string | null = null;
  let activeSession: TSession | null = null;
  let activeRequest: Promise<TSession> | null = null;

  function reset() {
    activeUid = null;
    activeSession = null;
    activeRequest = null;
  }

  return {
    resolve(user) {
      if (activeUid !== user.uid) {
        reset();
        activeUid = user.uid;
      }
      if (activeSession) return Promise.resolve(activeSession);
      if (activeRequest) return activeRequest;

      const uid = user.uid;
      const request = load(user).then((session) => {
        if (activeUid === uid && activeRequest === request) {
          activeSession = session;
          activeRequest = null;
        }
        return session;
      }).catch((error: unknown) => {
        if (activeUid === uid && activeRequest === request) activeRequest = null;
        throw error;
      });
      activeRequest = request;
      return request;
    },
    clear(uid) {
      if (uid === undefined || uid === activeUid) reset();
    }
  };
}
