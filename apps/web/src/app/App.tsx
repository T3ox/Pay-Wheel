import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { EntryPage } from '../features/entry/EntryPage';
import { AdminDashboardPage } from '../features/admin/AdminDashboardPage';
import { AdminRouteGate } from '../features/admin/AdminRouteGate';
import { useSession } from '../features/entry/SessionProvider';
import { HistoryPage } from '../features/history/HistoryPage';
import { LeaderboardPage } from '../features/leaderboard/LeaderboardPage';
import { OutingPage } from '../features/outings/OutingPage';
import { AccountDeletionPublicPage } from '../features/settings/AccountDeletionPublicPage';
import { AccountSettingsPage } from '../features/settings/AccountSettingsPage';
import { MinimalShell } from './MinimalShell';

function SessionGate() {
  const { user } = useSession();
  return user ? <Outlet /> : <EntryPage />;
}

export function App() {
  return <Routes>
    <Route path="/account-deletion" element={<AccountDeletionPublicPage />} />
    <Route element={<SessionGate />}>
      <Route element={<MinimalShell />}>
        <Route index element={<OutingPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings/account" element={<AccountSettingsPage />} />
        <Route element={<AdminRouteGate />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        </Route>
      </Route>
    </Route>
    <Route path="/login" element={<Navigate to="/" replace />} />
    <Route path="/outing" element={<Navigate to="/" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
