export function Avatar({ name, photoUrl, size = 'md' }: { name: string; photoUrl?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  if (photoUrl) return <img className={`avatar avatar--${size}`} src={photoUrl} alt="" referrerPolicy="no-referrer" />;
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return <span className={`avatar avatar--${size}`} aria-hidden="true">{initials}</span>;
}

