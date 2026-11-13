# Arquitectura de HECOFIT

Este documento describe cómo está construida la aplicación, por qué se tomaron ciertas decisiones y dónde están los límites del diseño.

## 1. Principios

1. **Local-first:** la app debe funcionar sin red y sin servidor. IndexedDB es la fuente de lectura de la interfaz.
2. **Nube opcional, no simulada:** Supabase solo se usa si hay credenciales públicas válidas. No hay autenticación falsa ni datos de ejemplo presentados como reales.
3. **Propiedad explícita:** cada entidad conoce a su usuario. La UI nunca mezcla datos de cuentas distintas.
4. **Métricas derivadas:** récords, volumen, rachas y progreso se calculan desde sesiones finalizadas; no se almacenan cifras inventadas.
5. **Fallar de forma visible:** los errores de red, validación y sincronización se muestran y se pueden reintentar.

## 2. Capas

```text
┌─────────────────────────────────────────────────────────────┐
│ Páginas y componentes (features/, components/)              │
│  React 19 · React Router (HashRouter) · RHF + Zod · Recharts│
└───────────────────────────┬─────────────────────────────────┘
                            │ hooks reactivos / servicios
┌───────────────────────────▼─────────────────────────────────┐
│ Dominio y métricas (lib/metrics, lib/dates, types/models)   │
│  funciones puras, sin acceso a red ni a la UI               │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│ Persistencia local (database/, services/sync.ts)            │
│  Dexie por usuario · cola persistente · mappers             │
└───────────────────────────┬─────────────────────────────────┘
                            │ solo si hay configuración nube
┌───────────────────────────▼─────────────────────────────────┐
│ Supabase (Auth + Postgres + RLS + RPC)                      │
└─────────────────────────────────────────────────────────────┘
```

### Responsabilidades

- **`src/features/*`**: pantallas y lógica de interacción. No hablan directamente con Supabase; usan hooks y servicios.
- **`src/hooks/useHecoData.ts`**: consultas reactivas con `useLiveQuery` sobre Dexie. La UI se actualiza al cambiar la base local, incluso si el cambio vino de una sincronización.
- **`src/lib/metrics.ts`**: cálculos puros de totales, volumen, récords, progreso, distribución muscular, rachas y comparaciones.
- **`src/database/db.ts`**: esquema Dexie, base activa por usuario, inicialización del catálogo y cola de operaciones.
- **`src/database/authDb.ts`**: vault de cuentas locales (PBKDF2) y sesión de dispositivo.
- **`src/services/sync.ts`**: guardado de entidades, encolado, push, pull y ciclo de vida del motor.
- **`src/services/mappers.ts`**: traducción entre el modelo de dominio (camelCase) y las filas Postgres (snake_case).
- **`src/lib/supabase.ts`**: validación de URL/clave, configuración de build o runtime y creación del cliente.

## 3. Modelo de datos

Entidades principales:

| Entidad | Propósito | Relaciones |
| --- | --- | --- |
| `Profile` | Identidad visible | 1:1 con usuario |
| `UserSettings` | Preferencias | 1:1 con usuario |
| `Exercise` | Catálogo global o propio | Favoritos, sesiones, rutinas |
| `WorkoutPlan` | Rutina | Días |
| `PlanDay` | Día de rutina | Ejercicios objetivo |
| `PlanExercise` | Objetivo (series/reps/descanso) | Ejercicio global o propio |
| `Workout` | Sesión | Ejercicios de sesión |
| `WorkoutExercise` | Ejercicio dentro de la sesión | Series |
| `WorkoutSet` | Serie registrada | — |
| `Favorite` | Ejercicio marcado | Ejercicio global o propio |
| `Note` | Nota | Sesión, rutina o ejercicio |
| `RestDay` | Día de descanso | Fecha única por usuario |
| `PendingOperation` | Cola de sincronización | Solo local |

### Reglas de integridad

- Los IDs son **UUID v4** generados en el cliente (`newId()`), lo que hace las escrituras idempotentes y permite crear datos offline.
- Una sesión pertenece a un usuario; sus ejercicios y series se validan a través de la sesión.
- Un ejercicio de sesión/rutina apunta a un ejercicio global **o** a uno propio, nunca a ambos.
- Las notas y favoritos validan que el destino pertenezca al mismo usuario.
- El volumen se normaliza a kilogramos en los cálculos; la unidad original se conserva en la serie.
- Los calentamientos y aproximaciones se excluyen del volumen efectivo, pero siguen visibles en el detalle.

