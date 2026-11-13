import { afterAll, describe, expect, it } from 'vitest';
import {
  clearLocalSession,
  countLocalAccounts,
  deleteLocalAccount,
  getLocalSession,
  loginLocalAccount,
  registerLocalAccount,
  updateLocalPassword,
} from '@/database/authDb';

const email = `test-${Date.now()}@hecofit.test`;
const password = 'Heco2026fit';
let userId = '';

afterAll(async () => {
  clearLocalSession();
  if (userId) {
    try {
      await deleteLocalAccount(userId);
    } catch {
      // La cuenta ya pudo eliminarse en el propio test.
    }
  }
});

describe('vault de autenticación local', () => {
  it('registra una cuenta y crea una sesión persistente', async () => {
    const before = await countLocalAccounts();
    const user = await registerLocalAccount({
      displayName: 'Atleta de prueba',
      email,
      password,
    });
    userId = user.id;
    expect(user.email).toBe(email);
    expect(user.displayName).toBe('Atleta de prueba');
    expect(await countLocalAccounts()).toBe(before + 1);

    const session = await getLocalSession();
    expect(session?.id).toBe(user.id);
  });

  it('rechaza correos duplicados', async () => {
    await expect(
      registerLocalAccount({ displayName: 'Otro', email, password }),
    ).rejects.toThrow(/Ya existe/);
  });

  it('inicia sesión con la contraseña correcta y rechaza la incorrecta', async () => {
    const user = await loginLocalAccount({ email, password });
    expect(user.id).toBe(userId);
    await expect(
      loginLocalAccount({ email, password: 'Incorrecta2026' }),
    ).rejects.toThrow(/Correo o contraseña incorrectos/);
  });

  it('cambia la contraseña local y permite entrar con la nueva', async () => {
    await updateLocalPassword(userId, password, 'Nueva2026fit');
    await expect(loginLocalAccount({ email, password })).rejects.toThrow();
    const user = await loginLocalAccount({ email, password: 'Nueva2026fit' });
    expect(user.id).toBe(userId);
  });

  it('elimina la cuenta y su sesión', async () => {
    await deleteLocalAccount(userId);
    clearLocalSession();
    expect(await getLocalSession()).toBeNull();
    await expect(loginLocalAccount({ email, password: 'Nueva2026fit' })).rejects.toThrow();
    userId = '';
  });
});
