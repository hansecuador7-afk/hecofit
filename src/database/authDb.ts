import Dexie, { type Table } from 'dexie';
import { getNameFromEmail, newId, nowIso } from '@/lib/utils';
import type { LocalAccount, SessionUser } from '@/types/models';

class AuthDatabase extends Dexie {
  accounts!: Table<LocalAccount, string>;

  constructor() {
    super('hecofit-auth');
    this.version(1).stores({
      accounts: 'id, &email, createdAt',
    });
  }
}

const authDb = new AuthDatabase();
const LOCAL_SESSION_KEY = 'hecofit:local-session';
const PBKDF2_ITERATIONS = 210_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function derivePassword(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      'Tu navegador no permite el cifrado local seguro. Actualiza el navegador o utiliza el modo en la nube.',
    );
  }
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function storeSession(userId: string): void {
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ userId }));
}

function toSessionUser(account: LocalAccount): SessionUser {
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    avatarUrl: null,
    createdAt: account.createdAt,
  };
}

export async function registerLocalAccount(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<SessionUser> {
  const email = normalizeEmail(input.email);
  const existing = await authDb.accounts.where('email').equals(email).first();
  if (existing) throw new Error('Ya existe una cuenta local con este correo electrónico.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await derivePassword(input.password, salt, PBKDF2_ITERATIONS);
  const account: LocalAccount = {
    id: newId(),
    email,
    displayName: input.displayName.trim() || getNameFromEmail(email),
    salt: bytesToBase64(salt),
    passwordHash,
    iterations: PBKDF2_ITERATIONS,
    createdAt: nowIso(),
  };
  await authDb.accounts.add(account);
  storeSession(account.id);
  return toSessionUser(account);
}

export async function loginLocalAccount(input: {
  email: string;
  password: string;
}): Promise<SessionUser> {
  const email = normalizeEmail(input.email);
  const account = await authDb.accounts.where('email').equals(email).first();
  if (!account) throw new Error('Correo o contraseña incorrectos.');
  const salt = base64ToBytes(account.salt);
  const hash = await derivePassword(input.password, salt, account.iterations);
  if (hash !== account.passwordHash) throw new Error('Correo o contraseña incorrectos.');
  storeSession(account.id);
  return toSessionUser(account);
}

export async function getLocalSession(): Promise<SessionUser | null> {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: string };
    if (!parsed.userId) return null;
    const account = await authDb.accounts.get(parsed.userId);
    return account ? toSessionUser(account) : null;
  } catch {
    return null;
  }
}

export function clearLocalSession(): void {
  localStorage.removeItem(LOCAL_SESSION_KEY);
}

export async function updateLocalDisplayName(userId: string, displayName: string): Promise<void> {
  await authDb.accounts.update(userId, { displayName });
}

export async function updateLocalPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const account = await authDb.accounts.get(userId);
  if (!account) throw new Error('La cuenta local no existe.');
  const salt = base64ToBytes(account.salt);
  const hash = await derivePassword(currentPassword, salt, account.iterations);
  if (hash !== account.passwordHash) throw new Error('La contraseña actual no es correcta.');
  const newSalt = crypto.getRandomValues(new Uint8Array(16));
  const newHash = await derivePassword(newPassword, newSalt, PBKDF2_ITERATIONS);
  await authDb.accounts.update(userId, {
    salt: bytesToBase64(newSalt),
    passwordHash: newHash,
    iterations: PBKDF2_ITERATIONS,
  });
}

export async function deleteLocalAccount(userId: string): Promise<void> {
  await authDb.accounts.delete(userId);
  if (localStorage.getItem(LOCAL_SESSION_KEY)?.includes(userId)) {
    clearLocalSession();
  }
}

export async function findLocalAccountByEmail(email: string): Promise<LocalAccount | null> {
  return (await authDb.accounts.where('email').equals(normalizeEmail(email)).first()) ?? null;
}

export async function countLocalAccounts(): Promise<number> {
  return authDb.accounts.count();
}
