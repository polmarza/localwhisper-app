//! Free-tier weekly word quota.
//!
//! Free (non-premium) users can transcribe up to `WEEKLY_CAP` words per week;
//! trial and licensed users are unlimited and never touch this. Like the
//! license, the counter lives in `AppData/usage.json` — NOT localStorage — so
//! clearing the WebKit cache can't reset the quota. The frontend owns the cap
//! value and the gating; Rust just tracks the count and rolls the week over.

use std::path::PathBuf;
use std::sync::Mutex;

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

const STATE_FILE: &str = "usage.json";
const WEEK_DAYS: i64 = 7;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageState {
    /// Start of the current quota week.
    pub week_start: DateTime<Utc>,
    /// Words transcribed by the free tier within the current week.
    pub words_used: u32,
}

impl UsageState {
    fn new() -> Self {
        Self {
            week_start: Utc::now(),
            words_used: 0,
        }
    }

    /// If the stored week has fully elapsed, advance to the current one and
    /// zero the counter. Advances by whole weeks so the reset moment stays
    /// stable instead of drifting on each read.
    fn roll_if_needed(&mut self) {
        let now = Utc::now();
        let week = Duration::days(WEEK_DAYS);
        while now - self.week_start >= week {
            self.week_start += week;
            self.words_used = 0;
        }
    }
}

pub struct UsageStore {
    path: PathBuf,
    inner: Mutex<UsageState>,
}

impl UsageStore {
    pub fn load(app: &AppHandle) -> Result<Self, String> {
        let dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("AppData: {e}"))?;
        std::fs::create_dir_all(&dir).map_err(|e| format!("mkdir AppData: {e}"))?;
        let path = dir.join(STATE_FILE);

        let mut state = if path.exists() {
            let raw = std::fs::read_to_string(&path).map_err(|e| format!("read {e}"))?;
            serde_json::from_str::<UsageState>(&raw).unwrap_or_else(|_| UsageState::new())
        } else {
            UsageState::new()
        };
        state.roll_if_needed();

        let store = Self {
            path,
            inner: Mutex::new(state),
        };
        store.flush()?;
        Ok(store)
    }

    fn snapshot(&self) -> UsageState {
        self.inner.lock().unwrap().clone()
    }

    fn flush(&self) -> Result<(), String> {
        let snapshot = self.snapshot();
        let json = serde_json::to_string_pretty(&snapshot).map_err(|e| e.to_string())?;
        std::fs::write(&self.path, json).map_err(|e| format!("write {e}"))
    }
}

#[tauri::command]
pub fn usage_get_state(app: AppHandle) -> Result<UsageState, String> {
    let store = app.state::<UsageStore>();
    {
        let mut guard = store.inner.lock().unwrap();
        guard.roll_if_needed();
    }
    store.flush()?;
    Ok(store.snapshot())
}

#[tauri::command]
pub fn usage_add_words(app: AppHandle, words: u32) -> Result<UsageState, String> {
    let store = app.state::<UsageStore>();
    {
        let mut guard = store.inner.lock().unwrap();
        guard.roll_if_needed();
        guard.words_used = guard.words_used.saturating_add(words);
    }
    store.flush()?;
    Ok(store.snapshot())
}
