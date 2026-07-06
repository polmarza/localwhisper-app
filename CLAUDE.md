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

## Rendimiento de transcripción

Whisper large-v3-turbo es lo más nuevo que existe (no hay v4); ya lo usan los tiers Equilibrada/Máxima. La latencia se optimiza por otras vías:

- **Contexto Whisper cacheado** en `src-tauri/src/lib.rs` (`WhisperCache` en el estado de Tauri). El modelo (0,5–0,8 GB) se carga de disco **una vez por modelo**, no en cada dictado. Antes se releía cada vez → era la causa principal del "congelón al parar".
- **Todos los núcleos:** `set_n_threads(available_parallelism)` en lugar del default de 4.
- **GPU (Metal) en Mac:** `whisper-rs = "0.16"` con feature `metal` (`src-tauri/Cargo.toml`). ⚠️ La 0.13 traía un whisper.cpp cuyos shaders Metal ya no compilaban en macOS actual → `ggml_backend_metal_init() failed` → caía a CPU en silencio (transcripción lentísima). En **Windows/Linux** whisper-rs va **sin** metal → **CPU** (más lento); por eso `recommendTier()` en `tiers.ts` recomienda **Ligera** por defecto ahí y `tierWarning()` avisa al elegir modelos grandes. Pendiente: CUDA/Vulkan para Windows.
- **Transcripción en directo (VAD streaming): RETIRADA/OCULTA.** Existía para disimular la lentitud (que ya está resuelta con Metal). Trocear degrada la calidad (whisper detecta mal el idioma en segmentos cortos y descarta trozos), así que está **desactivada** vía `VAD_STREAMING_ENABLED = false` en `src/hooks/useRecorder.ts` y **sin toggle** en Ajustes. La implementación (VAD por energía RMS + cola secuencial + `initial_prompt` de continuidad) se conserva por si se retoma (p. ej. para Windows). Para reactivar: poner el flag a `true` y restaurar la Row en `Settings.tsx`.
  - **Calidad de puntuación:** trocear tiene el efecto secundario de "un punto por pausa" (whisper puntúa cada segmento como frase completa). Se mitiga con: umbral de silencio alto (~1 s, `VAD_SILENCE_HANGOVER_MS`, solo corta en fin de frase) + pasar el texto previo como `initial_prompt` a whisper (`transcribe_audio` acepta `prompt`, se manda la cola de `partsRef`). Aun así, el **modo normal (todo de golpe al parar) es el más limpio en puntuación y es el default** — el streaming es opcional para dictados largos.
- **Relleno de silencio:** `transcribe_audio` añade 500 ms de ceros al inicio **y al final** del audio. Sin el del final, whisper se come la última palabra cuando paras justo al terminar de hablar (igual que se comía la primera sin el del inicio).

## Temas
- 7 temas × 2 modos: `pizarra` (gratis, default), `arena`, `bosque`, `coral`, `medianoche`, `oceano`, `mono` ("Blanco y negro") en `light` y `dark`. Todos menos `pizarra` son premium.
- CSS aplicado vía `body[data-palette="${id}-${mode}"]` — cada tema = 2 bloques (light+dark) con ~19 variables en `src/styles/global.css`. Al añadir uno hay que tocar además el grupo `--dot-rest` y la línea de `background` de scrollbar.
- Definidos en `src/state/theme.ts` (array `THEMES`, tipo `ThemeId`) y `src/styles/global.css`
- Las dos claves de localStorage: `localwhisper.theme` y `localwhisper.themeMode`
- **Ajustes → Personalización** (sección propia): Modo, Tamaño de texto, **Tipografía** y Temas. El tamaño de texto por defecto es "Muy grande" (`DEFAULT_TEXT_SCALE = 1.3` en `preferences.ts`).
- **Tipografía del historial:** pref `localwhisper.transcriptFont` (`sans`/`mono`) → `body[data-font]` → variable CSS `--transcript-font` (usada en el texto de las transcripciones en `Home.tsx`). Aplicada en `App.tsx` al arrancar; Settings actualiza el atributo al cambiar.
- **Sonidos** (Ajustes → General, `localwhisper.sounds`, on por defecto): "pop" al empezar/parar grabación, sintetizado con Web Audio en `src/lib/sounds.ts` (sin assets), disparado desde `useRecorder`.

## Diccionario

Corrige cómo se escriben nombres/marcas/expresiones en la transcripción.

- **Se aplica de verdad:** tras transcribir, `applyDictionary()` (`src/lib/dictionary.ts`) hace find/replace por **palabra completa, ignorando mayúsculas** (regex con lookarounds Unicode, así funciona con acentos), preservando la capitalización de inicio de frase. Se aplica en `App.tsx` `onResult` **antes** de pegar/guardar/contar palabras (cubre modo normal y streaming).
- **Fuente única:** hook `useDictionary` (`src/hooks/useDictionary.ts`) → tabla SQLite `dictionary` (migración v2). CRUD en `src/lib/db.ts` (`add/list/update/deleteDictionaryEntry`). La pantalla (`src/screens/Dictionary.tsx`) y el popover de "seleccionar palabra del historial" (`src/screens/Home.tsx`) escriben en la **misma** tabla vía el hook.
- Campos: `term` ("cuando oigas") → `replacement` ("escribe") + `notes` opcional. **Sin categorías** (se quitaron por confusas; la columna `category`/`uses` sigue en la BD pero no se usa en la UI).
- ⚠️ Antes esto estaba a medias: la pantalla mostraba 12 entradas hardcodeadas y no se aplicaba nada. Ya no.

