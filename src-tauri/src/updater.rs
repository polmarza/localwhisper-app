//! Auto-actualización con dos canales (stable / preview).
//!
//! El plan (ver CLAUDE.md): dos manifiestos en R2
//!   - https://downloads.localwhisper.app/updates/stable.json
//!   - https://downloads.localwhisper.app/updates/preview.json
//! La app consulta el que corresponda a la preferencia del usuario. Elegimos
//! el endpoint en tiempo de ejecución (el plugin de Tauri solo permite un
//! endpoint fijo en config), así que construimos el updater a mano por canal.
//!
//! La firma se verifica con la clave pública de `tauri.conf.json`
//! (`plugins.updater.pubkey`); la privada vive como secreto de GitHub y firma
//! los artefactos en el workflow. Sin firma válida, `check()` rechaza el update.

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::{Update, UpdaterExt};

const UPDATES_BASE: &str = "https://downloads.localwhisper.app/updates";

fn manifest_url(channel: &str) -> String {
    // Cualquier valor que no sea "preview" cae a stable, por seguridad.
    let ch = if channel == "preview" { "preview" } else { "stable" };
    format!("{UPDATES_BASE}/{ch}.json")
}

/// Metadatos de una actualización disponible, para pintar el aviso en la UI.
#[derive(Serialize)]
pub struct UpdateMeta {
    /// Versión anunciada por el manifiesto (p. ej. "0.3.0").
    pub version: String,
    /// Versión instalada actualmente.
    pub current_version: String,
    /// Notas de la versión (markdown/texto), si el manifiesto las trae.
    pub body: Option<String>,
}

/// Progreso de descarga emitido como evento `update-progress`.
#[derive(Clone, Serialize)]
struct Progress {
    downloaded: usize,
    total: Option<u64>,
}

/// Construye el updater apuntando al manifiesto del canal y comprueba si hay
/// versión nueva. Devuelve el handle `Update` (o None) para poder instalarlo.
async fn check(app: &AppHandle, channel: &str) -> Result<Option<Update>, String> {
    let url = url::Url::parse(&manifest_url(channel)).map_err(|e| e.to_string())?;
    let updater = app
        .updater_builder()
        .endpoints(vec![url])
        .map_err(|e| e.to_string())?
        .build()
        .map_err(|e| e.to_string())?;
    updater.check().await.map_err(|e| e.to_string())
}

/// Comprueba en silencio si hay actualización en el canal indicado.
#[tauri::command]
pub async fn check_for_update(
    app: AppHandle,
    channel: String,
) -> Result<Option<UpdateMeta>, String> {
    let update = check(&app, &channel).await?;
    Ok(update.map(|u| UpdateMeta {
        version: u.version.clone(),
        current_version: u.current_version.clone(),
        body: u.body.clone(),
    }))
}

/// Descarga e instala la actualización del canal, emitiendo `update-progress`
/// por cada trozo. Al terminar, el frontend debe llamar a `relaunch()`.
///
/// Nunca hace downgrade: si el usuario cambia de preview a stable y la stable
/// es más antigua, el manifiesto stable declarará una versión menor y el
/// updater no la ofrecerá (el plan del CLAUDE.md: no degradar automáticamente,
/// porque una preview puede traer migraciones de BD locales irreversibles).
#[tauri::command]
pub async fn install_update(app: AppHandle, channel: String) -> Result<(), String> {
    let update = check(&app, &channel)
        .await?
        .ok_or_else(|| "No hay ninguna actualización disponible.".to_string())?;

    let mut downloaded: usize = 0;
    let progress_app = app.clone();
    update
        .download_and_install(
            move |chunk, total| {
                downloaded += chunk;
                let _ = progress_app.emit("update-progress", Progress { downloaded, total });
            },
            || {},
        )
        .await
        .map_err(|e| e.to_string())?;

    let _ = app.emit("update-installed", ());
    Ok(())
}

/// Reinicia la app para aplicar la actualización recién instalada. Lo llama el
/// frontend cuando el usuario pulsa "Reiniciar ahora".
#[tauri::command]
pub fn restart_app(app: AppHandle) {
    app.restart();
}
