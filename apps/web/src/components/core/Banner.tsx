import type { ReactNode } from 'react';

export function Banner({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'success' | 'warning' | 'error' }) {
  return <div className={`banner banner--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}

