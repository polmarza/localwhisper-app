# Local Whisper — Notas de proyecto

## Stack
- Tauri v2 + React 19 + TypeScript (Vite)
- pnpm (no npm). Arrancar con: `PATH="/Volumes/SAMSUNG 4TB/Home/.cargo/bin:$PATH" pnpm tauri dev`
- SQLite via plugin `tauri-plugin-sql`
- Puerto de dev: 1420 (si está ocupado: `lsof -ti :1420 | xargs kill -9`)

## Modelos Whisper

### Almacenamiento
Los modelos se sirven desde **Cloudflare R2** (bucket `whisper`), no desde HuggingFace.
URL base: `https://downloads.localwhisper.app` (custom domain del bucket; el subdominio `downloads.` apunta vía CNAME a R2)
URL R2 directa (de fallback): `https://pub-8d451576d7ae4f518721218aafa5c847.r2.dev`

Los tres modelos actuales:
| Tier | Archivo | Tamaño |
|---|---|---|
| Ligera | `ggml-small-q5_1.bin` | ~181 MB |
| Equilibrada | `ggml-large-v3-turbo-q5_0.bin` | ~548 MB |
| Máxima | `ggml-large-v3-turbo-q8_0.bin` | ~834 MB |

Las URLs y nombres de archivo están definidos en `src/state/tiers.ts`.

### Subir o actualizar un modelo
1. Descargar el nuevo archivo desde HuggingFace:
   ```bash
   curl -L -o NOMBRE_ARCHIVO.bin "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/NOMBRE_ARCHIVO.bin"
   ```
2. Subir a R2 con rclone (el remote se llama "R2 Account Token"):
   ```bash
   rclone copy NOMBRE_ARCHIVO.bin "R2 Account Token":whisper/ --progress --s3-no-check-bucket
   ```
3. Si cambia el nombre del archivo, actualizar `fileName` y `url` en `src/state/tiers.ts`.

### Usuarios con modelos ya instalados
El modelo se descarga una vez y queda en el disco local del usuario. La URL de R2 solo se usa durante el onboarding — después la app carga el modelo directamente desde disco sin conexión a internet.

Si en una actualización cambia el nombre del archivo, los usuarios antiguos **no se ven afectados** (tienen el archivo en disco y la ruta guardada en localStorage). El único efecto cosmético sería que `tierForFile()` ya no reconocería el nombre antiguo y mostraría "—" en lugar del nombre del tier. Solución: añadir el nombre anterior como alias en `tierForFile()` en `tiers.ts`.

## Temas
- 3 temas × 2 modos: `arena`, `pizarra`, `bosque` en `light` y `dark`
- CSS aplicado vía `body[data-palette="${id}-${mode}"]`
- Definidos en `src/state/theme.ts` y `src/styles/global.css`
- Las dos claves de localStorage: `localwhisper.theme` y `localwhisper.themeMode`

## Identificadores internos
- Bundle ID: `com.localwhisper.app`
- localStorage prefix: `localwhisper.*`
- Base de datos SQLite: `localwhisper.db`
- Nombre del crate Rust: `localwhisper`

## Sistema de licencias

### Modelo
- **14 días de trial completo** (sin limitar funciones)
- A los 14 días sin clave válida → se bloquea la grabación (resto de la app sigue accesible)
- **Pago único lifetime** vía Lemon Squeezy
- **3 activaciones por licencia** (configurado en el dashboard de LS)

### Fuente de verdad
El estado vive en `AppData/license.json` — **NO en localStorage**. Esto es deliberado: borrar la caché de WebKit no debe resetear el trial ni perder la clave.

Estructura del archivo:
```json
{
  "first_launch": "ISO datetime",
  "machine_id": "UUID generado en primera ejecución",
  "key": "clave introducida o null",
  "instance_id": "ID que devuelve Lemon Squeezy al /activate",
  "status": "trial | active | expired | invalid",
  "last_validated_at": "ISO datetime o null",
  "activation_limit": 3,
  "activation_usage": 1
}
```

### Endpoints de Lemon Squeezy usados
Los tres no requieren API key secreta — solo la `license_key`:
- `POST /v1/licenses/activate` — primera activación (genera `instance_id`)
- `POST /v1/licenses/validate` — revalidación periódica (cada 7 días)
- `POST /v1/licenses/deactivate` — libera una activación

Implementado en `src-tauri/src/license.rs` (no en JS) para evitar que DevTools muestre fácilmente las peticiones.

### Archivos clave
- `src-tauri/src/license.rs` — módulo Rust con la lógica y los comandos Tauri
- `src/state/license.ts` — tipos y wrappers
- `src/hooks/useLicense.ts` — hook React
- `src/components/TrialBanner.tsx` — banner de cuenta atrás
- `src/components/LicenseModal.tsx` — modal de activación
- Sección "Licencia" en `src/screens/Settings.tsx`

