export function getErrorMessage(error: unknown, fallback = 'Ha ocurrido un error inesperado.'): string {
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const candidate = error as { message?: unknown; error_description?: unknown; details?: unknown };
    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return translateError(candidate.message);
    }
    if (typeof candidate.error_description === 'string') {
      return translateError(candidate.error_description);
    }
  }
  return fallback;
}

export function translateError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (normalized.includes('email not confirmed')) {
    return 'Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.';
  }
  if (normalized.includes('user already registered') || normalized.includes('already been registered')) {
    return 'Ya existe una cuenta con este correo electrónico.';
  }
  if (normalized.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (normalized.includes('weak password')) {
    return 'La contraseña es demasiado débil. Usa al menos 8 caracteres con letras y números.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.';
  }
  if (normalized.includes('invalid email') || normalized.includes('unable to validate email')) {
    return 'El correo electrónico no es válido.';
  }
  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed')
  ) {
    return 'No se pudo conectar con el servidor. Comprueba tu conexión a Internet.';
  }
  if (normalized.includes('jwt expired') || normalized.includes('session expired')) {
    return 'Tu sesión ha caducado. Inicia sesión de nuevo.';
  }
  if (normalized.includes('row-level security') || normalized.includes('permission denied')) {
    return 'No tienes permisos para realizar esta acción.';
  }
  if (normalized.includes('duplicate key')) return 'Ya existe un registro con esos datos.';
  return message;
}
