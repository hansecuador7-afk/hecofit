import { describe, expect, it } from 'vitest';
import { passwordSchema, registerSchema } from '@/features/auth/schemas';
import { dateKey, formatDateByPreference } from '@/lib/dates';
import { fromKg, formatNumber, toKg } from '@/lib/utils';

describe('validación de contraseñas', () => {
  it('acepta una contraseña válida', () => {
    expect(passwordSchema.safeParse('Heco2026fit').success).toBe(true);
  });

  it('rechaza contraseñas cortas, sin letras o sin números', () => {
    expect(passwordSchema.safeParse('Ab1').success).toBe(false);
    expect(passwordSchema.safeParse('12345678').success).toBe(false);
    expect(passwordSchema.safeParse('abcdefgh').success).toBe(false);
  });

  it('valida confirmación y condiciones en el registro', () => {
    const result = registerSchema.safeParse({
      displayName: 'Hans',
      email: 'hans@example.com',
      password: 'Heco2026fit',
      confirmPassword: 'Heco2026fit',
      acceptTerms: true,
    });
    expect(result.success).toBe(true);
    const mismatch = registerSchema.safeParse({
      displayName: 'Hans',
      email: 'hans@example.com',
      password: 'Heco2026fit',
      confirmPassword: 'Otra2026fit',
      acceptTerms: true,
    });
    expect(mismatch.success).toBe(false);
  });
});

describe('unidades y fechas', () => {
  it('convierte kg a lb y de vuelta', () => {
    expect(toKg(220.46226218, 'lb')).toBeCloseTo(100, 6);
    expect(fromKg(100, 'lb')).toBeCloseTo(220.46226218, 6);
    expect(toKg(100, 'kg')).toBe(100);
  });

  it('formatea números con separadores españoles', () => {
    expect(formatNumber(12345.56)).toMatch(/12[.\s]346/);
    expect(formatNumber(12345.56, 1)).toMatch(/12[.\s]345,6/);
  });

  it('genera claves de fecha estables y respeta el formato elegido', () => {
    expect(dateKey('2026-11-13T23:30:00.000Z')).toMatch(/^2026-11-1[34]$/);
    expect(formatDateByPreference('2026-11-13T12:00:00.000Z', 'dd/MM/yyyy')).toBe('13/11/2026');
    expect(formatDateByPreference('2026-11-13T12:00:00.000Z', 'yyyy-MM-dd')).toBe('2026-11-13');
  });
});
