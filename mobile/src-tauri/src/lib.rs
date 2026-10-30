mod mod_folder;
mod surf_mobile;

use surf_mobile::{mobile_surf_apply_patch, mobile_surf_hash_file};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(mod_folder::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        // IMPORTANT: fs must be initialized before persisted-scope.
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .invoke_handler(tauri::generate_handler![
            mobile_surf_hash_file,
            mobile_surf_apply_patch,
            mod_folder::mobile_pick_mod_folder,
            mod_folder::mobile_list_mod_folder,
            mod_folder::mobile_copy_mod_to_folder,
            mod_folder::mobile_download_mod_to_folder,
            mod_folder::mobile_install_packaged_mod
        ])
        .run(tauri::generate_context!())
        .expect("error while running ALYA Companion Mobile");
}