### Lemon Squeezy
- Cuenta: `local-whisper.lemonsqueezy.com`
- Producto: "Local Whisper — Licencia" (lifetime, 3 activaciones, license keys ON)
- Checkout URL (**TEST MODE** ahora mismo): `https://local-whisper.lemonsqueezy.com/checkout/buy/b2ace9f5-c28b-49de-a877-229ff41d481a` (configurada en `src/state/license.ts` como `PURCHASE_URL`)

**⚠️ Antes de lanzar en producción:**
1. En LS, desactivar Test Mode (entornos test/live están completamente separados)
2. Recrear el producto en live mode con la misma config (lifetime, 3 activations, license keys ON, tax category Software, mismos textos de confirmación/email)
3. Copiar la nueva URL de checkout (UUID distinto) y actualizar `PURCHASE_URL` en `src/state/license.ts`
4. Verificar que la cuenta de pago (Stripe payouts) está conectada a banco real

Para test con tarjeta de Stripe: `4242 4242 4242 4242`, expiry `12/30`, CVC `123`, postal cualquiera.

## Atajo de teclado global

Filosofía: usar el modificador que está **en la misma posición física** en los teclados de cada SO — la segunda tecla a la izquierda de Espacio:

- **macOS:** Option (⌥)
- **Windows:** Win
- **Linux:** Super (la misma tecla física que Win, otro nombre)

La razón es ergonómica: la combinación se siente "igual" para el usuario sin tener que aprender un atajo nuevo según el SO.

**Estado actual:**
- Rust registra `Alt+Space` (`src-tauri/src/lib.rs`, setup). En macOS funciona porque Alt = Option. En Windows/Linux **el binding hay que cambiarlo** a `Super+Space` (o equivalente) antes del build correspondiente.
- El label visual ya está correcto vía `src/state/shortcuts.ts` → `getRecordingShortcut()`. Mac muestra `⌥`, Windows muestra `Win`, Linux muestra `Super`. Usado en `TutorialModal`, `Ready`, `Help`.

**⚠️ Conflicto conocido en Windows:** `Win+Space` es por defecto el cambio de distribución de teclado en Windows. Decidir antes de lanzar Windows si:
1. Asumir el override (a muchos usuarios no les molesta porque rara vez cambian distribución)
2. Cambiar el atajo Windows a algo como `Ctrl+Shift+Space`
3. Permitir personalización desde Ajustes (la mejor opción a largo plazo)

## Sistema de versiones y canales (pendiente de implementar)

Pensado para coexistir dos canales de actualización: `stable` y `preview`. Cuando se implemente el auto-updater:

- **Convención SemVer:** stable = `vX.Y.Z`, preview = `vX.Y.Z-preview.N`
- **Dos manifests en R2** (`downloads.localwhisper.app/updates/`):
  - `stable.json` — última versión estable
  - `preview.json` — última versión preview o stable (la más nueva de las dos)
- **Toggle en Ajustes → General** "Recibir versiones beta" → guarda `updateChannel: "stable" | "preview"`
- **GitHub Actions** detecta el formato del tag y publica en el canal correspondiente. Tag stable → actualiza ambos manifests (porque también es la "última" para preview users)
- **Nunca hacer downgrade** automático al cambiar de preview → stable (la versión preview puede tener migraciones de DB locales irreversibles)

## Soporte / formularios externos

La pantalla de Ayuda y la landing redirigen a estos endpoints:

- **Email de soporte:** `hola@localwhisper.app` (Cloudflare Email Routing → Gmail; envío vía Gmail "Send mail as")
- **Reportar bug:** https://tally.so/r/9qovLV
- **Proponer mejora:** https://tally.so/r/A7jqK0
- **Contacto general:** https://tally.so/r/b568jg

Los IDs de Tally están en constantes al inicio de `src/screens/Help.tsx`. Si cambian, actualizar allí.

## Dominio y deployment

- **Dominio:** `localwhisper.app` (registrado en Hostinger, DNS en Cloudflare, sin proxy → "DNS only" por el bloqueo de LaLiga)
- **Landing:** desplegada en Vercel desde un repo de GitHub. Archivo único `index.html` (luego migrado a Astro).
- **Bucket de modelos (R2):** `whisper` → `downloads.localwhisper.app`
- **Bucket de releases (R2):** PENDIENTE de crear cuando hagamos la primera build. Probable subdominio: el mismo `downloads.localwhisper.app` con carpetas `/v1.0.0/...` y `/latest/...`

## Iconos
- Fuente: `src-tauri/icons/local-whisper.png` (800×800, diseño del usuario)
- Generados con script Node + sharp (requiere RGBA, no RGB)
- Si se regeneran: `node scripts/gen-icons.mjs`
