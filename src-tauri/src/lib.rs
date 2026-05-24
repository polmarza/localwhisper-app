mod license;

use std::path::PathBuf;
use std::time::Instant;

use futures_util::StreamExt;
use serde::Serialize;
use tauri::ipc::Channel;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::AsyncWriteExt;

use license::LicenseStore;

// ---------------------------------------------------------------------------
// Streaming download progress (Whisper models)
// ---------------------------------------------------------------------------

#[derive(Serialize, Clone)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ProgressEvent {
    Started { total_bytes: Option<u64> },
    Progress { downloaded: u64, total_bytes: Option<u64> },
    Done,
    Error { message: String },
}

#[tauri::command]
async fn download_whisper_model(
    app: AppHandle,
    file_name: String,
    url: String,
    on_progress: Channel<ProgressEvent>,
) -> Result<String, String> {
    let dir = match app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Resolviendo carpeta de datos: {e}"))
    {
        Ok(p) => p.join("models").join("whisper"),
        Err(e) => {
            let _ = on_progress.send(ProgressEvent::Error { message: e.clone() });
            return Err(e);
        }
    };

    // Unique tmp filename per request — two concurrent calls (e.g. React's
    // strict-mode double-mount, or two windows) must not share the same
    // .partial path or they corrupt each other.
    let tmp = {
        let pid = std::process::id();
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        dir.join(format!("{file_name}.{pid}-{nanos}.partial"))
    };
    let dest = dir.join(&file_name);

    let result: Result<String, String> = async {
        eprintln!("[download] start file={} url={}", file_name, url);
        tokio::fs::create_dir_all(&dir)
            .await
            .map_err(|e| format!("Creando carpeta {}: {e}", dir.display()))?;

        if dest.exists() {
            eprintln!("[download] cached, sending Done");
            on_progress
                .send(ProgressEvent::Done)
                .map_err(|e| format!("Channel send (done-cached): {e}"))?;
            return Ok(dest.to_string_lossy().into_owned());
        }

        eprintln!("[download] connecting…");
        let resp = reqwest::get(&url)
            .await
            .map_err(|e| {
                eprintln!("[download] connection error: {e}");
                format!("Conectando con el servidor: {e}")
            })?;
        eprintln!("[download] HTTP {}", resp.status());
        if !resp.status().is_success() {
            return Err(format!(
                "Descarga rechazada (HTTP {}). Comprueba tu conexión.",
                resp.status()
            ));
        }
        let total = resp.content_length();
        eprintln!("[download] sending Started total_bytes={:?}", total);
        on_progress
            .send(ProgressEvent::Started { total_bytes: total })
            .ok();

        let mut file = tokio::fs::File::create(&tmp)
            .await
            .map_err(|e| format!("Creando {}: {e}", tmp.display()))?;
        let mut stream = resp.bytes_stream();
        let mut downloaded: u64 = 0;
        let mut last_emit = Instant::now();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| format!("Descargando: {e}"))?;
            file.write_all(&chunk)
                .await
                .map_err(|e| format!("Escribiendo en disco: {e}"))?;
            downloaded += chunk.len() as u64;

            // Throttle progress events to ~5/s.
            if last_emit.elapsed().as_millis() >= 200 {
                last_emit = Instant::now();
                on_progress
                    .send(ProgressEvent::Progress {
                        downloaded,
                        total_bytes: total,
                    })
                    .ok();
            }
        }

        on_progress
            .send(ProgressEvent::Progress {
                downloaded,
                total_bytes: total,
            })
            .ok();
        file.flush()
            .await
            .map_err(|e| format!("Cerrando el archivo: {e}"))?;
        drop(file);

        match tokio::fs::rename(&tmp, &dest).await {
            Ok(_) => {
                on_progress.send(ProgressEvent::Done).ok();
                Ok(dest.to_string_lossy().into_owned())
            }
            Err(e) => {
                // If a concurrent caller already finalized the same file, our
                // rename can fail but the user effectively has the model.
                if dest.exists() {
                    on_progress.send(ProgressEvent::Done).ok();
                    Ok(dest.to_string_lossy().into_owned())
                } else {
                    Err(format!("Finalizando {}: {e}", dest.display()))
                }
            }
        }
    }
    .await;

    // Always clean up our tmp file — covers error paths and the case where a
    // concurrent caller's rename moved a different inode to dest, leaving ours
    // orphaned.
    let _ = tokio::fs::remove_file(&tmp).await;

    if let Err(ref message) = result {
        let _ = on_progress.send(ProgressEvent::Error {
            message: message.clone(),
        });
    }
    result
}