### Esquema Dexie

Una base por usuario: `hecofit-user-${userId}`. Tablas e índices principales:

```text
profiles(id)
settings(userId)
exercises(id, name, primaryMuscle, source, userId)
plans(id, userId, isActive, updatedAt)
planDays(id, planId, position)
planExercises(id, planDayId, position)
workouts(id, userId, status, startedAt, scheduledAt, updatedAt)
workoutExercises(id, workoutId, position)
workoutSets(id, workoutExerciseId, setNumber)
favorites(id, userId, exerciseId, userExerciseId)
notes(id, userId, noteType, pinned, updatedAt)
restDays(id, userId, date)
pendingOps(id, createdAt, entity, entityId)
meta(key)
```

La separación por base evita fugas accidentales entre cuentas en el mismo navegador y permite borrar una cuenta sin tocar a las demás.

## 4. Autenticación

### Modo local

- Cuenta en `hecofit-auth` con email único normalizado.
- Contraseña derivada con **PBKDF2-SHA256**, sal de 16 bytes y **210 000 iteraciones** mediante Web Crypto.
- Se guarda `passwordHash`, `salt` e iteraciones; nunca la contraseña.
- La sesión activa se guarda en `localStorage` (`hecofit:local-session`) y se valida contra la cuenta.
- Cambio de contraseña exige la contraseña actual.
- Eliminación de cuenta borra la base de datos del usuario y el registro de autenticación.

**Límite:** el vault local protege frente a lectura casual de IndexedDB, pero no frente a un atacante con control del dispositivo o del perfil del navegador. No sustituye a un backend de identidad.

### Modo nube

- Supabase Auth con email/contraseña.
- `onAuthStateChange` mantiene la sesión y activa la base local del usuario.
- Registro con `display_name` en metadatos; el trigger `handle_new_user()` crea perfil y ajustes.
- Recuperación de contraseña por correo con redirección a `?recovery=1`.
- Eliminación mediante RPC `delete_own_account()`; el borrado de `auth.users` propaga por cascada.
- La app rechaza claves `service_role` y `sb_secret_`; solo acepta `anon`/`publishable`.

## 5. Sincronización

### Guardado local

Cada operación de escritura:

1. Actualiza las tablas Dexie en una transacción.
2. Encola una `PendingOperation` con entidad, operación (`upsert`/`delete`), ID y payload.
3. Notifica al motor para programar un push (debounce de ~700 ms).

Las operaciones se **coalescen por entidad e ID**: varias ediciones seguidas de la misma serie no generan una fila por cambio. Las escrituras son idempotentes porque los IDs se generan en cliente y los upserts usan `onConflict: 'id'`.

### Ciclo de sincronización

```text
online / inicio / cada 60 s / visibilidad
                │
                ▼
        ¿hay configuración nube?
          no → estado "local"
          sí → push de pendingOps en orden de creación
                │
                ├─ error → conserva la operación, incrementa attempts,
                │           guarda lastError y muestra estado "error"
                ▼
        pull completo paginado (500 filas por página)
                │
                ▼
        reemplaza las tablas locales con la verdad del servidor
                │
                ▼
        lastSyncedAt + estado "idle"/"pending"
```

Decisiones:

- **Push antes de pull:** los cambios locales pendientes se envían primero; después se descarga el estado del servidor.
- **Servidor autoritativo tras el push:** el pull reemplaza las tablas locales. Si dos dispositivos editan la misma entidad, gana la última escritura que llegó al servidor. No hay merge campo a campo.
- **RLS como autoridad final:** aunque un cliente manipule la cola, Postgres rechaza filas de otro propietario.
- **Reintentos:** la cola es persistente; un error de red no pierde cambios. Se reintenta al recuperar conexión, al volver a la pestaña y en el intervalo periódico.
- **Perfil/ajustes faltantes:** si el servidor no tiene fila (por ejemplo, un usuario creado antes del trigger), el pull encola un upsert con los datos locales.

### Estados visibles

`local`, `offline`, `syncing`, `pending`, `idle`, `error`. El badge de la barra superior y la página de perfil muestran el estado, el número de operaciones pendientes y la última sincronización.

