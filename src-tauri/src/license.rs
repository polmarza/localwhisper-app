//! Apoyo voluntario — activación de claves vía Lemon Squeezy.
//!
//! ⚠️ Local Whisper es GRATIS: nada de lo que hay aquí bloquea ninguna función.
//! Este módulo solo gestiona las claves de quien decide apoyar el proyecto, para
//! que la app pueda darle las gracias y dejar de mostrarle el aviso. Los estados
//! `Trial`/`Expired` se siguen calculando por compatibilidad con el fichero de
//! estado existente, pero no gobiernan nada.
//!
//! State of truth lives in `AppData/license.json`, NOT in localStorage. This is
//! deliberate: clearing the browser cache must not orphan an activated key. The
//! frontend reads state by calling Tauri commands; it never writes to disk
//! directly.

use std::path::PathBuf;
use std::sync::Mutex;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

const STATE_FILE: &str = "license.json";
const TRIAL_DAYS: i64 = 14;
const LEMON_API: &str = "https://api.lemonsqueezy.com/v1";

// ---------------------------------------------------------------------------
// On-disk state
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseState {
    /// ISO-8601 timestamp of the first time the app ever booted on this machine.
    pub first_launch: DateTime<Utc>,
    /// Stable UUID generated on first boot. Becomes the `instance_name` on
    /// Lemon Squeezy so the same machine never burns two activation slots.
    pub machine_id: String,
    /// The license key the user pasted. `None` while in trial.
    pub key: Option<String>,
    /// The Lemon Squeezy `instance.id` returned by /activate. Used by /validate
    /// and /deactivate to refer to *this* activation.
    pub instance_id: Option<String>,
    /// Frontend-facing summary. See [`LicenseStatus`].
    pub status: LicenseStatus,
    /// When we last hit Lemon Squeezy successfully (any endpoint).
    pub last_validated_at: Option<DateTime<Utc>>,
    /// How many devices the license allows. Mirrored from Lemon Squeezy so the
    /// UI can display "1/3 activations" without an extra round-trip.
    pub activation_limit: Option<u32>,
    pub activation_usage: Option<u32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LicenseStatus {
    /// No key yet, within the 14-day grace window.
    Trial,
    /// Key activated and confirmed by Lemon Squeezy.
    Active,
    /// Trial elapsed, no key. La app sigue funcionando entera — este estado
    /// ya no bloquea nada, solo significa "aún no ha apoyado el proyecto".
    Expired,
    /// Key was valid but Lemon Squeezy has since marked it invalid (refund,
    /// chargeback, disabled in dashboard). Tampoco bloquea nada.
    Invalid,
}

impl LicenseState {
    fn new() -> Self {
        Self {
            first_launch: Utc::now(),
            machine_id: Uuid::new_v4().to_string(),
            key: None,
            instance_id: None,
            status: LicenseStatus::Trial,
            last_validated_at: None,
            activation_limit: None,
            activation_usage: None,
        }
    }

    /// Days remaining in the trial. Negative once expired.
    pub fn trial_days_left(&self) -> i64 {
        let elapsed = (Utc::now() - self.first_launch).num_days();
        TRIAL_DAYS - elapsed
    }

    /// Recompute `status` from `key`/`first_launch` after any mutation.
    /// Doesn't talk to the network — that's [`refresh_status_with_api`].
    fn recompute_status_local(&mut self) {
        if self.status == LicenseStatus::Active || self.status == LicenseStatus::Invalid {
            // Active stays active until /validate says otherwise.
            // Invalid stays invalid until the user re-activates.
            return;
        }
        if self.trial_days_left() <= 0 && self.key.is_none() {
            self.status = LicenseStatus::Expired;
        } else {
            self.status = LicenseStatus::Trial;
        }
    }
}

// Wrapped in a Mutex so concurrent IPC calls don't race on the file.
pub struct LicenseStore {
    path: PathBuf,
    inner: Mutex<LicenseState>,
}

impl LicenseStore {
    pub fn load(app: &AppHandle) -> Result<Self, String> {
        let dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("AppData: {e}"))?;
        std::fs::create_dir_all(&dir).map_err(|e| format!("mkdir AppData: {e}"))?;
        let path = dir.join(STATE_FILE);

        let mut state = if path.exists() {
            let raw = std::fs::read_to_string(&path).map_err(|e| format!("read {e}"))?;
            serde_json::from_str::<LicenseState>(&raw).unwrap_or_else(|err| {
                eprintln!("[license] corrupt state file ({err}); resetting");
                LicenseState::new()
            })
        } else {
            LicenseState::new()
        };
        state.recompute_status_local();

        // Persist immediately on first boot so we have a stable
        // machine_id / first_launch.
        let store = Self { path, inner: Mutex::new(state) };
        store.flush()?;
        Ok(store)
    }

    pub fn snapshot(&self) -> LicenseState {
        self.inner.lock().unwrap().clone()
    }

    fn mutate<F>(&self, f: F) -> Result<LicenseState, String>
    where
        F: FnOnce(&mut LicenseState),
    {
        {
            let mut guard = self.inner.lock().unwrap();
            f(&mut guard);
            guard.recompute_status_local();
        }
        self.flush()?;
        Ok(self.snapshot())
    }

    fn flush(&self) -> Result<(), String> {
        let snapshot = self.snapshot();
        let json = serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())?;
        std::fs::write(&self.path, json).map_err(|e| format!("write {e}"))
    }
}

// ---------------------------------------------------------------------------
// Lemon Squeezy API
// ---------------------------------------------------------------------------
//
// These three endpoints accept only `license_key` (+ instance info) — no API
// key needed. Safe to call from the client directly.
// Docs: https://docs.lemonsqueezy.com/api/license-api

