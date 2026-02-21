# Runbook Local

## 1) Requisitos

- Node.js 20+
- npm
- (Opcional) Supabase CLI para backend local

## 2) Configuracion inicial

1. Instalar dependencias:

```bash
npm install
```

2. Crear variables de entorno locales:

```bash
cp .env.local.example .env.local
```

3. Completar en `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (recomendado) o `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (si aplica para scripts admin)

## 3) Levantar servicios

## Opcion A: comando directo

```bash
npm run dev
```

## Opcion B: menu operativo (`menu.sh`)

Una accion y salida:

```bash
./menu.sh
```

Menu continuo:

```bash
./menu.sh menu-loop
```

Comandos utiles:

```bash
./menu.sh start
./menu.sh stop
./menu.sh status
./menu.sh show-config
```

Si usas Supabase cloud, puedes dejar backend desactivado en el menu.
Si usas Supabase local, configura backend con opcion 11 o con:

```bash
./menu.sh config-backend
```

## 4) Migraciones de base de datos

Con Supabase CLI disponible:

```bash
supabase db push
```

Nota: usa `supabase db reset` solo en entornos desechables, porque es destructivo.

## 5) Checks de calidad antes de abrir PR

```bash
npm run vercel:preflight
npm run lint
npm run test
npm run build
```

## 6) Pruebas

Unitarias:

```bash
npm run test:unit
```

Integracion (requiere credenciales de test):

```bash
npm run test:integration
```

E2E:

```bash
npm run test:e2e:install
npm run test:e2e:smoke
npm run test:e2e:a11y
npm run test:e2e:auth
```

Variables para integracion:

- `TEST_SUPABASE_URL` (opcional)
- `TEST_SUPABASE_ANON_KEY` (opcional)
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

Variables para e2e full:

- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`

## 7) Seed de datos de testing

Para generar una organizacion completa de prueba (cuentas, transacciones, presupuesto y forecast):

```bash
npm run seed:test
```

Variables requeridas:

- `TEST_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_URL`
- `TEST_SUPABASE_ANON_KEY` o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` o `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

## 8) Validaciones de Supabase remoto

Verificacion de tablas/RPC/auth en tu proyecto cloud:

```bash
npm run supabase:check:remote
```

Aplicar migraciones cloud y validar en un solo paso:

```bash
SUPABASE_PROJECT_REF=tu-project-ref \
SUPABASE_DB_PASSWORD=... \
SUPABASE_ACCESS_TOKEN=... \
npm run supabase:migrate:remote
```

Sincronizacion de Auth URLs (Site URL y redirects) con Management API:

```bash
SUPABASE_ACCESS_TOKEN=... \
SUPABASE_PROJECT_REF=tu-project-ref \
APP_SITE_URL=http://127.0.0.1:3001 \
APP_REDIRECT_URLS="http://127.0.0.1:3001/**,http://localhost:3001/**" \
npm run supabase:auth:sync
```

## 9) Backups y restore local

Backup:

```bash
npm run ops:backup
```

Restore (requiere `SUPABASE_DB_URL`):

```bash
npm run ops:restore -- backups/cashflow-YYYYMMDD-HHMMSS.sql
```

## 10) Troubleshooting rapido

## `No encuentro el binario para backend`

- El menu intenta ejecutar un comando backend no instalado.
- Solucion: desactiva backend o configura comandos correctos (`./menu.sh config-backend`).

## El frontend no muestra URL inmediatamente

- `menu.sh` detecta URL por logs o por puerto del proceso.
- Revisa:
  - `.run/logs/frontend.log`
  - `./menu.sh status`

## E2E falla en entorno restringido por puertos

- Algunos sandboxes bloquean `listen` local.
- Ejecuta e2e en maquina local normal o CI con puertos habilitados.

## Preflight Vercel falla por variables faltantes

- Revisa `.env.local` y define:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` o `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Si preparas deploy CI en GitHub, agrega:
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`
