<div align="center">

<img src="src-tauri/icons/128x128@2x.png" width="96" alt="Local Whisper" />

# Local Whisper

**Dictado por voz que nunca sale de tu ordenador.**

Pulsas un atajo, hablas, y el texto aparece donde estés escribiendo.
Sin nube, sin cuenta, sin suscripción. Funciona hasta en modo avión.

[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)
[![Plataformas](https://img.shields.io/badge/macOS%20%C2%B7%20Windows%20%C2%B7%20Linux-lightgrey.svg)]()
[![Gratis](https://img.shields.io/badge/precio-gratis-brightgreen.svg)]()

[Descargar](https://localwhisper.app) · [Web](https://localwhisper.app) · [Invítame a un café](https://www.buymeacoffee.com/polmarza)

[English](README.md) · **Español**

<!-- TODO: captura de pantalla.
     Haz una de la ventana real en tu Mac (⇧⌘4 y luego Espacio para capturar
     la ventana con su sombra), guárdala como docs/screenshot.png y descomenta:
<img src="docs/screenshot.png" width="820" alt="Local Whisper en funcionamiento" />
-->

</div>

---

## Por qué existe

Todas las apps de dictado decentes mandan tu voz a un servidor. Si dictas
correos, notas de clientes o historiales de pacientes, eso significa que tu voz
—y lo que dices— viaja a la nube de alguien.

Local Whisper ejecuta **Whisper entero en tu máquina**. El audio no sale del
equipo, no se guarda en crudo, y no hay servidor al que enviar nada. Por eso
funciona sin conexión: no es una promesa de política de privacidad, es cómo
está construido.

## Es gratis, y esto es por qué

**Sin límite de palabras, sin funciones bloqueadas, sin prueba que caduque.**
Todas las pantallas y los 7 temas están disponibles para todo el mundo.

La desarrollo yo solo. Disfruto construyendo; vender no. Un producto de pago
necesita a alguien detrás vendiéndolo cada día, y prefiero dedicar ese tiempo a
que la app sea mejor. Además, al procesarse todo en local **no hay nada que
vender**: ni datos, ni servidores.

Si te ahorra tiempo y te apetece echar una mano, hay un
[café](https://www.buymeacoffee.com/polmarza) esperando. Totalmente opcional.

## Qué hace

- **Dicta en cualquier app** — el texto se pega donde tengas el cursor: correo, notas, editor, terminal.
- **Diccionario propio** — enséñale nombres, marcas y tecnicismos para que los escriba bien siempre.
- **Historial local** — todas tus transcripciones en una base SQLite en tu equipo. Se puede desactivar o borrar.
- **Estadísticas** — palabras dictadas, rachas y tiempo ahorrado.
- **7 temas** × modo claro/oscuro, tamaño de texto ajustable y elección de tipografía.
- **Auto-actualización** firmada, con canal estable y canal preview.

## Instalación

Descarga el instalador desde [localwhisper.app](https://localwhisper.app) o
desde [Releases](../../releases).

| Sistema | Formato | Notas |
|---|---|---|
| macOS (Apple Silicon) | `.dmg` | Firmado y notarizado por Apple |
| macOS (Intel) | `.dmg` | Firmado y notarizado por Apple |
| Windows | `.exe` / `.msi` | Transcribe en CPU (más lento) |
| Linux | `.AppImage` / `.deb` / `.rpm` | Transcribe en CPU (más lento) |

La primera vez, la app descarga el modelo que elijas (una sola vez). A partir
de ahí funciona sin internet.

## Modelos

| Tier | Modelo | Tamaño | Recomendado para |
|---|---|---|---|
| Ligero | `small` (q5_1) | ~181 MB | Cualquier equipo · el default en Windows/Linux |
| Equilibrado | `large-v3-turbo` (q5_0) | ~548 MB | **Default en Mac.** 8 GB de RAM o más |
| Máximo | `large-v3-turbo` (q8_0) | ~834 MB | Apple Silicon con 16 GB o más |

En **Apple Silicon** la inferencia va por **GPU (Metal)**, así que es rápida
incluso con los modelos grandes. En Windows y Linux todavía va por CPU — de ahí
que ahí se recomiende el modelo Ligero. *(CUDA/Vulkan: en el roadmap.)*

## Atajo

| Sistema | Atajo por defecto |
|---|---|
| macOS | `⌥` + `Espacio` |
| Windows / Linux | `Ctrl` + `Shift` + `Espacio` |

Configurable desde **Ajustes → Atajos**.

## Cómo está hecho

- **[Tauri v2](https://tauri.app)** + **React 19** + TypeScript (Vite)
- **[whisper.cpp](https://github.com/ggerganov/whisper.cpp)** vía
  [whisper-rs](https://github.com/tazz4843/whisper-rs), con feature `metal` en macOS
- **SQLite** (`tauri-plugin-sql`) para el historial y el diccionario
- El contexto de Whisper se **cachea en memoria**: el modelo se carga de disco
  una vez por sesión, no en cada dictado
- Se añaden 500 ms de silencio al inicio y al final del audio — sin eso, Whisper
  se come la primera y la última palabra

## Compilar desde el código

Requisitos: [Node](https://nodejs.org) 20+, [pnpm](https://pnpm.io) 9+ y
[Rust](https://rustup.rs) estable. En Linux hacen falta además las dependencias
de sistema de Tauri (`libwebkit2gtk-4.1-dev`, `librsvg2-dev`, `patchelf`,
`libssl-dev`).

```bash
pnpm install
pnpm tauri dev      # desarrollo
pnpm tauri build    # binario de producción
```

## Contribuir

Es un proyecto personal que mantengo en mis ratos libres, así que el soporte es
en modo "lo mejor que puedo". Los issues y PRs son bienvenidos, pero puedo tardar
en responder.

- 🐛 [Reportar un fallo](https://tally.so/r/9qovLV)
- 💡 [Proponer una mejora](https://tally.so/r/A7jqK0)
- ✉️ hola@localwhisper.app

## Licencia

[MIT](LICENSE) © 2026 Pol Marza.

La licencia cubre el código. No incluye el nombre "Local Whisper", el logotipo
ni el dominio — si publicas un fork, usa identidad propia. Las licencias de las
dependencias (whisper.cpp, los modelos de OpenAI, Tauri, las tipografías…) están
en [THIRD-PARTY.md](THIRD-PARTY.md).

<div align="center">

<a href="https://www.buymeacoffee.com/polmarza">
  <img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=polmarza&button_colour=c0651e&font_colour=ffffff&font_family=Poppins&outline_colour=ffffff&coffee_colour=FFDD00" alt="Invítame a un café" height="50" />
</a>

</div>