// ---------------------------------------------------------------------------
// Model file listing
// ---------------------------------------------------------------------------

#[derive(Serialize)]
pub struct LocalModel {
    file_name: String,
    path: String,
    size_bytes: u64,
}

#[tauri::command]
async fn list_local_models(app: AppHandle) -> Result<Vec<LocalModel>, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app data dir: {e}"))?
        .join("models")
        .join("whisper");

    if !dir.exists() {
        return Ok(Vec::new());
    }

    let mut entries = tokio::fs::read_dir(&dir)
        .await
        .map_err(|e| format!("Leyendo {}: {e}", dir.display()))?;
    let mut models = Vec::new();
    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("Iterando modelos: {e}"))?
    {
        let path = entry.path();
        let is_bin = path
            .extension()
            .map(|e| e == "bin")
            .unwrap_or(false);
        if !is_bin {
            continue;
        }
        let meta = match entry.metadata().await {
            Ok(m) => m,
            Err(_) => continue,
        };
        if !meta.is_file() {
            continue;
        }
        let file_name = entry
            .file_name()
            .to_string_lossy()
            .into_owned();
        models.push(LocalModel {
            file_name,
            path: path.to_string_lossy().into_owned(),
            size_bytes: meta.len(),
        });
    }
    models.sort_by(|a, b| a.file_name.cmp(&b.file_name));
    Ok(models)
}

// ---------------------------------------------------------------------------
// Whisper transcription (whisper-rs, in-process)
// ---------------------------------------------------------------------------

fn resolve_whisper_model(app: &AppHandle, file_name: &str) -> PathBuf {
    app.path()
        .app_data_dir()
        .map(|p| p.join("models").join("whisper").join(file_name))
        .unwrap_or_else(|_| PathBuf::from(file_name))
}

#[tauri::command]
async fn transcribe_audio(
    app: AppHandle,
    // Mono 16 kHz PCM as little-endian f32 — produced by the browser hook.
    pcm_bytes: Vec<u8>,
    model_file: String,
    // BCP-47 language hint ("es", "en", or "auto").
    language: Option<String>,
) -> Result<String, String> {
    if pcm_bytes.is_empty() {
        return Err("La grabación está vacía.".into());
    }
    if pcm_bytes.len() % 4 != 0 {
        return Err("Audio inválido: longitud no múltiplo de 4 bytes.".into());
    }

    let model_path = resolve_whisper_model(&app, &model_file);
    if !model_path.exists() {
        return Err(format!(
            "No encuentro el modelo Whisper en {}. ¿Lo has descargado?",
            model_path.display()
        ));
    }

    let sample_count = pcm_bytes.len() / 4;
    let mut samples = Vec::with_capacity(sample_count);
    for i in 0..sample_count {
        let bytes = [
            pcm_bytes[i * 4],
            pcm_bytes[i * 4 + 1],
            pcm_bytes[i * 4 + 2],
            pcm_bytes[i * 4 + 3],
        ];
        samples.push(f32::from_le_bytes(bytes));
    }

    let language = language.unwrap_or_else(|| "es".into());

    // 500 ms of leading zeros — whisper.cpp routinely drops the first 1-2 s
    // of speech without this calibration window because it treats the
    // leading audio as "this might be silence". The user can't hear the pad.
    const PADDING_MS: usize = 500;
    let pad_samples = 16_000 * PADDING_MS / 1_000;
    let mut padded = Vec::with_capacity(pad_samples + samples.len());
    padded.extend(std::iter::repeat(0.0_f32).take(pad_samples));
    padded.extend(samples);

    let transcript = tokio::task::spawn_blocking(move || -> Result<String, String> {
        use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

        let ctx = WhisperContext::new_with_params(
            &model_path.to_string_lossy(),
            WhisperContextParameters::default(),
        )
        .map_err(|e| format!("Cargando modelo Whisper: {e}"))?;

        let mut state = ctx
            .create_state()
            .map_err(|e| format!("Inicializando Whisper: {e}"))?;

        let lang_for_params: Option<&str> = if language == "auto" {
            None
        } else {
            Some(language.as_str())
        };

        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 0 });
        params.set_language(lang_for_params);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_special(false);
        params.set_print_timestamps(false);
        params.set_temperature(0.0);
        params.set_suppress_blank(true);
        params.set_max_initial_ts(0.0);

        state
            .full(params, &padded)
            .map_err(|e| format!("Transcribiendo audio: {e}"))?;

        let n_segments = state
            .full_n_segments()
            .map_err(|e| format!("Leyendo resultado: {e}"))?;

        let mut out = String::new();
        for i in 0..n_segments {
            let seg = state
                .full_get_segment_text(i)
                .map_err(|e| format!("Leyendo segmento {i}: {e}"))?;
            out.push_str(seg.trim());
            out.push(' ');
        }

        Ok(strip_whisper_markers(&out))
    })
    .await
    .map_err(|e| format!("Error en el hilo de transcripción: {e}"))??;

    Ok(transcript)
}

