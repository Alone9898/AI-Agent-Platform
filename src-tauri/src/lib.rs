mod sidecar;
mod tray;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // When second instance is launched, focus the existing window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Setup system tray
            tray::setup_tray(app)?;

            // Start NestJS sidecar
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                sidecar::start_sidecar(&app_handle).await;
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    let _ = window.hide();
                    api.prevent_close();
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_data_dir,
            check_sidecar_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_data_dir(app: tauri::AppHandle) -> String {
    let data_dir = app.path().app_data_dir().expect("failed to get data dir");
    data_dir.to_string_lossy().to_string()
}

#[tauri::command]
fn check_sidecar_status() -> bool {
    sidecar::is_sidecar_running()
}
