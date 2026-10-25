import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({ children, variant = 'primary', loading = false, fullWidth = false, className = '', disabled, ...props }: Props) {
  return <button {...props} disabled={disabled || loading} className={`button button--${variant} ${fullWidth ? 'button--full' : ''} ${className}`}>
    {loading && <span className="spinner" aria-hidden="true" />}
    <span>{children}</span>
  </button>;
}