/// Removes the literal markers whisper.cpp emits when it perceives silence,
/// music, breathing, applause, etc. These are model artifacts, not real
/// spoken words.
///
/// Approach: strip **any** bracketed annotation `[...]` (case-insensitive,
/// any language) because whisper.cpp never emits brackets for real speech —
/// when a user dictates "abre corchete hola cierra corchete" the model
/// writes it out as words, never the literal `[` character. So removing all
/// bracketed runs is safe and covers every variant (`[SILENCIO]`, `[Música]`,
/// `[ Silence ]`, `[BLANK_AUDIO]`, `[Risas]`, etc.) without needing an
/// exhaustive list.
///
/// For parentheses we're more conservative — users may genuinely dictate
/// content like "(opcional)" — so we only strip a small known list of
/// model artifacts that sometimes leak as `(Música)` instead of `[Música]`.
fn strip_whisper_markers(text: &str) -> String {
    // Pass 1: strip every [...] block. We handle nesting too (rare but cheap).
    let mut s = String::with_capacity(text.len());
    let mut depth = 0i32;
    for ch in text.chars() {
        match ch {
            '[' => depth += 1,
            ']' if depth > 0 => depth -= 1,
            _ if depth == 0 => s.push(ch),
            _ => { /* inside [...], drop */ }
        }
    }

    // Pass 2: known (...) artifacts.
    const PAREN_MARKERS: &[&str] = &[
        "(Música)", "(música)", "(Music)", "(music)",
        "(Silencio)", "(silencio)", "(Silence)", "(silence)",
        "(Risas)", "(risas)", "(Laughter)",
        "(Aplausos)", "(aplausos)", "(Applause)",
        "(Inaudible)", "(inaudible)",
    ];
    for m in PAREN_MARKERS {
        s = s.replace(m, "");
    }

    // Pass 3: collapse any whitespace that ended up doubled by the removals.
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

// ---------------------------------------------------------------------------
// Shell — open URL in the default system browser (Tauri's WebView swallows
// <a target="_blank">; this lets us send the user to docs / external pages).
// ---------------------------------------------------------------------------

#[tauri::command]
async fn open_url(url: String) -> Result<(), String> {
    std::process::Command::new("open")
        .arg(&url)
        .spawn()
        .map_err(|e| format!("open_url failed: {e}"))?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Hardware detection — used by the onboarding to suggest a model tier.
// Cross-platform via the `sysinfo` crate (macOS / Windows / Linux).
// ---------------------------------------------------------------------------

#[derive(Serialize)]
pub struct Hardware {
    total_ram_gb: f64,
    arch: String,
    is_apple_silicon: bool,
    cpu_brand: String,
}

#[tauri::command]
fn detect_hardware() -> Result<Hardware, String> {
    use sysinfo::{CpuRefreshKind, MemoryRefreshKind, RefreshKind, System};

    let mut sys = System::new_with_specifics(
        RefreshKind::nothing()
            .with_memory(MemoryRefreshKind::nothing().with_ram())
            .with_cpu(CpuRefreshKind::nothing()),
    );
    sys.refresh_memory();

    let total_ram_gb = (sys.total_memory() as f64) / (1024.0 * 1024.0 * 1024.0);

    // std::env::consts::ARCH returns "aarch64" on Apple Silicon; we keep the
    // historical "arm64" label (what `uname -m` used to produce) so any
    // downstream comparisons stay stable.
    let arch_raw = std::env::consts::ARCH.to_string();
    let arch = if arch_raw == "aarch64" { "arm64".to_string() } else { arch_raw };

    let is_apple_silicon = cfg!(target_os = "macos") && arch == "arm64";

    let cpu_brand = sys
        .cpus()
        .first()
        .map(|c| c.brand().trim().to_string())
        .unwrap_or_default();

    Ok(Hardware {
        total_ram_gb,
        arch,
        is_apple_silicon,
        cpu_brand,
    })
}

// ---------------------------------------------------------------------------
// Resource resolution helpers (kept around for future bundle-only assets)
// ---------------------------------------------------------------------------

#[allow(dead_code)]
fn resolve_bundle_resource(app: &AppHandle, relative: &str) -> Result<PathBuf, String> {
    app.path()
        .resolve(relative, BaseDirectory::Resource)
        .map_err(|e| format!("resolve resource '{relative}': {e}"))
}

// ---------------------------------------------------------------------------
// Native macOS helpers — raise the floating overlay above the Dock and paste
// transcribed text into the currently focused app via a synthesized ⌘V.
// ---------------------------------------------------------------------------

#[tauri::command]
fn raise_overlay(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use objc::{msg_send, sel, sel_impl};
        let win = app
            .get_webview_window("overlay")
            .ok_or_else(|| "overlay window not found".to_string())?;
        let ns_window = win.ns_window().map_err(|e| e.to_string())? as cocoa::base::id;
        unsafe {
            // kCGStatusWindowLevel = 25 is above kCGDockWindowLevel = 20, so
            // the overlay stays visible even when the Dock is on screen.
            let _: () = msg_send![ns_window, setLevel: 25_i64];
            // Make the window visible across full-screen apps and spaces.
            let collection: u64 = (1 << 0) | (1 << 8); // CanJoinAllSpaces | FullScreenAuxiliary
            let _: () = msg_send![ns_window, setCollectionBehavior: collection];
        }
    }
    let _ = &app; // keep the unused warning quiet on non-macOS
    Ok(())
}

#[derive(Serialize)]
pub struct PasteOutcome {
    pub app: Option<String>,
    pub pasted: bool,
    pub trusted: bool,
}

#[tauri::command]
async fn paste_text(text: String) -> Result<PasteOutcome, String> {
    use std::time::Duration;

    eprintln!("[paste] invoked with {} chars", text.len());
    tokio::time::sleep(Duration::from_millis(120)).await;

    let app = frontmost_app_name();
    eprintln!("[paste] frontmost app = {app:?}");

    // Write to the system clipboard from Rust — doing it from JS via
    // navigator.clipboard.writeText silently fails when the Tauri window
    // isn't focused (which is exactly our case: the user is in another app).
    #[cfg(target_os = "macos")]
    set_clipboard_text(&text);

    // On macOS the synthesized ⌘V keystroke is blocked unless this process
    // has Accessibility permission. We check silently here — the startup
    // hook is responsible for showing the system prompt on first launch.
    // Showing it on every paste would re-trigger the dialog after every
    // dictation because ad-hoc resigning changes the cdhash and macOS
    // treats it as a new identity for TCC.
    #[cfg(target_os = "macos")]
    let trusted = is_accessibility_trusted();
    #[cfg(not(target_os = "macos"))]
    let trusted = true;

    eprintln!("[paste] accessibility trusted = {trusted}");

    let pasted = if trusted {
        #[cfg(target_os = "macos")]
        {
            synthesize_cmd_v();
            true
        }
        #[cfg(not(target_os = "macos"))]
        {
            false
        }
    } else {
        eprintln!(
            "[paste] skipping ⌘V — grant Accessibility to Local Whisper in \
             System Settings → Privacy & Security → Accessibility"
        );
        false
    };

    let _ = text;
    Ok(PasteOutcome {
        app,
        pasted,
        trusted,
    })
}

// Replace the system clipboard with `text` using AppKit's NSPasteboard.
// Works from any thread / process state, no focus needed.
#[cfg(target_os = "macos")]
fn set_clipboard_text(text: &str) {
    use cocoa::base::{id, nil};
    use cocoa::foundation::NSString;
    use objc::{class, msg_send, sel, sel_impl};

    unsafe {
        let pasteboard: id = msg_send![class!(NSPasteboard), generalPasteboard];
        if pasteboard == nil {
            eprintln!("[paste] could not get general pasteboard");
            return;
        }
        let _: i64 = msg_send![pasteboard, clearContents];

        let ns_text: id = NSString::alloc(nil).init_str(text);
        let utf8_type: id = NSString::alloc(nil).init_str("public.utf8-plain-text");

        let ok: bool = msg_send![pasteboard, setString: ns_text forType: utf8_type];
        if !ok {
            eprintln!("[paste] NSPasteboard setString failed");
        }
    }
}

// Synthesize a Cmd+V keystroke at the HID event tap level — same mechanism
// other dictation/launcher apps use. Requires the Accessibility permission.
#[cfg(target_os = "macos")]
fn synthesize_cmd_v() {
    use std::ffi::c_void;
    use std::ptr::null_mut;

    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        fn CGEventCreateKeyboardEvent(
            source: *mut c_void,
            keycode: u16,
            keydown: bool,
        ) -> *mut c_void;
        fn CGEventSetFlags(event: *mut c_void, flags: u64);
        fn CGEventPost(tap: u32, event: *mut c_void);
        fn CFRelease(cf: *mut c_void);
    }

    const VK_COMMAND: u16 = 0x37;
    const VK_V: u16 = 0x09;
    const FLAG_COMMAND: u64 = 0x0010_0000;
    const HID_EVENT_TAP: u32 = 0;

    unsafe {
        let cmd_down = CGEventCreateKeyboardEvent(null_mut(), VK_COMMAND, true);
        let v_down = CGEventCreateKeyboardEvent(null_mut(), VK_V, true);
        CGEventSetFlags(v_down, FLAG_COMMAND);
        let v_up = CGEventCreateKeyboardEvent(null_mut(), VK_V, false);
        CGEventSetFlags(v_up, FLAG_COMMAND);
        let cmd_up = CGEventCreateKeyboardEvent(null_mut(), VK_COMMAND, false);

        CGEventPost(HID_EVENT_TAP, cmd_down);
        CGEventPost(HID_EVENT_TAP, v_down);
        CGEventPost(HID_EVENT_TAP, v_up);
        CGEventPost(HID_EVENT_TAP, cmd_up);

        CFRelease(cmd_down);
        CFRelease(v_down);
        CFRelease(v_up);
        CFRelease(cmd_up);
    }
}

