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
| Ligero | `ggml-small-q5_1.bin` | ~181 MB |
| Equilibrado | `ggml-large-v3-turbo-q5_0.bin` | ~548 MB |
| Máximo | `ggml-large-v3-turbo-q8_0.bin` | ~834 MB |

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
- 7 temas × 2 modos: `pizarra` (default), `arena`, `bosque`, `coral`, `medianoche`, `oceano`, `mono` ("Blanco y negro") en `light` y `dark`. **Todos disponibles para todo el mundo** (ya no hay temas premium).
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

## Modelo: gratis, con apoyo voluntario

**Local Whisper es GRATIS y no bloquea absolutamente nada.** Sin tope de
palabras, sin trial que caduque, sin funciones premium. Todas las pantallas
(incluida Estadísticas) y los 7 temas están disponibles para todo el mundo.

El único punto de monetización es un **"invítame a un café" opcional**:
- Enlace a **Buy Me a Coffee** (`https://buymeacoffee.com/polmarza`), definido
  en `src/state/support.ts` (constante `SUPPORT_URL`). Es el **único** sitio
  donde vive la URL.
- **Ajustes → Apoyar**: una fila con el enlace. Nada más.
- **`SupportModal`** (`src/components/SupportModal.tsx`): aviso amable que
  aparece **una sola vez**, tras `SUPPORT_PROMPT_AFTER_DICTATIONS` (50)
  dictados — nunca al abrir la app por primera vez. Se silencia para siempre
  con `localwhisper.supportDismissed`. Nunca bloquea.

Prefs relacionadas en `src/state/preferences.ts`: `localwhisper.dictationCount`
(contador de dictados) y `localwhisper.supportDismissed`.

### Por qué gratis (contexto de la decisión)
Construir se disfruta; vender, no. Un producto de pago exige venderlo cada día
y ese trabajo no se estaba haciendo. Al ser gratis, el outreach a creadores deja
de ser "vender" y pasa a ser "compartir", que es mucho menos costoso. Además, al
procesarse todo en local **no hay nada que vender**: eso convierte el "es gratis"
de sospecha en prueba de la promesa de privacidad.

### ⚠️ Lemon Squeezy: retirado
El sistema de licencias (trial de 14 días, tope de 2.000 palabras/semana,
activación/validación contra Lemon Squeezy, temas premium) **se eliminó por
completo**. Ya no existen `src-tauri/src/license.rs`, `src/state/license.ts`,
`src/hooks/useLicense.ts`, `LicenseModal`, `LicenseBanner`, `PremiumLocked` ni
el paso de licencia del onboarding. Buy Me a Coffee no emite claves, así que no
hay nada que activar.

Si algún día hiciera falta recuperarlo, está en el historial de git.

`src-tauri/src/usage.rs` **sí se conserva**: sigue contando palabras
(`AppData/usage.json`), pero solo para alimentar Estadísticas. No hay tope.


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
