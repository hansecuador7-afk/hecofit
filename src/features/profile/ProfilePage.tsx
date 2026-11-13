import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  Cloud,
  CloudOff,
  Database,
  Download,
  FileJson,
  HardDrive,
  KeyRound,
  Loader2,
  LogOut,
  Moon,
  Palette,
  RefreshCw,
  Save,
  Scale,
  ShieldCheck,
  Smartphone,
  Sun,
  Timer,
  Trash2,
  Upload,
  UserRound,
  Volume2,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/page-header';
import { SyncBadge } from '@/components/shared/sync-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FieldError, Input, Label, Select } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/features/auth/AuthProvider';
import { PasswordField } from '@/features/auth/password-field';
import { passwordSchema } from '@/features/auth/schemas';
import {
  downloadBackup,
  exportWorkoutsCsv,
  readBackupFile,
  restoreBackup,
  summarizeBackup,
  type BackupSummary,
} from '@/features/profile/backup';
import {
  useExercises,
  useNotes,
  usePlans,
  useWorkouts,
  useWorkoutsWithDetails,
} from '@/hooks/useHecoData';
import {
  DATE_FORMAT_OPTIONS,
  DEFAULT_REST_SECONDS,
  MAX_REST_SECONDS,
  MIN_REST_SECONDS,
  REST_PRESETS,
  WEIGHT_UNIT_LABELS,
} from '@/lib/constants';
import { formatDateTime, formatLongDate } from '@/lib/dates';
import { getErrorMessage } from '@/lib/errors';
import { isFinished } from '@/lib/metrics';
import { clamp, cn, formatNumber, initials } from '@/lib/utils';
import { forceFullSync } from '@/services/sync';
import { useSyncStore } from '@/stores/syncStore';
import type { BackupPayload } from '@/types/models';

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(60, 'El nombre no puede superar los 60 caracteres.'),
  avatarUrl: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^https?:\/\/.+/.test(value),
      'Introduce una URL de imagen válida (http o https).',
    ),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Repite la contraseña nueva.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

function PreferenceRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-surface/25 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function ProfilePage() {
  const {
    user,
    profile,
    settings,
    mode,
    cloudAvailable,
    signOut,
    updateProfileInfo,
    updateSettings,
    updatePassword,
    deleteAccount,
  } = useAuth();
  const workouts = useWorkouts();
  const workoutsWithDetails = useWorkoutsWithDetails();
  const plans = usePlans();
  const notes = useNotes();
  const exercises = useExercises();
  const { pendingCount, lastSyncedAt, online } = useSyncStore();

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [restDraft, setRestDraft] = useState(String(settings?.restSeconds ?? DEFAULT_REST_SECONDS));
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<BackupPayload | null>(null);
  const [restoreSummary, setRestoreSummary] = useState<BackupSummary | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register: registerProfile,
    handleSubmit: submitProfile,
    reset: resetProfile,
    watch: watchProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile?.displayName ?? '',
      avatarUrl: profile?.avatarUrl ?? '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: submitPassword,
    reset: resetPassword,
    setError: setPasswordError,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });

  const displayNameValue = watchProfile('displayName');
  const avatarValue = watchProfile('avatarUrl');

  useEffect(() => {
    resetProfile({
      displayName: profile?.displayName ?? '',
      avatarUrl: profile?.avatarUrl ?? '',
    });
  }, [profile?.displayName, profile?.avatarUrl, resetProfile]);

  useEffect(() => {
    setRestDraft(String(settings?.restSeconds ?? DEFAULT_REST_SECONDS));
  }, [settings?.restSeconds]);

  const customExerciseCount = exercises.filter((exercise) => exercise.source === 'custom').length;
  const finishedCount = workoutsWithDetails.filter(isFinished).length;

  const applySettings = async (patch: Parameters<typeof updateSettings>[0]) => {
    try {
      await updateSettings(patch);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleProfileSave = async (values: ProfileFormValues) => {
    setSavingProfile(true);
    try {
      await updateProfileInfo({
        displayName: values.displayName,
        avatarUrl: values.avatarUrl.trim() || null,
      });
      toast.success('Perfil actualizado');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (values: ChangePasswordValues) => {
    if (mode === 'local' && !values.currentPassword?.trim()) {
      setPasswordError('currentPassword', {
        message: 'Introduce tu contraseña actual para cambiarla en modo local.',
      });
      return;
    }
    setSavingPassword(true);
    try {
      await updatePassword(values.password, values.currentPassword);
      resetPassword({ currentPassword: '', password: '', confirmPassword: '' });
      toast.success('Contraseña actualizada');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingPassword(false);
    }
  };

  const commitRestSeconds = async () => {
    const parsed = Number(restDraft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setRestDraft(String(settings?.restSeconds ?? DEFAULT_REST_SECONDS));
      return;
    }
    const next = clamp(Math.round(parsed), MIN_REST_SECONDS, MAX_REST_SECONDS);
    setRestDraft(String(next));
    if (next !== settings?.restSeconds) await applySettings({ restSeconds: next });
  };

  const handleNotifications = async (checked: boolean) => {
    if (!checked) {
      await applySettings({ notificationsEnabled: false });
      return;
    }
    if (typeof Notification === 'undefined') {
      toast.error('Este navegador no admite notificaciones del sistema.');
      return;
    }
    setNotificationBusy(true);
    try {
      const permission =
        Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('No se concedió permiso para mostrar notificaciones.');
        return;
      }
      await applySettings({ notificationsEnabled: true });
      new Notification('HECOFIT', {
        body: 'Las notificaciones están activas. Te avisaremos al terminar los descansos.',
        icon: new URL('icons/icon-192.png', document.baseURI).href,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setNotificationBusy(false);
    }
  };

  const handleBackup = async () => {
    setBackupBusy(true);
    try {
      await downloadBackup();
      toast.success('Copia de seguridad descargada');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBackupBusy(false);
    }
  };

  const handleRestoreFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const payload = await readBackupFile(file);
      setPendingRestore(payload);
      setRestoreSummary(summarizeBackup(payload));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmRestore = async () => {
    if (!pendingRestore) return;
    setRestoreBusy(true);
    try {
      await restoreBackup(pendingRestore);
      toast.success('Copia restaurada en este dispositivo');
      setPendingRestore(null);
      setRestoreSummary(null);
      if (cloudAvailable) {
        try {
          await forceFullSync();
          toast.success('Datos sincronizados con la nube');
        } catch (error) {
          toast.error(`Restaurado localmente. La sincronización falló: ${getErrorMessage(error)}`);
        }
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRestoreBusy(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await forceFullSync();
      toast.success('Sincronización completada');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount(deleteText);
      toast.success('Cuenta eliminada');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Cuenta"
        title="Perfil y ajustes"
        description="Gestiona tu identidad, preferencias de entrenamiento, copias de seguridad y seguridad de la cuenta."
        actions={
          <>
            <SyncBadge />
            <Button variant="secondary" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </Button>
          </>
        }
      />

      {mode === 'local' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/25 bg-warning/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-semibold">Modo local en este dispositivo</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                Tus datos se guardan en IndexedDB y no salen del navegador. Para multiusuario real y
                sincronización entre equipos, conecta tu proyecto de Supabase con la clave pública.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/setup">
              <Cloud className="h-3.5 w-3.5" /> Conectar Supabase
            </Link>
          </Button>
        </div>
      )}

      <Tabs defaultValue="profile">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="profile">
            <UserRound className="h-3.5 w-3.5" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Palette className="h-3.5 w-3.5" /> Preferencias
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database className="h-3.5 w-3.5" /> Datos
          </TabsTrigger>
          <TabsTrigger value="security">
            <ShieldCheck className="h-3.5 w-3.5" /> Seguridad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-accent" /> Identidad
                </CardTitle>
                <p className="text-xs text-muted">
                  El nombre se usa en tu perfil y en los metadatos de la cuenta.
                </p>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={submitProfile(handleProfileSave)}>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border border-border">
                      {avatarValue ? <AvatarImage src={avatarValue} alt={displayNameValue} /> : null}
                      <AvatarFallback className="text-lg">
                        {initials(displayNameValue || user?.displayName || 'Atleta')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-semibold">
                        {displayNameValue || 'Tu nombre'}
                      </p>
                      <p className="truncate text-xs text-muted">{user?.email}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge variant={mode === 'cloud' ? 'success' : 'warning'}>
                          {mode === 'cloud' ? (
                            <>
                              <Cloud className="h-3 w-3" /> Cuenta en la nube
                            </>
                          ) : (
                            <>
                              <Smartphone className="h-3 w-3" /> Cuenta local
                            </>
                          )}
                        </Badge>
                        {profile?.createdAt && (
                          <Badge variant="secondary">
                            <CalendarDays className="h-3 w-3" /> Desde {formatLongDate(profile.createdAt)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="profile-name">Nombre visible</Label>
                    <Input
                      id="profile-name"
                      maxLength={60}
                      autoComplete="name"
                      {...registerProfile('displayName')}
                    />
                    <FieldError>{profileErrors.displayName?.message}</FieldError>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="profile-avatar">URL de foto de perfil</Label>
                    <Input
                      id="profile-avatar"
                      type="url"
                      placeholder="https://…"
                      autoComplete="url"
                      {...registerProfile('avatarUrl')}
                    />
                    <FieldError>{profileErrors.avatarUrl?.message}</FieldError>
                    <p className="text-[10px] text-muted">
                      Opcional. Debe ser una imagen accesible por HTTPS.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="profile-email">Correo electrónico</Label>
                    <Input id="profile-email" value={user?.email ?? ''} disabled readOnly />
                    <p className="text-[10px] text-muted">
                      {mode === 'cloud'
                        ? 'El correo se gestiona desde Supabase Auth y no se puede cambiar aquí.'
                        : 'El correo identifica tu cuenta local en este dispositivo.'}
                    </p>
                  </div>

                  <Button type="submit" loading={savingProfile}>
                    <Save className="h-4 w-4" /> Guardar perfil
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-accent" /> Resumen de tus datos
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Sesiones', value: formatNumber(workouts.length) },
                    { label: 'Finalizadas', value: formatNumber(finishedCount) },
                    { label: 'Rutinas', value: formatNumber(plans.length) },
                    { label: 'Notas', value: formatNumber(notes.length) },
                    { label: 'Ejercicios propios', value: formatNumber(customExerciseCount) },
                    {
                      label: 'Pendientes de sync',
                      value: mode === 'cloud' ? formatNumber(pendingCount) : '—',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-border/70 bg-surface/25 px-3 py-2.5"
                    >
                      <p className="tabular text-lg font-semibold">{item.value}</p>
                      <p className="text-[10px] text-muted">{item.label}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {online ? (
                      <Cloud className="h-4 w-4 text-success" />
                    ) : (
                      <CloudOff className="h-4 w-4 text-warning" />
                    )}{' '}
                    Estado de sincronización
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Modo</span>
                    <span className="font-medium">
                      {mode === 'cloud' ? 'Supabase (nube)' : 'Local (solo dispositivo)'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Conexión</span>
                    <span className={cn('font-medium', online ? 'text-success' : 'text-warning')}>
                      {online ? 'En línea' : 'Sin conexión'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Última sincronización</span>
                    <span className="text-right font-medium">
                      {lastSyncedAt ? formatDateTime(lastSyncedAt) : 'Aún no sincronizado'}
                    </span>
                  </div>
                  {mode === 'cloud' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-1 w-full"
                      loading={syncing}
                      disabled={!online}
                      onClick={() => void handleSyncNow()}
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Sincronizar ahora
                    </Button>
                  ) : (
                    <p className="rounded-lg bg-surface/40 px-2.5 py-2 text-[10px] leading-relaxed text-muted">
                      En modo local no hay servidor. Puedes exportar una copia JSON y restaurarla en
                      otro dispositivo.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preferences">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-accent" /> Entrenamiento
                </CardTitle>
                <p className="text-xs text-muted">Se aplica a nuevas series y cálculos de volumen.</p>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <PreferenceRow
                  title="Unidad de peso"
                  description="El volumen siempre se guarda y compara en kilogramos."
                >
                  <div className="flex rounded-xl border border-border bg-surface/60 p-1">
                    {(['kg', 'lb'] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => void applySettings({ weightUnit: unit })}
                        className={cn(
                          'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors',
                          settings?.weightUnit === unit
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted hover:text-foreground',
                        )}
                      >
                        {WEIGHT_UNIT_LABELS[unit]}
                      </button>
                    ))}
                  </div>
                </PreferenceRow>

                <PreferenceRow
                  title="Descanso predeterminado"
                  description="Segundos que se cargan al iniciar el temporizador de descanso."
                >
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={MIN_REST_SECONDS}
                      max={MAX_REST_SECONDS}
                      value={restDraft}
                      onChange={(event) => setRestDraft(event.target.value)}
                      onBlur={() => void commitRestSeconds()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void commitRestSeconds();
                        }
                      }}
                      aria-label="Segundos de descanso"
                      className="h-9 w-[86px] text-xs"
                    />
                    <span className="text-[11px] text-muted">seg</span>
                  </div>
                </PreferenceRow>

                <div className="flex flex-wrap gap-1.5">
                  {REST_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setRestDraft(String(preset));
                        void applySettings({ restSeconds: preset });
                      }}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors',
                        settings?.restSeconds === preset
                          ? 'border-accent/40 bg-accent/10 text-accent'
                          : 'border-border bg-surface/40 text-muted hover:text-foreground',
                      )}
                    >
                      {preset}s
                    </button>
                  ))}
                </div>

                <PreferenceRow
                  title="Iniciar descanso automáticamente"
                  description="Al completar una serie se abre el temporizador con el descanso de esa serie."
                >
                  <Switch
                    checked={settings?.autoRest ?? true}
                    onCheckedChange={(checked) => void applySettings({ autoRest: checked })}
                    aria-label="Iniciar descanso automáticamente"
                  />
                </PreferenceRow>

                <PreferenceRow
                  title="Sonido al terminar el descanso"
                  description="Reproduce una señal breve cuando el temporizador llega a cero."
                >
                  <Switch
                    checked={settings?.soundEnabled ?? true}
                    onCheckedChange={(checked) => void applySettings({ soundEnabled: checked })}
                    aria-label="Sonido al terminar el descanso"
                  />
                </PreferenceRow>

                <PreferenceRow
                  title="Notificaciones del sistema"
                  description="Aviso del navegador al completar un descanso, útil con la pestaña en segundo plano."
                >
                  <div className="flex items-center gap-2">
                    {notificationBusy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />}
                    <Switch
                      checked={settings?.notificationsEnabled ?? false}
                      disabled={notificationBusy}
                      onCheckedChange={(checked) => void handleNotifications(checked)}
                      aria-label="Notificaciones del sistema"
                    />
                  </div>
                </PreferenceRow>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-accent" /> Apariencia
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <PreferenceRow
                    title="Tema"
                    description="El modo oscuro es el predeterminado; el claro se guarda en tu cuenta."
                  >
                    <div className="flex rounded-xl border border-border bg-surface/60 p-1">
                      <button
                        type="button"
                        onClick={() => void applySettings({ theme: 'dark' })}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                          settings?.theme !== 'light'
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted hover:text-foreground',
                        )}
                      >
                        <Moon className="h-3.5 w-3.5" /> Oscuro
                      </button>
                      <button
                        type="button"
                        onClick={() => void applySettings({ theme: 'light' })}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                          settings?.theme === 'light'
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted hover:text-foreground',
                        )}
                      >
                        <Sun className="h-3.5 w-3.5" /> Claro
                      </button>
                    </div>
                  </PreferenceRow>

                  <PreferenceRow
                    title="Formato de fecha"
                    description="Se usa en listados, detalles y exportaciones cuando corresponde."
                  >
                    <Select
                      value={settings?.dateFormat ?? 'dd/MM/yyyy'}
                      onChange={(event) =>
                        void applySettings({
                          dateFormat: event.target.value as typeof DATE_FORMAT_OPTIONS[number]['value'],
                        })
                      }
                      aria-label="Formato de fecha"
                      className="h-9 w-[160px] text-xs"
                    >
                      {DATE_FORMAT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </PreferenceRow>
                </CardContent>
              </Card>

              <Card className="border-accent/20 bg-accent/[0.02]">
                <CardContent className="flex items-start gap-3 p-4">
                  <Zap className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <p className="text-sm font-semibold">Preferencias guardadas al instante</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">
                      Cada cambio se guarda en tu base local y se encola para Supabase cuando la nube
                      está activa. No hay botón de “guardar” que pueda dejar cambios a medias.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="data">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-accent" /> Copia de seguridad completa
                </CardTitle>
                <p className="text-xs text-muted">
                  Perfil, ajustes, ejercicios propios, rutinas, sesiones, series, favoritos, notas y
                  días de descanso.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-border/70 bg-surface/25 p-3 text-[11px] leading-relaxed text-muted">
                  El archivo JSON conserva los identificadores y puede restaurarse en esta u otra
                  cuenta. Al restaurar, la propiedad de todos los registros se reasigna a tu usuario
                  activo; nunca se escriben datos a nombre de otra cuenta.
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button loading={backupBusy} onClick={() => void handleBackup()}>
                    <Download className="h-4 w-4" /> Descargar copia JSON
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={restoreBusy}
                  >
                    <Upload className="h-4 w-4" /> Restaurar copia
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="sr-only"
                    onChange={(event) => void handleRestoreFile(event.target.files?.[0])}
                  />
                </div>
                <p className="text-[10px] text-muted">
                  Tamaño máximo del archivo: 25 MB. La restauración reemplaza los datos locales
                  actuales de esta cuenta.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-accent" /> Exportar historial CSV
                </CardTitle>
                <p className="text-xs text-muted">
                  Una fila por entrenamiento finalizado, con duración, series, repeticiones y volumen
                  efectivo.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl border border-border/70 bg-surface/25 p-3">
                    <p className="tabular text-xl font-semibold">{formatNumber(finishedCount)}</p>
                    <p className="text-[10px] text-muted">sesiones exportables</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-surface/25 p-3">
                    <p className="tabular text-xl font-semibold">
                      {formatNumber(notes.length + plans.length + customExerciseCount)}
                    </p>
                    <p className="text-[10px] text-muted">notas, rutinas y ejercicios</p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  disabled={finishedCount === 0}
                  onClick={() =>
                    exportWorkoutsCsv(workoutsWithDetails.filter(isFinished))
                  }
                >
                  <Download className="h-4 w-4" /> Descargar CSV del historial
                </Button>
                <p className="text-[10px] leading-relaxed text-muted">
                  El CSV usa punto y coma como separador y UTF-8 con BOM para abrirse correctamente en
                  Excel en español.
                </p>
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-accent" /> Almacenamiento y sincronización
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/70 bg-surface/25 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted">
                    <HardDrive className="h-3.5 w-3.5" /> Base local
                  </p>
                  <p className="mt-1 text-sm font-semibold">IndexedDB · Dexie</p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    Una base aislada por usuario en este navegador.
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-surface/25 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted">
                    <Cloud className="h-3.5 w-3.5" /> Nube
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {mode === 'cloud' ? 'Supabase conectado' : 'No configurado'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {mode === 'cloud'
                      ? 'RLS protege cada fila por propietario.'
                      : 'Conecta URL y clave pública para activar multiusuario.'}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-surface/25 p-3">
                  <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted">
                    <RefreshCw className="h-3.5 w-3.5" /> Cola pendiente
                  </p>
                  <p className="tabular mt-1 text-sm font-semibold">
                    {mode === 'cloud' ? `${pendingCount} operaciones` : 'Solo local'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {mode === 'cloud'
                      ? 'Se reintenta al recuperar conexión o al abrir la app.'
                      : 'No se envía nada a ningún servidor.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-accent" /> Cambiar contraseña
                </CardTitle>
                <p className="text-xs text-muted">
                  {mode === 'cloud'
                    ? 'Supabase Auth actualiza la contraseña de tu cuenta en la nube.'
                    : 'La contraseña local se deriva con PBKDF2-SHA256 y nunca se guarda en claro.'}
                </p>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={submitPassword(handlePasswordSave)}>
                  {mode === 'local' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="current-password">Contraseña actual</Label>
                      <PasswordField
                        id="current-password"
                        autoComplete="current-password"
                        {...registerPassword('currentPassword')}
                      />
                      <FieldError>{passwordErrors.currentPassword?.message}</FieldError>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">Contraseña nueva</Label>
                    <PasswordField
                      id="new-password"
                      autoComplete="new-password"
                      {...registerPassword('password')}
                    />
                    <FieldError>{passwordErrors.password?.message}</FieldError>
                    <p className="text-[10px] text-muted">
                      Mínimo 8 caracteres, con al menos una letra y un número.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Repetir contraseña nueva</Label>
                    <PasswordField
                      id="confirm-password"
                      autoComplete="new-password"
                      {...registerPassword('confirmPassword')}
                    />
                    <FieldError>{passwordErrors.confirmPassword?.message}</FieldError>
                  </div>
                  <Button type="submit" loading={savingPassword}>
                    <Check className="h-4 w-4" /> Actualizar contraseña
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-accent" /> Sesión y dispositivos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Cuenta</span>
                    <span className="text-right font-medium">{user?.email}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Tipo</span>
                    <span className="font-medium">
                      {mode === 'cloud' ? 'Supabase Auth' : 'Vault local del navegador'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Datos en</span>
                    <span className="font-medium">
                      {mode === 'cloud' ? 'IndexedDB + Supabase' : 'Solo IndexedDB'}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-1 w-full"
                    onClick={() => void signOut()}
                  >
                    <LogOut className="h-3.5 w-3.5" /> Cerrar sesión en este dispositivo
                  </Button>
                  {mode === 'cloud' && (
                    <Button asChild variant="ghost" size="sm" className="w-full">
                      <Link to="/forgot-password">
                        <KeyRound className="h-3.5 w-3.5" /> Enviar correo de recuperación
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="border-danger/25 bg-danger/[0.02]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-danger">
                    <AlertTriangle className="h-4 w-4" /> Zona de peligro
                  </CardTitle>
                  <p className="text-xs leading-relaxed text-muted">
                    Eliminar la cuenta borra permanentemente tus datos de este dispositivo y, en modo
                    nube, ejecuta la función segura <code className="text-foreground">delete_own_account</code>{' '}
                    con tu propia sesión.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl border border-danger/20 bg-danger/[0.04] px-3 py-2.5 text-[11px] leading-relaxed text-muted">
                    <span className="flex items-center gap-1.5 font-semibold text-danger">
                      <Trash2 className="h-3.5 w-3.5" /> Esta acción no se puede deshacer
                    </span>
                    Descarga una copia JSON antes de continuar si quieres conservar tu historial.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => void handleBackup()}>
                      <Download className="h-3.5 w-3.5" /> Descargar copia
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setDeleteText('');
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar mi cuenta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={Boolean(pendingRestore)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRestore(null);
            setRestoreSummary(null);
          }
        }}
        title="Restaurar copia de seguridad"
        description="Se reemplazarán los datos locales de tu cuenta actual. La copia se reasigna a tu usuario y, si la nube está activa, se reconciliará con Supabase."
        confirmLabel="Restaurar y reemplazar"
        destructive
        loading={restoreBusy}
        onConfirm={confirmRestore}
      >
        {restoreSummary && (
          <div className="space-y-1.5 rounded-xl border border-border bg-surface/30 p-3 text-[11px]">
            <div className="flex justify-between gap-2">
              <span className="text-muted">Exportada</span>
              <span className="font-medium">{formatDateTime(restoreSummary.exportedAt)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted">Origen</span>
              <span className="font-medium">
                {restoreSummary.mode === 'cloud' ? 'Supabase' : 'Modo local'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted">Contenido</span>
              <span className="text-right font-medium">
                {restoreSummary.workouts} sesiones · {restoreSummary.plans} rutinas ·{' '}
                {restoreSummary.notes} notas
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted">Extras</span>
              <span className="text-right font-medium">
                {restoreSummary.customExercises} ejercicios propios · {restoreSummary.restDays} días
                de descanso
              </span>
            </div>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteOpen(false);
            setDeleteText('');
          }
        }}
        title="Eliminar cuenta definitivamente"
        description="Se borrarán tu perfil, ajustes, rutinas, entrenamientos, series, notas, favoritos y ejercicios personalizados. No se puede deshacer."
        confirmLabel="Eliminar mi cuenta"
        destructive
        loading={deleting}
        onConfirm={handleDeleteAccount}
      >
        <div className="space-y-1.5">
          <Label htmlFor="delete-confirmation">
            Escribe <span className="font-bold text-danger">ELIMINAR</span> para confirmar
          </Label>
          <Input
            id="delete-confirmation"
            value={deleteText}
            onChange={(event) => setDeleteText(event.target.value)}
            autoComplete="off"
            placeholder="ELIMINAR"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