// Two flavors of the trust check:
//
// - `is_accessibility_trusted()` queries the current state **without** popping
//   the system prompt. Use this on the hot path (paste_text) — we don't want
//   the user to see the Accessibility dialog every time they stop a
//   recording.
//
// - `request_accessibility_trust()` shows the prompt and registers the app in
//   System Settings if it isn't already. Call this ONCE at startup so the
//   user is offered the permission the first time, and never bothered again
//   if they grant it.
//
// (Background: when the .app is re-signed locally with `codesign --sign -`,
// the cdhash changes and macOS treats it as a "new" identity for TCC
// purposes. The user might appear in System Settings with the toggle on but
// the OS still answers "not trusted" because that toggle is bound to the
// previous signature. Releasing with a stable Developer ID signature fixes
// this; until then we just avoid showing the prompt on every paste.)
#[cfg(target_os = "macos")]
fn is_accessibility_trusted() -> bool {
    extern "C" {
        fn AXIsProcessTrusted() -> bool;
    }
    unsafe { AXIsProcessTrusted() }
}

#[cfg(target_os = "macos")]
fn request_accessibility_trust() -> bool {
    use cocoa::base::{id, nil, YES};
    use cocoa::foundation::{NSDictionary, NSString};
    use objc::{class, msg_send, sel, sel_impl};

    extern "C" {
        fn AXIsProcessTrustedWithOptions(options: *const std::ffi::c_void) -> bool;
    }

    unsafe {
        let key = NSString::alloc(nil).init_str("AXTrustedCheckOptionPrompt");
        let yes_val: id = msg_send![class!(NSNumber), numberWithBool: YES];
        let options: id = NSDictionary::dictionaryWithObject_forKey_(nil, yes_val, key);
        AXIsProcessTrustedWithOptions(options as *const _)
    }
}

