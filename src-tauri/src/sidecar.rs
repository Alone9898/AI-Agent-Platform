use std::sync::{atomic::AtomicBool, Mutex};
use tauri::{AppHandle, Manager};

static SIDECAR_RUNNING: AtomicBool = AtomicBool::new(false);
static SIDECAR_CHILD: Mutex<Option<tokio::process::Child>> = Mutex::new(None);

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub async fn start_sidecar(app: &AppHandle) {
    let data_dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");

    let _ = std::fs::create_dir_all(&data_dir);

    let db_path = data_dir.join("data.db");
    let db_url = format!("file:{}", db_path.to_string_lossy());
    let secret_key_path = data_dir.join("local-secrets.key");

    log::info!("Starting NestJS sidecar with DATABASE_URL: {}", db_url);

    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let nestjs_dir = std::path::Path::new(manifest_dir).parent().unwrap().join("nestjs");

    if !nestjs_dir.exists() {
        log::error!("NestJS directory not found at: {:?}", nestjs_dir);
        return;
    }

    let dist_main = nestjs_dir.join("dist").join("main.js");

    if !dist_main.exists() {
        log::error!("NestJS dist/main.js not found. Please run 'npm run build' in nestjs directory.");
        return;
    }

    log::info!("Starting NestJS from: {:?}", dist_main);

    let mut cmd = tokio::process::Command::new("node");
    cmd.current_dir(&nestjs_dir)
        .arg("dist/main.js")
        .env("DATABASE_URL", &db_url)
        .env("XINGYAO_SECRET_KEY_PATH", &secret_key_path)
        .env("PORT", "3000");

    #[cfg(windows)]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let result = cmd.spawn();

    match result {
        Ok(child) => {
            *SIDECAR_CHILD.lock().unwrap() = Some(child);
            SIDECAR_RUNNING.store(true, std::sync::atomic::Ordering::SeqCst);
            log::info!("NestJS sidecar started successfully");

            tokio::spawn(async move {
                let mut child = {
                    let mut child_opt = SIDECAR_CHILD.lock().unwrap();
                    match child_opt.take() {
                        Some(c) => c,
                        None => {
                            log::error!("Sidecar child was already taken");
                            return;
                        }
                    }
                };
                let _ = child.wait().await;
                SIDECAR_RUNNING.store(false, std::sync::atomic::Ordering::SeqCst);
                log::info!("NestJS sidecar exited");
            });
        }
        Err(e) => {
            log::error!("Failed to start NestJS sidecar: {}", e);
        }
    }
}

pub fn stop_sidecar() {
    let mut child_opt = SIDECAR_CHILD.lock().unwrap();
    if let Some(mut child) = child_opt.take() {
        log::info!("Stopping NestJS sidecar...");
        let _ = child.kill();
        let _ = child.wait();
        SIDECAR_RUNNING.store(false, std::sync::atomic::Ordering::SeqCst);
        log::info!("NestJS sidecar stopped");
    }
}

pub fn is_sidecar_running() -> bool {
    SIDECAR_RUNNING.load(std::sync::atomic::Ordering::SeqCst)
}
