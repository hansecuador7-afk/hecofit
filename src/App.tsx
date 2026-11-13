import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppShell } from '@/components/layout/app-shell';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { LoadingScreen, PageLoader } from '@/components/shared/loading-screen';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { ProtectedRoute, PublicOnlyRoute } from '@/features/auth/route-guards';
import { getActiveUserId } from '@/database/db';
import { syncEngine } from '@/services/sync';

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'));
const SetupPage = lazy(() => import('@/features/auth/SetupPage'));

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const WorkoutsPage = lazy(() => import('@/features/workouts/WorkoutsPage'));
const NewWorkoutPage = lazy(() => import('@/features/workouts/NewWorkoutPage'));
const WorkoutSessionPage = lazy(() => import('@/features/workouts/WorkoutSessionPage'));
const ExercisesPage = lazy(() => import('@/features/exercises/ExercisesPage'));
const RoutinesPage = lazy(() => import('@/features/routines/RoutinesPage'));
const RoutineEditorPage = lazy(() => import('@/features/routines/RoutineEditorPage'));
const CalendarPage = lazy(() => import('@/features/calendar/CalendarPage'));
const HistoryPage = lazy(() => import('@/features/history/HistoryPage'));
const HistoryDetailPage = lazy(() => import('@/features/history/HistoryDetailPage'));
const ComparePage = lazy(() => import('@/features/history/ComparePage'));
const ProgressPage = lazy(() => import('@/features/progress/ProgressPage'));
const RecordsPage = lazy(() => import('@/features/records/RecordsPage'));
const NotesPage = lazy(() => import('@/features/notes/NotesPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const NotFoundPage = lazy(() => import('@/features/misc/NotFoundPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function SyncLifecycle() {
  const { user, mode } = useAuth();

  useEffect(() => {
    if (!user || getActiveUserId() !== user.id) return;
    void syncEngine.start(user.id);
    return () => {
      syncEngine.stop();
    };
  }, [user, mode]);

  return null;
}

function AppToaster() {
  const { settings } = useAuth();
  return (
    <Toaster
      theme={settings?.theme === 'light' ? 'light' : 'dark'}
      position="top-right"
      closeButton
      richColors
      toastOptions={{
        style: {
          borderRadius: '14px',
          fontSize: '13px',
        },
      }}
    />
  );
}

function SuspensePage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route
          path="/setup"
          element={
            <SuspensePage>
              <SetupPage />
            </SuspensePage>
          }
        />
        <Route element={<PublicOnlyRoute />}>
          <Route
            path="/login"
            element={
              <SuspensePage>
                <LoginPage />
              </SuspensePage>
            }
          />
          <Route
            path="/register"
            element={
              <SuspensePage>
                <RegisterPage />
              </SuspensePage>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <SuspensePage>
                <ForgotPasswordPage />
              </SuspensePage>
            }
          />
        </Route>
        <Route
          path="/reset-password"
          element={
            <SuspensePage>
              <ResetPasswordPage />
            </SuspensePage>
          }
        />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route
              index
              element={
                <SuspensePage>
                  <DashboardPage />
                </SuspensePage>
              }
            />
            <Route
              path="workouts"
              element={
                <SuspensePage>
                  <WorkoutsPage />
                </SuspensePage>
              }
            />
            <Route
              path="workouts/new"
              element={
                <SuspensePage>
                  <NewWorkoutPage />
                </SuspensePage>
              }
            />
            <Route
              path="workouts/:workoutId"
              element={
                <SuspensePage>
                  <WorkoutSessionPage />
                </SuspensePage>
              }
            />
            <Route
              path="exercises"
              element={
                <SuspensePage>
                  <ExercisesPage />
                </SuspensePage>
              }
            />
            <Route
              path="routines"
              element={
                <SuspensePage>
                  <RoutinesPage />
                </SuspensePage>
              }
            />
            <Route
              path="routines/:routineId"
              element={
                <SuspensePage>
                  <RoutineEditorPage />
                </SuspensePage>
              }
            />
            <Route
              path="calendar"
              element={
                <SuspensePage>
                  <CalendarPage />
                </SuspensePage>
              }
            />
            <Route
              path="history"
              element={
                <SuspensePage>
                  <HistoryPage />
                </SuspensePage>
              }
            />
            <Route
              path="history/compare"
              element={
                <SuspensePage>
                  <ComparePage />
                </SuspensePage>
              }
            />
            <Route
              path="history/:workoutId"
              element={
                <SuspensePage>
                  <HistoryDetailPage />
                </SuspensePage>
              }
            />
            <Route
              path="progress"
              element={
                <SuspensePage>
                  <ProgressPage />
                </SuspensePage>
              }
            />
            <Route
              path="records"
              element={
                <SuspensePage>
                  <RecordsPage />
                </SuspensePage>
              }
            />
            <Route
              path="notes"
              element={
                <SuspensePage>
                  <NotesPage />
                </SuspensePage>
              }
            />
            <Route
              path="profile"
              element={
                <SuspensePage>
                  <ProfilePage />
                </SuspensePage>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
        <Route
          path="*"
          element={
            <SuspensePage>
              <NotFoundPage />
            </SuspensePage>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <AuthProvider>
            <TooltipProvider delayDuration={250}>
              <SyncLifecycle />
              <AppRoutes />
              <AppToaster />
            </TooltipProvider>
          </AuthProvider>
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