## 6. Métricas

`src/lib/metrics.ts` es la única fuente de verdad para análisis. Todas las funciones son puras y reciben `WorkoutDetail[]`.

- **Volumen efectivo:** `peso_kg × reps` solo para series completadas y de tipo efectivo, drop o fallo. Calentamientos y aproximaciones quedan fuera.
- **Duración:** usa `durationSeconds` de la sesión; si está en curso, el tiempo transcurrido.
- **Récords:** carga máxima (peso convertido a kg), mejor serie por volumen, más repeticiones, 1RM estimado con Epley (`peso × (1 + reps/30)`, solo 1–12 reps) y última sesión.
- **Progreso:** agrupación por fecha para un ejercicio; volumen y carga máxima por sesión.
- **Rachas:** semanas consecutivas con al menos una sesión finalizada.
- **Comparación de periodos:** periodo actual frente al inmediato anterior de igual duración.
- **Distribución muscular:** series efectivas por músculo principal.

No se usan valores de demostración en la interfaz. Si no hay historial, se muestra un estado vacío.

## 7. Copias de seguridad

- **JSON:** incluye perfil, ajustes, ejercicios propios, rutinas, días, ejercicios objetivo, sesiones, series, favoritos, notas y días de descanso.
- **Validación:** Zod valida estructura, tipos, fechas, enums y límites antes de escribir.
- **Restauración:** conserva IDs, pero reasigna `userId` de todas las entidades al usuario activo. Nunca restaura datos a nombre de otra cuenta.
- **Nube:** tras restaurar, encola borrados de entidades ausentes y upserts de las presentes; luego fuerza sincronización.
- **CSV:** historial completo o sesión individual, con separador `;` y BOM UTF-8 para Excel en español.

## 8. PWA y offline

- `vite-plugin-pwa` genera manifiesto y service worker con Workbox.
- Estrategia de precache para el shell y assets; `CacheFirst` para fuentes.
- `registerType: 'autoUpdate'` + registro manual en `src/main.tsx`.
- `navigateFallback: 'index.html'` y `HashRouter` permiten rutas profundas en Pages.
- Iconos 192/512, maskable 512 y apple-touch-icon.
- La app funciona offline en modo local y en modo nube después de la primera carga; las escrituras se encolan.

## 9. Seguridad y amenazas

| Riesgo | Mitigación |
| --- | --- |
| Clave secreta en el frontend | Validación que rechaza `service_role` y `sb_secret_` |
| Lectura de datos ajenos | RLS por propietario en todas las tablas; hijas validan padres |
| Vínculos entre cuentas | Triggers de validación de propiedad |
| Borrado de cuenta ajeno | RPC usa `auth.uid()` y solo se concede a `authenticated` |
| Restauración maliciosa | Validación Zod + reasignación de propiedad + límite de tamaño |
| XSS | React escapa por defecto; no se usa `dangerouslySetInnerHTML` |
| Datos locales | PBKDF2 para contraseñas; limitación frente a acceso físico |

No hay `service_role` en el repositorio ni en el bundle. Las variables `VITE_*` son públicas por definición.

## 10. Decisiones y trade-offs

- **Dexie como fuente de lectura:** UI instantánea y offline real, a cambio de mantener mappers y una cola propia.
- **HashRouter:** evita configurar rewrites en GitHub Pages; las URLs llevan `#/`.
- **Una base por usuario:** aislamiento fuerte y borrado simple; consume más espacio si hay muchas cuentas en un dispositivo.
- **Pull completo:** simple y robusto para el tamaño esperado (miles de filas). Si el historial crece mucho, conviene pasar a sincronización incremental por `updated_at`.
- **Servidor autoritativo:** evita merges complejos; dos dispositivos que editan la misma entidad pueden perder la edición más antigua.
- **Catálogo por seed:** los ejercicios globales no se editan desde el cliente; se versionan con la base de datos.

## 11. Extensiones futuras

- Sincronización incremental y resolución de conflictos por campo.
- Suscripciones Realtime para cambios entre dispositivos.
- Importación desde CSV/Hevy/Strong.
- Tests E2E de Playwright en CI con navegador instalado.
- Internacionalización (la UI está en español, pero las cadenas están dispersas).
- Migración a un monorepo con paquete de dominio compartido.