#[cfg(target_os = "macos")]
fn frontmost_app_name() -> Option<String> {
    use cocoa::base::{id, nil};
    use objc::{class, msg_send, sel, sel_impl};

    unsafe {
        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
        if workspace == nil {
            return None;
        }
        let frontmost: id = msg_send![workspace, frontmostApplication];
        if frontmost == nil {
            return None;
        }
        let name: id = msg_send![frontmost, localizedName];
        if name == nil {
            return None;
        }
        let utf8: *const std::os::raw::c_char = msg_send![name, UTF8String];
        if utf8.is_null() {
            return None;
        }
        std::ffi::CStr::from_ptr(utf8)
            .to_str()
            .ok()
            .map(|s| s.to_string())
    }
}

#[cfg(not(target_os = "macos"))]
fn frontmost_app_name() -> Option<String> {
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    use tauri_plugin_global_shortcut::ShortcutState;
                    if event.state() == ShortcutState::Pressed {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.emit("toggle-recording", ());
                        }
                    }
                })
                .build(),
        )
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:localwhisper.db", migrations())
                .build(),
        )
        .setup(|app| {
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            // Global recording shortcut, chosen per-platform to avoid clashing
            // with OS-reserved combos:
            //   - macOS:   Alt+Space → Option(⌥)+Space (no system conflict)
            //   - Windows: Ctrl+Shift+Space (Win+Space switches keyboard layout;
            //              Alt+Space opens the window control menu)
            //   - Linux:   Ctrl+Shift+Space (Super+Space usually opens the app
            //              launcher in GNOME/KDE)
            // The user-visible label is kept in sync via `src/state/shortcuts.ts`.
            #[cfg(target_os = "macos")]
            let shortcut = "Alt+Space";
            #[cfg(not(target_os = "macos"))]
            let shortcut = "Ctrl+Shift+Space";
            app.handle().global_shortcut().register(shortcut)?;

            // Load (or create on first boot) the license state from
            // AppData/license.json so commands can read/write it.
            let license_store = LicenseStore::load(app.handle())
                .map_err(|e| format!("license init: {e}"))?;
            app.manage(license_store);

            // Pop the macOS Accessibility prompt on first launch so the user
            // can grant the permission needed for the paste step. After they
            // approve, Local Whisper appears in Privacy & Security → Accessibility.
            // Only the prompting variant runs here; the hot path in paste_text
            // uses the silent check to avoid bothering the user repeatedly.
            #[cfg(target_os = "macos")]
            {
                let trusted = request_accessibility_trust();
                eprintln!("[startup] Accessibility trusted = {trusted}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            download_whisper_model,
            list_local_models,
            transcribe_audio,
            open_url,
            detect_hardware,
            raise_overlay,
            paste_text,
            license::license_get_state,
            license::license_activate,
            license::license_validate,
            license::license_deactivate,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn migrations() -> Vec<tauri_plugin_sql::Migration> {
    use tauri_plugin_sql::{Migration, MigrationKind};
    vec![
        Migration {
            version: 1,
            description: "create transcriptions table",
            sql: "CREATE TABLE IF NOT EXISTS transcriptions (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                text        TEXT    NOT NULL,
                app         TEXT,
                duration_ms INTEGER NOT NULL DEFAULT 0,
                word_count  INTEGER NOT NULL DEFAULT 0,
                pasted      INTEGER NOT NULL DEFAULT 0,
                created_at  INTEGER NOT NULL
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create dictionary table",
            sql: "CREATE TABLE IF NOT EXISTS dictionary (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                term        TEXT    NOT NULL,
                replacement TEXT    NOT NULL,
                category    TEXT,
                notes       TEXT,
                uses        INTEGER NOT NULL DEFAULT 0,
                created_at  INTEGER NOT NULL
            );",
            kind: MigrationKind::Up,
        },
    ]
}
