<div align="center">

<img src="src-tauri/icons/128x128@2x.png" width="96" alt="Local Whisper" />

# Local Whisper

**Voice dictation that never leaves your computer.**

Hit a shortcut, talk, and the text lands wherever you're typing.
No cloud, no account, no subscription. It even works in airplane mode.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platforms](https://img.shields.io/badge/macOS%20%C2%B7%20Windows%20%C2%B7%20Linux-lightgrey.svg)]()
[![Free](https://img.shields.io/badge/price-free-brightgreen.svg)]()

[Download](https://localwhisper.app) · [Website](https://localwhisper.app) · [Buy me a coffee](https://www.buymeacoffee.com/polmarza)

**English** · [Español](README.es.md)

<!-- TODO: screenshot.
     Take one of the real window on macOS (⇧⌘4, then Space to capture the
     window with its shadow), save it as docs/screenshot.png and uncomment:
<img src="docs/screenshot.png" width="820" alt="Local Whisper in action" />
-->

</div>

> [!NOTE]
> **The app's interface is currently in Spanish only.** Transcription itself
> works in every language Whisper supports (99+), and the codebase is English.
> UI localisation is on the roadmap — [contributions welcome](#contributing).

---

## Why it exists

Every decent dictation app sends your voice to a server. If you dictate emails,
client notes or patient records, that means your voice — and what you say —
travels to somebody else's cloud.

Local Whisper runs **Whisper entirely on your machine**. Audio never leaves the
device, is never stored raw, and there is no server to send it to. That's why it
works offline: it isn't a privacy-policy promise, it's how the thing is built.

## It's free, and here's why

**No word limits, no locked features, no expiring trial.** Every screen and all
7 themes are available to everyone.

I build this on my own. I enjoy building; selling, not so much. A paid product
needs somebody behind it selling every single day, and I'd rather spend that
time making the app better. Besides, since everything runs locally there's
**nothing to sell** — no data, no servers.

If it saves you time and you feel like helping out, there's a
[coffee](https://www.buymeacoffee.com/polmarza) waiting. Entirely optional.

## What it does

- **Dictate into any app** — text is pasted at your cursor: mail, notes, editor, terminal.
- **Custom dictionary** — teach it names, brands and jargon so it always spells them right.
- **Local history** — every transcription in a SQLite database on your machine. Can be disabled or wiped.
- **Stats** — words dictated, streaks and time saved.
- **7 themes** × light/dark, adjustable text size and a choice of typeface.
- **Signed auto-updates**, with stable and preview channels.

## Install

Grab an installer from [localwhisper.app](https://localwhisper.app) or from
[Releases](../../releases).

| OS | Format | Notes |
|---|---|---|
| macOS (Apple Silicon) | `.dmg` | Signed and notarised by Apple |
| macOS (Intel) | `.dmg` | Signed and notarised by Apple |
| Windows | `.exe` / `.msi` | Runs on CPU (slower) |
| Linux | `.AppImage` / `.deb` / `.rpm` | Runs on CPU (slower) |

On first run the app downloads the model you pick — once. After that it works
with no internet at all.

## Models

| Tier | Model | Size | Best for |
|---|---|---|---|
| Light | `small` (q5_1) | ~181 MB | Any machine · the default on Windows/Linux |
| Balanced | `large-v3-turbo` (q5_0) | ~548 MB | **Default on Mac.** 8 GB RAM or more |
| Maximum | `large-v3-turbo` (q8_0) | ~834 MB | Apple Silicon with 16 GB or more |

On **Apple Silicon** inference runs on the **GPU via Metal**, so it's fast even
with the larger models. On Windows and Linux it still runs on CPU — hence the
Light model being the recommendation there. *(CUDA/Vulkan: on the roadmap.)*

## Shortcut

| OS | Default |
|---|---|
| macOS | `⌥` + `Space` |
| Windows / Linux | `Ctrl` + `Shift` + `Space` |

Configurable under **Ajustes → Atajos** (Settings → Shortcuts).

## How it's built

- **[Tauri v2](https://tauri.app)** + **React 19** + TypeScript (Vite)
- **[whisper.cpp](https://github.com/ggerganov/whisper.cpp)** through
  [whisper-rs](https://github.com/tazz4843/whisper-rs), with the `metal` feature on macOS
- **SQLite** (`tauri-plugin-sql`) for history and the dictionary
- The Whisper context is **cached in memory**: the model is read from disk once
  per session, not on every dictation
- 500 ms of silence is padded at the start *and* end of the audio — without it,
  Whisper swallows your first and last word

## Build from source

Requirements: [Node](https://nodejs.org) 20+, [pnpm](https://pnpm.io) 9+ and
stable [Rust](https://rustup.rs). On Linux you'll also need Tauri's system
dependencies (`libwebkit2gtk-4.1-dev`, `librsvg2-dev`, `patchelf`, `libssl-dev`).

```bash
pnpm install
pnpm tauri dev      # development
pnpm tauri build    # production binary
```

## Contributing

This is a personal project I maintain in my spare time, so support is
best-effort. Issues and PRs are welcome, but I may be slow to reply.

**UI localisation is the most useful thing anyone could contribute** — the
strings are currently hardcoded in Spanish across `src/`.

- 🐛 [Report a bug](https://tally.so/r/9qovLV) *(form in Spanish)*
- 💡 [Suggest a feature](https://tally.so/r/A7jqK0) *(form in Spanish)*
- ✉️ hola@localwhisper.app — English is fine

## License

[MIT](LICENSE) © 2026 Pol Marza.

The license covers the code. It does not include the "Local Whisper" name, the
logo or the domain — if you ship a fork, please give it its own identity.
Dependency licenses (whisper.cpp, OpenAI's models, Tauri, the typefaces…) are
listed in [THIRD-PARTY.md](THIRD-PARTY.md).

<div align="center">

<a href="https://www.buymeacoffee.com/polmarza">
  <img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=polmarza&button_colour=c0651e&font_colour=ffffff&font_family=Poppins&outline_colour=ffffff&coffee_colour=FFDD00" alt="Buy me a coffee" height="50" />
</a>

</div>
