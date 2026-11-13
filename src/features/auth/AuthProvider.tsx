import { useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearLocalSession,
  getLocalSession,
  loginLocalAccount,
  registerLocalAccount,
  updateLocalDisplayName,
  updateLocalPassword,
} from '@/database/authDb';
import {
  closeActiveDatabase,
  deleteUserDatabase,
  enqueueOperation,
  getActiveUserId,
  getDb,
  initializeUserDatabase,
} from '@/database/db';
import { getErrorMessage } from '@/lib/errors';
import { isCloudConfigured, supabase } from '@/lib/supabase';
import { getNameFromEmail, nowIso } from '@/lib/utils';
import type {
  AppMode,
  Profile,
  SessionUser,
  Theme,
  UserSettings,
} from '@/types/models';

interface AuthContextValue {
  mode: AppMode;
  cloudAvailable: boolean;
  loading: boolean;
  recoveryMode: boolean;
  user: SessionUser | null;
  profile: Profile | null;
  settings: UserSettings | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    displayName: string;
    email: string;
    password: string;
  }) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string, currentPassword?: string) => Promise<void>;
  finishRecovery: () => void;
  updateProfileInfo: (input: { displayName: string; avatarUrl?: string | null }) => Promise<void>;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  deleteAccount: (confirmation: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapAuthUser(user: {
  id: string;
  email?: string | null;
  created_at: string;
  user_metadata: Record<string, unknown>;
}): SessionUser {
  const metadata = user.user_metadata;
  const displayName =
    (typeof metadata.display_name === 'string' && metadata.display_name.trim()) ||
    (typeof metadata.full_name === 'string' && metadata.full_name.trim()) ||
    getNameFromEmail(user.email ?? 'atleta@hecofit.app');
  return {
    id: user.id,
    email: user.email ?? '',
    displayName,
    avatarUrl: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
    createdAt: user.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mountSequence = useRef(0);
  const initialisedUserId = useRef<string | null>(null);

  const mode: AppMode = isCloudConfigured ? 'cloud' : 'local';

  const activateUser = useCallback(async (nextUser: SessionUser) => {
    if (initialisedUserId.current === nextUser.id && getActiveUserId() === nextUser.id) {
      setUser(nextUser);
      return;
    }
    await initializeUserDatabase(nextUser);
    initialisedUserId.current = nextUser.id;
    setUser(nextUser);
  }, []);

  useEffect(() => {
    const sequence = ++mountSequence.current;
    let unsubscribe: (() => void) | undefined;

    const bootstrap = async () => {
      try {
        if (!supabase) {
          const localSession = await getLocalSession();
          if (sequence !== mountSequence.current) return;
          if (localSession) await activateUser(localSession);
          setLoading(false);
          return;
        }

        const hasRecoveryFlag = new URLSearchParams(window.location.search).get('recovery') === '1';
        if (hasRecoveryFlag) {
          setRecoveryMode(true);
          navigate('/reset-password', { replace: true });
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (sequence !== mountSequence.current) return;
        if (data.session?.user) {
          await activateUser(mapAuthUser(data.session.user));
        }
        setLoading(false);

        const listener = supabase.auth.onAuthStateChange((event, session) => {
          void (async () => {
            if (event === 'PASSWORD_RECOVERY') {
              setRecoveryMode(true);
              navigate('/reset-password', { replace: true });
            }
            if (event === 'SIGNED_OUT') {
              initialisedUserId.current = null;
              setRecoveryMode(false);
              setUser(null);
              closeActiveDatabase();
              queryClient.clear();
              return;
            }
            if (session?.user) {
              await activateUser(mapAuthUser(session.user));
            }
          })();
        });
        unsubscribe = () => listener.data.subscription.unsubscribe();
      } catch (error) {
        if (sequence === mountSequence.current) {
          setLoading(false);
          console.error('Error al restaurar la sesión:', getErrorMessage(error));
        }
      }
    };

    void bootstrap();

    return () => {
      unsubscribe?.();
    };
  }, [activateUser, navigate, queryClient]);

  const profile = useLiveQuery(
    async () => {
      if (!user || getActiveUserId() !== user.id) return null;
      try {
        return (await getDb().profiles.get(user.id)) ?? null;
      } catch {
        return null;
      }
    },
    [user?.id],
    null,
  );

  const settings = useLiveQuery(
    async () => {
      if (!user || getActiveUserId() !== user.id) return null;
      try {
        return (await getDb().settings.get(user.id)) ?? null;
      } catch {
        return null;
      }
    },
    [user?.id],
    null,
  );

  useEffect(() => {
    const theme: Theme = settings?.theme === 'light' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    localStorage.setItem('hecofit:theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#F3F5F8' : '#0B0D10');
  }, [settings?.theme]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        if (!supabase) {
          const nextUser = await loginLocalAccount({ email, password });
          await activateUser(nextUser);
          return;
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        if (data.user) await activateUser(mapAuthUser(data.user));
      } catch (error) {
        throw new Error(getErrorMessage(error));
      }
    },
    [activateUser],
  );

  const signUp = useCallback(
    async (input: { displayName: string; email: string; password: string }) => {
      try {
        if (!supabase) {
          const nextUser = await registerLocalAccount(input);
          await activateUser(nextUser);
          return { needsConfirmation: false };
        }
        const { data, error } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            data: { display_name: input.displayName },
            emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
          },
        });
        if (error) throw new Error(error.message);
        if (data.session?.user) {
          await activateUser(mapAuthUser(data.session.user));
          return { needsConfirmation: false };
        }
        return { needsConfirmation: true };
      } catch (error) {
        throw new Error(getErrorMessage(error));
      }
    },
    [activateUser],
  );

  const signOut = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(getErrorMessage(error));
    } else {
      clearLocalSession();
    }
    initialisedUserId.current = null;
    setUser(null);
    setRecoveryMode(false);
    closeActiveDatabase();
    queryClient.clear();
    navigate('/login', { replace: true });
  }, [navigate, queryClient]);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) {
      throw new Error(
        'El modo local no envía correos. Si olvidaste tu contraseña, tus datos seguirán en este dispositivo, pero deberás crear una cuenta de nube para recuperar el acceso desde otros equipos.',
      );
    }
    const redirectTo = `${window.location.origin}${window.location.pathname}?recovery=1`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw new Error(getErrorMessage(error));
  }, []);

  const updatePassword = useCallback(
    async (newPassword: string, currentPassword?: string) => {
      try {
        if (!supabase) {
          if (!user) throw new Error('No hay una sesión activa.');
          if (!currentPassword) throw new Error('Introduce tu contraseña actual.');
          await updateLocalPassword(user.id, currentPassword, newPassword);
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw new Error(error.message);
      } catch (error) {
        throw new Error(getErrorMessage(error));
      }
    },
    [user],
  );

  const finishRecovery = useCallback(() => {
    setRecoveryMode(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('recovery');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    navigate('/', { replace: true });
  }, [navigate]);

  const updateProfileInfo = useCallback(
    async (input: { displayName: string; avatarUrl?: string | null }) => {
      if (!user) throw new Error('No hay una sesión activa.');
      const db = getDb();
      const current = await db.profiles.get(user.id);
      const timestamp = nowIso();
      const nextProfile: Profile = {
        id: user.id,
        displayName: input.displayName.trim(),
        avatarUrl: input.avatarUrl === undefined ? current?.avatarUrl ?? null : input.avatarUrl,
        createdAt: current?.createdAt ?? user.createdAt,
        updatedAt: timestamp,
      };
      await db.profiles.put(nextProfile);
      if (!supabase) {
        await updateLocalDisplayName(user.id, nextProfile.displayName);
      } else {
        await enqueueOperation({
          entity: 'profile',
          operation: 'upsert',
          entityId: user.id,
          payload: nextProfile,
        });
        const { error } = await supabase.auth.updateUser({
          data: { display_name: nextProfile.displayName, avatar_url: nextProfile.avatarUrl },
        });
        if (error) console.warn('No se pudo actualizar el metadato del perfil:', error.message);
      }
      setUser((previous) =>
        previous
          ? { ...previous, displayName: nextProfile.displayName, avatarUrl: nextProfile.avatarUrl }
          : previous,
      );
    },
    [user],
  );

  const updateSettings = useCallback(
    async (patch: Partial<UserSettings>) => {
      if (!user) throw new Error('No hay una sesión activa.');
      const db = getDb();
      const current = await db.settings.get(user.id);
      if (!current) throw new Error('No se encontró la configuración del usuario.');
      const next: UserSettings = { ...current, ...patch, userId: user.id, updatedAt: nowIso() };
      await db.settings.put(next);
      if (supabase && !recoveryMode) {
        await enqueueOperation({
          entity: 'settings',
          operation: 'upsert',
          entityId: user.id,
          payload: next,
        });
      }
    },
    [recoveryMode, user],
  );

  const deleteAccount = useCallback(
    async (confirmation: string) => {
      if (!user) throw new Error('No hay una sesión activa.');
      if (confirmation.trim().toUpperCase() !== 'ELIMINAR') {
        throw new Error('Escribe ELIMINAR para confirmar la eliminación de la cuenta.');
      }
      if (supabase) {
        const { error } = await supabase.rpc('delete_own_account');
        if (error) throw new Error(getErrorMessage(error.message));
        await supabase.auth.signOut();
      }
      try {
        const { deleteLocalAccount } = await import('@/database/authDb');
        await deleteLocalAccount(user.id);
      } catch {
        // La cuenta en la nube ya se eliminó; la cuenta local es opcional.
      }
      await deleteUserDatabase(user.id);
      initialisedUserId.current = null;
      setUser(null);
      queryClient.clear();
      navigate('/login', { replace: true });
    },
    [navigate, queryClient, user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      mode,
      cloudAvailable: isCloudConfigured,
      loading,
      recoveryMode,
      user,
      profile: profile ?? null,
      settings: settings ?? null,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      finishRecovery,
      updateProfileInfo,
      updateSettings,
      deleteAccount,
    }),
    [
      mode,
      loading,
      recoveryMode,
      user,
      profile,
      settings,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      finishRecovery,
      updateProfileInfo,
      updateSettings,
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
