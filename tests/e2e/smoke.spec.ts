import { expect, test } from '@playwright/test';

test('registro local, inicio de sesión y persistencia tras recargar', async ({ page }) => {
  const email = `e2e-${Date.now()}@hecofit.test`;

  await page.goto('/#/register');
  await expect(page.getByRole('heading', { name: 'Empieza a medir lo que importa' })).toBeVisible();

  await page.getByLabel('Nombre visible').fill('Atleta E2E');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('Heco2026fit');
  await page.getByLabel('Repite la contraseña').fill('Heco2026fit');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Crear mi cuenta/ }).click();

  await expect(page.getByRole('heading', { name: 'Hola, Atleta' })).toBeVisible();

  await page.getByRole('link', { name: /Empezar entrenamiento/ }).click();
  await expect(page).toHaveURL(/#\/workouts\/new$/);
  await page.getByRole('button', { name: /Iniciar entrenamiento/ }).click();

  await expect(page).toHaveURL(/#\/workouts\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: 'Entrenamiento libre' })).toBeVisible();
  await expect(page.getByText('En directo')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Entrenamiento libre' })).toBeVisible();
  await expect(page.getByText('En directo')).toBeVisible();

  await page.getByRole('button', { name: 'Añadir ejercicio', exact: true }).click();
  await page.getByPlaceholder('Buscar por nombre o descripción…').fill('Press banca con barra');
  await page.getByRole('button', { name: /Press banca con barra/ }).click();
  await expect(page.getByRole('heading', { name: 'Press banca con barra' })).toBeVisible();

  await page.getByLabel('Peso de la serie 1').fill('100');
  await page.getByLabel('Repeticiones de la serie 1').fill('5');
  const completedCheckbox = page
    .getByLabel('Marcar serie 1 como completada')
    .filter({ visible: true });
  await completedCheckbox.click();
  await expect(completedCheckbox).toBeChecked();

  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await page.getByRole('button', { name: 'Finalizar sesión' }).click();
  await expect(page).toHaveURL(/#\/history\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: 'Entrenamiento libre' })).toBeVisible();
  await expect(page.getByText('500 kg').first()).toBeVisible();

  await page.goto('/#/records');
  await expect(page.getByRole('heading', { name: 'Récords' })).toBeVisible();
  await expect(page.getByText('Press banca con barra').first()).toBeVisible();
  await expect(page.getByText(/116[.,]7 kg/).first()).toBeVisible();
});

test('todas las rutas privadas renderizan sin error de interfaz', async ({ page }) => {
  const email = `e2e-routes-${Date.now()}@hecofit.test`;

  await page.goto('/#/register');
  await page.getByLabel('Nombre visible').fill('Atleta Rutas');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('Heco2026fit');
  await page.getByLabel('Repite la contraseña').fill('Heco2026fit');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Crear mi cuenta/ }).click();
  await expect(page.getByRole('heading', { name: 'Hola, Atleta' })).toBeVisible();

  const routes: Array<[string, string]> = [
    ['/workouts', 'Tus sesiones'],
    ['/exercises', 'Ejercicios'],
    ['/routines', 'Rutinas'],
    ['/calendar', 'Calendario'],
    ['/history', 'Historial'],
    ['/progress', 'Progreso'],
    ['/records', 'Récords'],
    ['/notes', 'Notas'],
    ['/profile', 'Perfil y ajustes'],
  ];

  for (const [path, heading] of routes) {
    await page.goto(`/#${path}`);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Algo no ha ido bien' })).toHaveCount(0);
  }
});