## Identificadores internos
- Bundle ID: `com.localwhisper.app`
- localStorage prefix: `localwhisper.*`
- Base de datos SQLite: `localwhisper.db`
- Nombre del crate Rust: `localwhisper`

## Sistema de licencias

### Modelo
- **Freemium con tope semanal:** la transcripción es gratis pero **limitada a 2.000 palabras/semana** para usuarios sin licencia (modelo estilo Wispr Flow). El trial y la licencia dan transcripción **ilimitada**. Al agotar el tope, se bloquea *iniciar* un dictado nuevo (upsell) hasta que se renueva la semana o se activa una clave.
- **Premium (trial o licencia) desbloquea:** transcripción ilimitada + la pantalla de **Estadísticas** (`insights`) + los **temas `arena` y `bosque`**. El tema `pizarra` es el gratuito por defecto. (La transcripción en directo era premium, pero está **retirada/oculta** — ver Rendimiento.)
- **14 días de trial premium:** durante los primeros 14 días todo va sin límites. Al caducar sin clave válida → tope de 2.000 palabras/semana y se bloquean Estadísticas / VAD / arena·bosque (fallback automático a `pizarra`).
- **Pago único lifetime** vía Lemon Squeezy (**precio de salida 29 €**, a subir más adelante).
- **3 activaciones por licencia** (configurado en el dashboard de LS)

Implementación del gating (todo en frontend; Rust calcula `status` y lleva el contador):
- `hasPremium(state)` en `src/state/license.ts` — antes era `canRecord`.
- **Tope semanal:** contador en Rust `src-tauri/src/usage.rs` (`UsageStore` → `AppData/usage.json`, **no localStorage**, para que borrar la caché no lo resetee). Comandos `usage_get_state` / `usage_add_words`, con reset por semanas. Frontend: `src/state/usage.ts` (`WEEKLY_WORD_CAP = 2000`, `countWords`, `wordsRemaining`) + `useUsage`. En `App.tsx`: se cuentan palabras en `onResult` (solo si no premium) y `guardedToggle` bloquea iniciar si `overQuota`. El `LicenseBanner` muestra las palabras restantes.
- `isPremiumTheme(id)` / `FREE_THEME` en `src/state/theme.ts`.
- `App.tsx` — bloqueo de Estadísticas (`<PremiumLocked>`), candado en el nav (`Sidebar`) y auto-downgrade de tema al caducar el premium.
- `Settings.tsx` — candado en el selector de temas premium y en el toggle de VAD.

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
- Producto: "Local Whisper — Licencia" (lifetime, 3 activaciones, license keys ON), **precio de salida 29 €**
- Checkout URL (**LIVE / producción**): `https://local-whisper.lemonsqueezy.com/checkout/buy/822299b8-b059-41c5-a8d4-ce56c3ef3e81` (configurada en `src/state/license.ts` como `PURCHASE_URL`)
- URL antigua de TEST (por si hay que volver a probar en test mode): `…/checkout/buy/b2ace9f5-c28b-49de-a877-229ff41d481a`

**✅ Ya en producción.** Antes de lanzar se hizo: desactivar Test Mode, recrear el producto en live (lifetime, 3 activations, license keys ON, tax category Software), y actualizar `PURCHASE_URL`. Verificar que los payouts (Stripe) apuntan a banco real.

⚠️ **Ojo:** los entornos test/live están completamente separados — las license keys de test NO funcionan en live y viceversa. Para probar pagos reales, tarjeta de Stripe en modo test ya no aplica; usa el flujo live real (o vuelve a la URL de test arriba).

## Atajo de teclado global

Distinto por plataforma para evitar colisiones con atajos del SO:

| SO | Atajo | Razón |
|---|---|---|
| macOS | `⌥ + Espacio` (Option+Space) | Sin conflicto con el sistema |
| Windows | `Ctrl + Shift + Espacio` | `Win+Space` cambia distribución de teclado, `Alt+Space` abre el menú de la ventana |
| Linux | `Ctrl + Shift + Espacio` | `Super+Space` abre el lanzador en GNOME/KDE |

**Sincronización:**
- Registro en Rust: `src-tauri/src/lib.rs` setup, con `#[cfg(target_os = "macos")]`
- Label visual: `src/state/shortcuts.ts` → `getRecordingShortcut()`
- Si cambias uno, cambia el otro (si no, el label muestra un atajo que no funciona)
- Usado para mostrar las teclas en: `TutorialModal`, `Ready`, `Help`

**Próximo paso pendiente:** hacer el atajo personalizable desde Ajustes → Atajos (sección ya existe vacía). UI tipo "graba la combinación" como hacen Raycast, CleanShot, etc.

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
