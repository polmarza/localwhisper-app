# Licencias de terceros

Local Whisper se distribuye bajo la licencia MIT (ver `LICENSE`). Además,
incluye o depende del siguiente software de terceros, cuyas licencias se
respetan y se reproducen a través de sus respectivos proyectos.

## Motor de transcripción

| Componente | Autor | Licencia |
|---|---|---|
| [whisper.cpp](https://github.com/ggerganov/whisper.cpp) / ggml | Georgi Gerganov | MIT |
| [whisper-rs](https://github.com/tazz4843/whisper-rs) | tazz4843 | Unlicense |

## Modelos

Los modelos de reconocimiento de voz son **Whisper**, de OpenAI, publicados
bajo licencia **MIT**. Local Whisper distribuye versiones cuantizadas en
formato GGML:

- `ggml-small-q5_1.bin`
- `ggml-large-v3-turbo-q5_0.bin`
- `ggml-large-v3-turbo-q8_0.bin`

Referencia: https://github.com/openai/whisper · https://huggingface.co/ggerganov/whisper.cpp

## Framework y librerías

| Componente | Licencia |
|---|---|
| [Tauri](https://tauri.app) (y sus plugins) | Apache-2.0 OR MIT |
| [React](https://react.dev) y React DOM | MIT |
| [Vite](https://vite.dev) | MIT |
| [Tailwind CSS](https://tailwindcss.com) | MIT |
| serde, reqwest, chrono y demás crates de Rust | MIT OR Apache-2.0 |

## Tipografías

Empaquetadas vía [Fontsource](https://fontsource.org), todas bajo
**SIL Open Font License 1.1**:

- **DM Sans** — Colophon Foundry, Jonny Pinhorn
- **Instrument Serif** — Instrument
- **JetBrains Mono** — JetBrains

## Marca

La licencia MIT cubre el **código**. No concede derechos sobre el nombre
"Local Whisper", el logotipo ni el dominio localwhisper.app. Si publicas un
fork, por favor usa un nombre e identidad propios — así nadie confunde tu
versión con esta.
