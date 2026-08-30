# Local Whisper

**Dictado y transcripción por voz que nunca sale de tu ordenador.**

Pulsas un atajo global, hablas, y el texto se pega donde tuvieras el cursor — en tu editor, en el correo, en WhatsApp Web, donde sea. El audio se transcribe con [Whisper](https://github.com/ggerganov/whisper.cpp) ejecutándose **en local**: no hay servidor al que enviar nada, así que funciona sin conexión y tu voz no viaja a ninguna parte.

[localwhisper.app](https://localwhisper.app) · [Descargas](https://localwhisper.app/descargas) · [Changelog](https://localwhisper.app/changelog)

> **Local Whisper es software libre.** No tiene licencia de pago, periodo de prueba, clave de activación ni límite de equipos. Si antes compraste una licencia: gracias, literalmente pagaste este desarrollo — tu clave ya no hace falta.

---

## Qué hace

- **Atajo global.** Dicta desde cualquier aplicación; el texto se pega solo al terminar.
- **100% local.** Transcripción en tu equipo, acelerada por GPU (Metal) en Apple Silicon.
- **Sin conexión.** Tras descargar el modelo una vez, no necesita internet para nada.
- **Diccionario propio.** Enséñale nombres, siglas o jerga y los escribirá siempre bien.
- **Historial y estadísticas.** Guardados en una base SQLite local; el historial se puede desactivar.
- **Multiidioma.** Español, inglés, catalán, portugués, francés, alemán, italiano y más.
- **7 temas** en modo claro y oscuro, tamaño de texto ajustable y sonidos opcionales.

Tres modelos a elegir según lo que aguante tu máquina:

| Tier | Archivo | Tamaño |
|---|---|---|
| Ligero | `ggml-small-q5_1.bin` | ~181 MB |
| Equilibrado | `ggml-large-v3-turbo-q5_0.bin` | ~548 MB |
| Máximo | `ggml-large-v3-turbo-q8_0.bin` | ~834 MB |

## Instalar

La forma rápida es bajarse el binario ya compilado, firmado y notarizado desde
**[localwhisper.app/descargas](https://localwhisper.app/descargas)** o desde la pestaña
[Releases](https://github.com/polmarza/localwhisper-app/releases) de este repositorio.

Disponible para macOS (Apple Silicon e Intel) y Linux (AppImage, `.deb`, `.rpm`). La versión de
Windows compila, pero todavía no se distribuye firmada.

## Compilar desde el código

Necesitas **Node 20+**, **pnpm** y la **toolchain de Rust**, además de los
[requisitos de Tauri v2](https://v2.tauri.app/start/prerequisites/) para tu sistema.

```bash
git clone https://github.com/polmarza/localwhisper-app.git
cd localwhisper-app
pnpm install
pnpm tauri dev      # arranca en modo desarrollo
pnpm tauri build    # genera el binario para tu plataforma
```

El puerto de desarrollo es el 1420. Si se queda ocupado: `lsof -ti :1420 | xargs kill -9`.

En macOS, whisper-rs se compila con la feature `metal`, así que la transcripción va por GPU. En
Windows y Linux va por CPU, que es notablemente más lento — por eso la app recomienda el modelo
Ligero por defecto en esas plataformas.

## Arquitectura

```
src/                  React 19 + TypeScript (Vite)
  screens/            Home, Ajustes, Diccionario, Estadísticas, Ayuda
  onboarding/         Flujo de primera ejecución
  hooks/              useRecorder, useDictionary, ...
  state/              Temas, tiers de modelo, preferencias, atajos
  lib/                Diccionario, base de datos, sonidos
src-tauri/            Backend en Rust (Tauri v2)
  src/lib.rs          Comandos, caché del contexto Whisper, ciclo de vida
  src/updater.rs      Actualización automática firmada
```

Detalles de implementación —el porqué de cada decisión de rendimiento, cómo se sirven los modelos
desde R2, cómo funciona el diccionario— están documentados en [`CLAUDE.md`](CLAUDE.md).

## Contribuir

Los issues y las pull requests son bienvenidos. Si vas a meterte en algo grande, abre antes un
[issue](https://github.com/polmarza/localwhisper-app/issues) para comentarlo y no duplicar trabajo.

Al enviar una contribución aceptas que se publique bajo la licencia GPL-3.0 del proyecto.

Cosas que ayudarían especialmente:

- **Aceleración por GPU en Windows y Linux** (CUDA / Vulkan para whisper-rs)
- **Firma de código en Windows**, para poder distribuir un instalador sin avisos de SmartScreen
- **Traducciones** de la interfaz
- Informes de bugs con pasos para reproducirlos

## Apoyar el proyecto

La app es gratis y lo seguirá siendo. Si te ahorra tiempo cada día y te apetece echar una mano con
el certificado de firma, el CDN de los modelos y las horas de desarrollo, puedes hacerlo en
[GitHub Sponsors](https://github.com/sponsors/polmarza). Es voluntario y no desbloquea nada.

## Licencia

[GNU General Public License v3.0](LICENSE).

Puedes usar, estudiar, modificar y redistribuir este software. Si distribuyes una versión
modificada, debe seguir siendo libre bajo GPL-3.0 y publicar su código fuente.

El nombre "Local Whisper" y su logotipo no forman parte de esta licencia: forkea con toda libertad,
pero no presentes tu versión como si fuera la oficial.
