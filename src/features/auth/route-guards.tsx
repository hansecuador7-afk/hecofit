import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { LoadingScreen } from '@/components/shared/loading-screen';

export function ProtectedRoute() {
  const { user, loading, recoveryMode } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (recoveryMode) return <Navigate to="/reset-password" replace />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, loading, recoveryMode } = useAuth();
  if (loading) return <LoadingScreen />;
  if (recoveryMode) return <Navigate to="/reset-password" replace />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
