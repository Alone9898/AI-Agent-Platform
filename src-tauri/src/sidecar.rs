use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager};

static SIDECAR_RUNNING: AtomicBool = AtomicBool::new(false);

pub async fn start_sidecar(app: &AppHandle) {
    let data_dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");

    // Ensure data directory exists
    let _ = std::fs::create_dir_all(&data_dir);

    // Set DATABASE_URL environment variable for the sidecar
    let db_path = data_dir.join("data.db");
    let db_url = format!("file:{}", db_path.to_string_lossy());

    log::info!("Starting NestJS sidecar with DATABASE_URL: {}", db_url);

    // Find the nestjs directory relative to the project root
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

    // Run node directly
    let result = tokio::process::Command::new("node")
        .current_dir(&nestjs_dir)
        .arg("dist/main.js")
        .env("DATABASE_URL", &db_url)
        .env("PORT", "3000")
        .spawn();

    match result {
        Ok(mut child) => {
            SIDECAR_RUNNING.store(true, Ordering::SeqCst);
            log::info!("NestJS sidecar started successfully");
            let _ = child.wait().await;
            SIDECAR_RUNNING.store(false, Ordering::SeqCst);
            log::info!("NestJS sidecar exited");
        }
        Err(e) => {
            log::error!("Failed to start NestJS sidecar: {}", e);
        }
    }
}

pub fn is_sidecar_running() -> bool {
    SIDECAR_RUNNING.load(Ordering::SeqCst)
}
