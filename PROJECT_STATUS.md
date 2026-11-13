# Estado del proyecto — HECOFIT

**Fecha de verificación:** 13 de noviembre de 2026  
**Versión:** 1.0.0  
**Repositorio:** https://github.com/hansecuador7-afk/hecofit  
**Aplicación:** https://hansecuador7-afk.github.io/hecofit/

## Resumen

HECOFIT es una PWA completa de seguimiento de entrenamiento, construida con React 19, TypeScript estricto, Vite 8, Tailwind 4 y Dexie. Funciona de inmediato en modo local-first y puede conectarse a un proyecto propio de Supabase para autenticación multiusuario y sincronización real.

La instancia pública **no tiene Supabase conectado**. Esto es deliberado: no se incluyen credenciales ni se simula una nube. El modo local es plenamente funcional; la nube se activa con URL y clave pública.

## Verificación técnica

| Comprobación | Resultado |
| --- | --- |
| `npm run typecheck` | ✅ Limpio, sin errores |
| `npm run build` | ✅ Build de producción correcto |
| `npm test` | ✅ 23/23 pruebas en verde |
| `npm run test:e2e` | ✅ 2/2 pruebas E2E en Chromium |
| PWA manifest + service worker | ✅ Generados en `dist/` |
| Iconos 192/512/maskable/apple | ✅ Presentes en `public/` |
| RLS y migración Supabase | ✅ Escritas y revisadas, pendientes de ejecutar en un proyecto real |
| Despliegue GitHub Pages | ✅ Publicado mediante GitHub Actions |

## Módulos completados

### Autenticación y cuenta

- [x] Registro local con PBKDF2-SHA256 (210 000 iteraciones).
- [x] Inicio y cierre de sesión local.
- [x] Registro, login y recuperación por correo con Supabase Auth.
- [x] Cambio de contraseña en ambos modos.
- [x] Perfil editable (nombre y avatar por URL).
- [x] Preferencias: tema, unidad, descanso, sonido, auto-descanso, notificaciones, formato de fecha.
- [x] Eliminación de cuenta con confirmación `ELIMINAR`.
- [x] Guardas de ruta públicas/privadas.

### Entrenamientos

- [x] Crear sesión libre o desde rutina.
- [x] Sesión programada con fecha.
- [x] Iniciar, pausar, reanudar, finalizar y cancelar.
- [x] Añadir y eliminar ejercicios.
- [x] Series con peso, reps, unidad, tipo, descanso y notas.
- [x] Autoguardado y recuperación tras recarga.
- [x] Temporizador de descanso global con sonido y notificación.
- [x] Duplicar sesión.
- [x] Reordenar series.
- [x] Editar nombre, notas y programación.

### Ejercicios y rutinas

- [x] Catálogo de 42 ejercicios con instrucciones.
- [x] Búsqueda y filtros.
- [x] Favoritos.
- [x] Ejercicios personalizados con CRUD.
- [x] Rutinas con días y objetivos.
- [x] Rutina activa.
- [x] Duplicar rutina.
- [x] Reordenar días y ejercicios.
- [x] Crear sesión desde un día.

### Análisis

- [x] Dashboard con métricas reales.
- [x] Historial paginado y detalle.
- [x] Comparación entre sesiones.
- [x] Calendario con sesiones y descansos.
- [x] Progreso por rangos y por ejercicio.
- [x] Gráficas de volumen, carga y 1RM.
- [x] Comparación de periodos.
- [x] Récords por ejercicio.
- [x] Racha semanal y distribución muscular.
- [x] Estados vacíos honestos.

### Datos y offline

- [x] Dexie por usuario.
- [x] Cola persistente de operaciones.
- [x] Sincronización push/pull paginada.
- [x] Indicadores de conexión, estado y pendientes.
- [x] Backup JSON completo.
- [x] Restauración validada con reasignación de propiedad.
- [x] Exportación CSV de historial y sesión.
- [x] Service worker, manifiesto e instalación.
- [x] Funcionamiento sin red.

### Backend

- [x] Migración SQL completa.
- [x] Tablas, FKs, índices y CHECKs.
- [x] RLS por propietario en todas las tablas.
- [x] Triggers de `updated_at`.
- [x] Triggers de validación de vínculos.
- [x] `handle_new_user()`.
- [x] RPC `delete_own_account()`.
- [x] Seed de 42 ejercicios.

## Pruebas

```text
tests/unit/metrics.test.ts          8 pruebas
tests/unit/validation.test.ts       6 pruebas
tests/integration/auth-local.test.ts 5 pruebas
tests/integration/workout-flow.test.ts 4 pruebas
Total: 23 pruebas
```

Cubren cálculos críticos, validación de formularios, vault local y ciclo de vida de un entrenamiento con IndexedDB. Las 2 pruebas E2E cubren registro, persistencia, sesión completa, historial, récords y todas las rutas privadas.

## Despliegue

- Workflow: `.github/workflows/deploy.yml`.
- Disparador: push a `main` o ejecución manual.
- Base path: `/hecofit/`.
- Pages: GitHub Actions como origen.
- Router: `HashRouter`, sin rewrites del servidor.

## Pendiente / no incluido

| Elemento | Estado | Nota |
| --- | --- | --- |
| Supabase real conectado | ⏳ Pendiente | Requiere URL + clave pública del propietario |
| Pruebas RLS contra un proyecto real | ⏳ Pendiente | No hay credenciales en este entorno |
| Pruebas E2E Playwright | ✅ 2 specs | Ejecutables con `npm run test:e2e`; no se ejecutan en CI para mantener el despliegue rápido |
| Sincronización incremental | 🔭 Futuro | Hoy el pull es completo, adecuado para miles de filas |
| Realtime entre dispositivos | 🔭 Futuro | No implementado |
| Recuperación de contraseña local | ❌ No aplica | Solo tiene sentido con un backend de correo |
| Importación desde otras apps | 🔭 Futuro | Solo exportación CSV/JSON |

## Cómo activar la nube

1. Crear un proyecto en Supabase.
2. Ejecutar `supabase/migrations/20261112000000_init.sql` y `supabase/seed.sql`.
3. Configurar Site URL y Redirect URLs.
4. Abrir `/#/setup` en la app publicada y pegar URL + clave `anon`/`publishable`.
5. Verificar registro, sincronización y aislamiento entre dos cuentas.

Detalle completo en [`README.md`](./README.md#conectar-supabase).

## Criterios de aceptación cumplidos

- [x] UI en español, oscura por defecto y clara opcional.
- [x] Paleta y tipografía coherentes con la especificación.
- [x] React + TypeScript estricto + Vite + Tailwind.
- [x] Componentes estilo shadcn, Lucide, Recharts, RHF, Zod, Zustand, TanStack Query, date-fns.
- [x] Supabase real condicionado a credenciales; sin `service_role`.
- [x] RLS multiusuario.
- [x] Offline-first con Dexie y cola persistente.
- [x] UUIDs idempotentes.
- [x] Indicadores de sincronización.
- [x] PWA instalable con manifest y service worker.
- [x] Sin estadísticas inventadas ni botones decorativos.
- [x] Validación, carga, error y vacío en las vistas.
- [x] Exportación, backup, restauración y borrado de cuenta.
- [x] Tests y documentación.
- [x] Publicación en GitHub Pages.

## Registro de cambios

### 1.0.0 — 13/11/2026

- Versión inicial completa.
- 15 rutas de aplicación y 4 rutas de autenticación.
- 42 ejercicios semilla.
- Migración Supabase con RLS.
- 23 pruebas automatizadas.
- Despliegue en GitHub Pages.
