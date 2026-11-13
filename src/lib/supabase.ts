import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const CONFIG_KEY = 'hecofit:supabase-config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

function isPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.includes('tu-proyecto') ||
    normalized.includes('tu_clave') ||
    normalized.includes('your-project') ||
    normalized.includes('example.supabase.co')
  );
}

export function isValidPublicKey(key: string): boolean {
  if (isPlaceholder(key) || key.length < 20) return false;
  if (key.startsWith('sb_secret_')) return false;
  if (key.startsWith('sb_publishable_')) return true;
  if (key.split('.').length === 3) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/')));
      return payload.role !== 'service_role';
    } catch {
      return false;
    }
  }
  return false;
}

export function isValidSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname.endsWith('.supabase.co') || url.hostname === 'localhost')
    );
  } catch {
    return false;
  }
}

export function readStoredConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SupabaseConfig>;
    if (
      typeof parsed.url === 'string' &&
      typeof parsed.anonKey === 'string' &&
      isValidSupabaseUrl(parsed.url) &&
      isValidPublicKey(parsed.anonKey)
    ) {
      return { url: parsed.url.replace(/\/$/, ''), anonKey: parsed.anonKey };
    }
  } catch {
    // Configuración corrupta: se ignora y la app continúa en modo local.
  }
  return null;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const envUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (envUrl && envKey && isValidSupabaseUrl(envUrl) && isValidPublicKey(envKey)) {
    return { url: envUrl.replace(/\/$/, ''), anonKey: envKey };
  }
  return readStoredConfig();
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  if (!isValidSupabaseUrl(config.url)) {
    throw new Error('La URL debe ser https://<proyecto>.supabase.co');
  }
  if (!isValidPublicKey(config.anonKey)) {
    throw new Error(
      'La clave pública no es válida. Usa la clave anon o publishable, nunca la service_role.',
    );
  }
  localStorage.setItem(
    CONFIG_KEY,
    JSON.stringify({ url: config.url.replace(/\/$/, ''), anonKey: config.anonKey }),
  );
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}

const config = getSupabaseConfig();

export const supabaseConfig = config;
export const isCloudConfigured = Boolean(config);

export const supabase: SupabaseClient | null = config
  ? createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'hecofit:auth',
      },
      global: {
        headers: { 'x-application-name': 'HECOFIT' },
      },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY o conecta tu proyecto desde Ajustes.',
    );
  }
  return supabase;
}

export function getAuthRedirectUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

export function getRecoveryRedirectUrl(): string {
  return `${getAuthRedirectUrl()}?recovery=1`;
}