#[derive(Debug, Deserialize)]
struct LemonLicenseKey {
    status: String, // "active" | "inactive" | "expired" | "disabled"
    activation_limit: Option<u32>,
    activation_usage: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct LemonInstance {
    id: String,
}

#[derive(Debug, Deserialize)]
struct LemonResponse {
    #[serde(default)]
    activated: bool,
    #[serde(default)]
    valid: bool,
    #[serde(default)]
    deactivated: bool,
    error: Option<String>,
    license_key: Option<LemonLicenseKey>,
    instance: Option<LemonInstance>,
}

async fn ls_activate(key: &str, machine_id: &str) -> Result<LemonResponse, String> {
    reqwest::Client::new()
        .post(format!("{LEMON_API}/licenses/activate"))
        .header("Accept", "application/json")
        .form(&[("license_key", key), ("instance_name", machine_id)])
        .send()
        .await
        .map_err(|e| format!("Conectando con Lemon Squeezy: {e}"))?
        .json::<LemonResponse>()
        .await
        .map_err(|e| format!("Respuesta inesperada: {e}"))
}

async fn ls_validate(key: &str, instance_id: &str) -> Result<LemonResponse, String> {
    reqwest::Client::new()
        .post(format!("{LEMON_API}/licenses/validate"))
        .header("Accept", "application/json")
        .form(&[("license_key", key), ("instance_id", instance_id)])
        .send()
        .await
        .map_err(|e| format!("Conectando con Lemon Squeezy: {e}"))?
        .json::<LemonResponse>()
        .await
        .map_err(|e| format!("Respuesta inesperada: {e}"))
}

async fn ls_deactivate(key: &str, instance_id: &str) -> Result<LemonResponse, String> {
    reqwest::Client::new()
        .post(format!("{LEMON_API}/licenses/deactivate"))
        .header("Accept", "application/json")
        .form(&[("license_key", key), ("instance_id", instance_id)])
        .send()
        .await
        .map_err(|e| format!("Conectando con Lemon Squeezy: {e}"))?
        .json::<LemonResponse>()
        .await
        .map_err(|e| format!("Respuesta inesperada: {e}"))
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn license_get_state(app: AppHandle) -> Result<LicenseState, String> {
    let store = app.state::<LicenseStore>();
    Ok(store.snapshot())
}

#[tauri::command]
pub async fn license_activate(app: AppHandle, key: String) -> Result<LicenseState, String> {
    let key = key.trim().to_string();
    if key.is_empty() {
        return Err("La clave de licencia está vacía.".into());
    }

    let machine_id = {
        let store = app.state::<LicenseStore>();
        store.snapshot().machine_id
    };

    let resp = ls_activate(&key, &machine_id).await?;
    if !resp.activated {
        return Err(resp
            .error
            .unwrap_or_else(|| "Clave inválida o sin activaciones disponibles.".into()));
    }
    let instance_id = resp
        .instance
        .as_ref()
        .map(|i| i.id.clone())
        .ok_or_else(|| "Lemon Squeezy no devolvió un instance_id.".to_string())?;
    let lk = resp.license_key.as_ref();

    let store = app.state::<LicenseStore>();
    store.mutate(|s| {
        s.key = Some(key);
        s.instance_id = Some(instance_id);
        s.status = LicenseStatus::Active;
        s.last_validated_at = Some(Utc::now());
        s.activation_limit = lk.and_then(|k| k.activation_limit);
        s.activation_usage = lk.and_then(|k| k.activation_usage);
    })
}

#[tauri::command]
pub async fn license_validate(app: AppHandle) -> Result<LicenseState, String> {
    let (key, instance_id) = {
        let store = app.state::<LicenseStore>();
        let s = store.snapshot();
        match (s.key, s.instance_id) {
            (Some(k), Some(i)) => (k, i),
            _ => return Ok(store.snapshot()), // nothing to validate yet
        }
    };

    let resp = ls_validate(&key, &instance_id).await?;
    let lk = resp.license_key.as_ref();
    let lk_status = lk.map(|k| k.status.as_str()).unwrap_or("");
    let new_status = if resp.valid && lk_status == "active" {
        LicenseStatus::Active
    } else {
        LicenseStatus::Invalid
    };

    let store = app.state::<LicenseStore>();
    store.mutate(|s| {
        s.status = new_status;
        s.last_validated_at = Some(Utc::now());
        s.activation_limit = lk.and_then(|k| k.activation_limit);
        s.activation_usage = lk.and_then(|k| k.activation_usage);
    })
}

#[tauri::command]
pub async fn license_deactivate(app: AppHandle) -> Result<LicenseState, String> {
    let (key, instance_id) = {
        let store = app.state::<LicenseStore>();
        let s = store.snapshot();
        match (s.key, s.instance_id) {
            (Some(k), Some(i)) => (k, i),
            _ => return Ok(store.snapshot()),
        }
    };

    let resp = ls_deactivate(&key, &instance_id).await?;
    if !resp.deactivated {
        return Err(resp
            .error
            .unwrap_or_else(|| "No se pudo desactivar la licencia.".into()));
    }

    let store = app.state::<LicenseStore>();
    store.mutate(|s| {
        s.key = None;
        s.instance_id = None;
        // After deactivation we fall back to whatever the trial calendar says.
        s.status = if s.trial_days_left() > 0 {
            LicenseStatus::Trial
        } else {
            LicenseStatus::Expired
        };
        s.activation_limit = None;
        s.activation_usage = None;
    })
}
