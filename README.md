# HECOFIT

**Entrenamiento inteligente, datos reales.** PWA en español para registrar entrenamientos, organizar rutinas y analizar progreso físico con métricas calculadas exclusivamente a partir de tu historial.

- **Aplicación publicada:** https://hansecuador7-afk.github.io/hecofit/
- **Modo por defecto:** local-first (IndexedDB en tu dispositivo, sin cuenta ni servidor).
- **Modo nube opcional:** Supabase Auth + Postgres con RLS por propietario.
- **Instalable:** manifiesto PWA, service worker y funcionamiento offline.

> Importante: el despliegue público funciona de inmediato en modo local. La nube multiusuario solo se activa cuando conectas tu propio proyecto de Supabase con su URL y clave pública. Este repositorio no incluye credenciales.

---

## Contenido

- [Funcionalidades](#funcionalidades)
- [Inicio rápido](#inicio-rápido)
- [Modos de uso](#modos-de-uso)
- [Conectar Supabase](#conectar-supabase)
- [Variables de entorno](#variables-de-entorno)
- [Scripts](#scripts)
- [Pruebas](#pruebas)
- [Despliegue en GitHub Pages](#despliegue-en-github-pages)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Privacidad y seguridad](#privacidad-y-seguridad)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Documentación adicional](#documentación-adicional)

---

## Funcionalidades

### Entrenamiento

- Sesión libre o creada desde un día de rutina.
- Series con peso, repeticiones, unidad (kg/lb), tipo (efectiva, calentamiento, aproximación, drop, fallo, personalizada), descanso y notas.
- Temporizador de descanso global con pausa, reanudación, +15 s, reinicio y cierre.
- Sonido y notificación del navegador al terminar el descanso (opcionales).
- Autoguardado en cada cambio; la sesión sobrevive a recargas y pérdida de conexión.
- Inicio, pausa, reanudación, finalización y cancelación de sesiones.
- Duplicar sesiones, añadir/eliminar ejercicios y reordenar series.
- Entrenamientos programados y edición de nombre/notas/fecha.

### Biblioteca y rutinas

- Catálogo global de 42 ejercicios con músculo principal, secundarios, equipamiento, dificultad e instrucciones.
- Búsqueda y filtros por músculo, equipamiento y dificultad.
- Favoritos y ejercicios personalizados con CRUD completo.
- Rutinas con días, ejercicios objetivo, series, rango de repeticiones, descanso y notas.
- Rutina activa, duplicado de rutinas y reordenación de días/ejercicios.
- Creación de una sesión desde cualquier día de rutina.

### Análisis

- Dashboard con sesiones, volumen efectivo, tiempo, series, repeticiones, racha semanal y distribución muscular.
- Historial paginado con detalle de series, comparación entre sesiones y duplicado.
- Progreso por rango (7/30/90/180/365 días, personalizado o todo) y por ejercicio.
- Gráficas de volumen semanal, carga máxima, 1RM estimado (Epley, 1–12 reps) y comparación de periodos.
- Récords reales por ejercicio: carga máxima, mejor serie, más repeticiones, 1RM estimado, sesiones y volumen.
- Calendario mensual con sesiones y días de descanso.
- Notas vinculables a sesiones, rutinas o ejercicios.

### Cuenta y datos

- Registro, inicio de sesión, cierre de sesión, recuperación de contraseña (nube) y cambio de contraseña.
- Perfil editable, tema oscuro/claro, unidad de peso, descanso, sonido, notificaciones y formato de fecha.
- Exportación JSON completa y restauración validada con reasignación de propiedad al usuario activo.
- Exportación CSV del historial y de una sesión concreta.
- Eliminación definitiva de cuenta con confirmación escrita.
- Indicadores de conexión, sincronización y operaciones pendientes.

### Experiencia

- Interfaz responsive con navegación lateral en escritorio y barra inferior en móvil.
- Tema oscuro por defecto, tema claro opcional.
- Estados de carga, error, vacío y reintento en todas las vistas de datos.
- Accesibilidad básica: foco visible, etiquetas, roles, navegación por teclado y `aria-label`.
- PWA instalable con actualización automática del service worker.

---

## Inicio rápido

Requisitos: **Node.js 22+** y npm.

```bash
git clone https://github.com/hansecuador7-afk/hecofit.git
cd hecofit
npm ci
npm run dev
```

Abre `http://localhost:5173`. Sin configuración adicional, la app arranca en modo local: crea una cuenta en `/#/register` y empieza a registrar entrenamientos.

Para probar el build de producción:

```bash
npm run build
npm run preview
```

---

## Modos de uso

### Modo local (predeterminado)

- La cuenta se guarda en IndexedDB (`hecofit-auth`).
- La contraseña se deriva con **PBKDF2-SHA256, 210 000 iteraciones** y sal aleatoria; nunca se almacena en claro.
- Los datos de cada usuario viven en una base Dexie aislada: `hecofit-user-${userId}`.
- No se envía nada a ningún servidor.
- Los datos solo existen en ese navegador y dispositivo. Para moverlos, usa la copia JSON del perfil.

### Modo nube (Supabase)

Se activa automáticamente si existen credenciales en tiempo de compilación o si se guardan desde `/#/setup`.

- Autenticación real con Supabase Auth.
- Sincronización bidireccional con cola persistente y resolución por última escritura.
- RLS: cada fila solo es accesible por su propietario; las tablas hijas validan la propiedad a través de sus padres.
- La app sigue funcionando offline y sincroniza al recuperar conexión.

La nube **no está conectada** en la instancia pública actual. Sigue la sección siguiente para activarla.

---

## Conectar Supabase

### 1. Crear el proyecto

1. Entra en [supabase.com/dashboard](https://supabase.com/dashboard) y crea un proyecto.
2. Elige una región cercana y guarda la contraseña de la base de datos.
3. Espera a que termine el aprovisionamiento.

### 2. Ejecutar el esquema

En **SQL Editor**, ejecuta en orden:

1. `supabase/migrations/20261112000000_init.sql`
2. `supabase/seed.sql`

La migración crea:

- Tablas: `profiles`, `user_settings`, `exercises`, `user_exercises`, `workout_plans`, `plan_days`, `plan_exercises`, `workouts`, `workout_exercises`, `workout_sets`, `exercise_favorites`, `notes`, `rest_days`.
- Restricciones `CHECK` para enums, rangos y coherencia de vínculos.
- Índices para consultas y claves foráneas.
- Triggers de `updated_at`, validación de propiedad entre entidades y creación automática de perfil/ajustes.
- RLS habilitado en todas las tablas, con políticas por propietario.
- RPC `delete_own_account()` con `security definer` y permisos solo para `authenticated`.
- Catálogo global de ejercicios de solo lectura para usuarios autenticados.

### 3. Configurar Auth

En **Authentication → URL Configuration**:

- **Site URL:** `https://hansecuador7-afk.github.io/hecofit/`
- **Redirect URLs:** añade `https://hansecuador7-afk.github.io/hecofit/?recovery=1` y, para desarrollo, `http://localhost:5173/?recovery=1`.

En **Authentication → Providers → Email**:

- Activa el proveedor de correo.
- Decide si exiges confirmación por correo. Si la desactivas, el registro inicia sesión directamente.
- Para recuperación de contraseña, el correo debe poder enviarse (SMTP propio o el servicio de Supabase).

### 4. Obtener las claves públicas

En **Project Settings → API** copia:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon / publishable key** → `VITE_SUPABASE_ANON_KEY`

Nunca uses `service_role` ni claves `sb_secret_` en el frontend. La app rechaza esas claves de forma explícita.

### 5. Activar la nube

**Opción A — en la app publicada:** abre `/#/setup`, pega la URL y la clave pública y guarda. La configuración queda en `localStorage` de ese navegador.

**Opción B — en el build:** define las variables antes de compilar:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co \
VITE_SUPABASE_ANON_KEY=tu_clave_publica \
VITE_BASE_PATH=/hecofit/ \
npm run build
```

Para GitHub Actions, añade ambas variables como **Repository secrets** y mapéalas en el paso de build del workflow.

### 6. Verificar

1. Abre la app y comprueba que el badge indica nube.
2. Registra una cuenta y confirma el correo si está activado.
3. Crea una sesión, finalízala y revisa la fila en `workouts`.
4. Cierra sesión y entra desde otro navegador: los datos deben descargarse de Supabase.
5. Comprueba que un segundo usuario no puede leer filas del primero (RLS).

---

## Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | No | URL del proyecto Supabase. Sin ella, modo local. |
| `VITE_SUPABASE_ANON_KEY` | No | Clave pública `anon` o `publishable`. Nunca `service_role`. |
| `VITE_BASE_PATH` | No | Ruta base del despliegue. Para este repositorio: `/hecofit/`. Por defecto `/`. |

Copia `.env.example` a `.env.local` para desarrollo. `.env*` está ignorado por git salvo `.env.example`.

---

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo Vite. |
| `npm run build` | Typecheck + build de producción con PWA. |
| `npm run preview` | Sirve el build de producción. |
| `npm run typecheck` | TypeScript estricto sin emitir. |
| `npm test` | Pruebas unitarias e integración con Vitest. |
| `npm run test:watch` | Vitest en modo watch. |
| `npm run test:e2e` | Playwright (requiere `npx playwright install`). |
| `npm run lint` | Alias de typecheck (no hay ESLint configurado). |

---

## Pruebas

```bash
npm test
```

Cobertura actual:

- **Métricas:** volumen efectivo, exclusión de calentamientos/aproximaciones, conversión lb→kg, 1RM Epley, totales, récords, progresión y claves de ejercicio.
- **Validación:** contraseñas, registro, unidades, formato numérico y fechas.
- **Auth local:** registro, duplicados, login, cambio de contraseña y eliminación.
- **Flujo de entrenamiento:** inicialización de IndexedDB, creación de sesión, series, finalización, duplicado y borrado en cascada.

Resultado verificado: **23/23 pruebas unitarias y de integración en verde**, **2/2 pruebas E2E en Chromium**, `npm run typecheck` limpio y build de producción correcto.

Las pruebas usan `fake-indexeddb` y `jsdom`; no tocan datos reales ni Supabase. Las E2E levantan Vite en `127.0.0.1:5173` y validan registro local, inicio de sesión, persistencia tras recarga, ciclo completo de una sesión con series, finalización, historial, récords y renderizado de todas las rutas privadas.

---

## Despliegue en GitHub Pages

El workflow `.github/workflows/deploy.yml` se ejecuta en cada push a `main`:

1. Instala dependencias con `npm ci`.
2. Ejecuta las pruebas.
3. Compila con `VITE_BASE_PATH=/hecofit/`.
4. Publica `dist` como artefacto de Pages.
5. Despliega con `actions/deploy-pages`.

Requisitos en GitHub:

- **Settings → Pages → Build and deployment → Source:** `GitHub Actions`.
- El repositorio debe ser público (o Pages disponible en tu plan).
- Si cambias el nombre del repositorio, actualiza `VITE_BASE_PATH` en el workflow.

La app usa `HashRouter`, por lo que las rutas funcionan en Pages sin reglas de reescritura del servidor.

---

## Estructura del proyecto

```text
hecofit/
├─ .github/workflows/deploy.yml   # CI + GitHub Pages
├─ public/
│  ├─ favicon.svg
│  ├─ apple-touch-icon.png
│  └─ icons/                      # 192, 512 y maskable
├─ src/
│  ├─ components/                 # UI kit, layout y componentes compartidos
│  ├─ database/                   # Dexie, auth local y mapeos
│  ├─ features/                   # auth, dashboard, workouts, routines,
│  │                              # exercises, calendar, history, progress,
│  │                              # records, notes, profile
│  ├─ hooks/                      # datos reactivos (Dexie live queries)
│  ├─ lib/                        # métricas, fechas, constantes, utils, Supabase
│  ├─ services/                   # sincronización, mappers, backup
│  ├─ stores/                     # Zustand (sync, temporizador)
│  └─ types/                      # modelos de dominio
├─ supabase/
│  ├─ migrations/20261112000000_init.sql
│  └─ seed.sql
├─ tests/
│  ├─ unit/
│  └─ integration/
├─ ARCHITECTURE.md
├─ PROJECT_STATUS.md
└─ vite.config.ts
```

---

## Privacidad y seguridad

- **Modo local:** los datos no salen del navegador. La sesión se guarda en `localStorage`; el hash de contraseña y la sal en IndexedDB.
- **Modo nube:** Supabase Auth gestiona identidades; RLS impide leer o escribir filas de otras cuentas. Los triggers validan vínculos entre entidades del mismo propietario.
- **Claves:** solo se admiten claves públicas. `service_role` y `sb_secret_` se rechazan antes de crear el cliente.
- **Backups:** la restauración valida el esquema con Zod, limita el tamaño y reasigna todos los registros al usuario activo. Nunca escribe datos a nombre de otra cuenta.
- **Eliminación:** en local borra la base del usuario y su cuenta; en nube llama a `delete_own_account()`, que elimina `auth.users` y propaga el borrado por cascada.
- **Limitación honesta:** una PWA no puede proteger datos locales frente a un atacante con acceso al dispositivo o al perfil del navegador. Para datos sensibles, usa el modo nube y protege tu dispositivo.

No hay analítica, telemetría, publicidad ni servicios de terceros más allá de Supabase cuando se configura.

---

## Limitaciones conocidas

- La instancia pública **no tiene Supabase conectado**; funciona en local.
- El modo local no sincroniza entre dispositivos; usa backup JSON o conecta Supabase.
- La recuperación de contraseña solo existe en modo nube (requiere correo).
- Las notificaciones dependen de permisos y soporte del navegador; iOS requiere la PWA instalada.
- El temporizador usa tiempo del cliente; no continúa con la app completamente cerrada.
- No hay integración con wearables ni importación desde otras apps.
- El catálogo global es de solo lectura desde el cliente; se administra por migración/seed.

---

## Documentación adicional

- [`ARCHITECTURE.md`](./ARCHITECTURE.md): capas, modelo de datos, sincronización, auth y decisiones.
- [`PROJECT_STATUS.md`](./PROJECT_STATUS.md): estado verificado, cobertura y pendientes.

---

Hecho con React, TypeScript, Vite, Tailwind, Dexie y Supabase.
