import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../entry/SessionProvider';

export function AdminRouteGate() {
  const { user } = useSession();
  return user?.access === 'admin' ? <Outlet /> : <Navigate to="/" replace />;
}
