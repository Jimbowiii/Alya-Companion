use serde::{Deserialize, Serialize};
use tauri::{
  plugin::{Builder, PluginHandle, TauriPlugin},
  AppHandle, Manager, Runtime,
};

pub struct ModFolder<R: Runtime>(PluginHandle<R>);

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderResult {
  pub uri: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
  pub file_name: String,
  pub bytes: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ListFolderResult {
  files: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TreeArg<'a> {
  tree_uri: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CopyArg<'a> {
  tree_uri: &'a str,
  source_uri: &'a str,
  fallback_file_name: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadArg<'a> {
  tree_uri: &'a str,
  url: &'a str,
  fallback_file_name: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AssetArg<'a> {
  tree_uri: &'a str,
  asset_name: &'a str,
  file_name: &'a str,
}

impl<R: Runtime> ModFolder<R> {
  #[cfg(target_os = "android")]
  fn pick_folder(&self) -> Result<FolderResult, String> {
    self.0
      .run_mobile_plugin("pickFolder", ())
      .map_err(|e| e.to_string())
  }

  #[cfg(target_os = "android")]
  fn list_folder(&self, tree_uri: &str) -> Result<Vec<String>, String> {
    self.0
      .run_mobile_plugin::<ListFolderResult>("listFolder", TreeArg { tree_uri })
      .map(|result| result.files)
      .map_err(|e| e.to_string())
  }

  #[cfg(target_os = "android")]
  fn copy_to_folder(
    &self,
    tree_uri: &str,
    source_uri: &str,
    fallback_file_name: &str,
  ) -> Result<InstallResult, String> {
    self.0
      .run_mobile_plugin(
        "copyToFolder",
        CopyArg {
          tree_uri,
          source_uri,
          fallback_file_name,
        },
      )
      .map_err(|e| e.to_string())
  }

  #[cfg(target_os = "android")]
  fn download_to_folder(
    &self,
    tree_uri: &str,
    url: &str,
    fallback_file_name: &str,
  ) -> Result<InstallResult, String> {
    self.0
      .run_mobile_plugin(
        "downloadToFolder",
        DownloadArg {
          tree_uri,
          url,
          fallback_file_name,
        },
      )
      .map_err(|e| e.to_string())
  }

  #[cfg(target_os = "android")]
  fn install_packaged(
    &self,
    tree_uri: &str,
    asset_name: &str,
    file_name: &str,
  ) -> Result<InstallResult, String> {
    self.0
      .run_mobile_plugin(
        "installPackaged",
        AssetArg {
          tree_uri,
          asset_name,
          file_name,
        },
      )
      .map_err(|e| e.to_string())
  }
}

pub trait ModFolderExt<R: Runtime> {
  fn mod_folder(&self) -> &ModFolder<R>;
}

impl<R: Runtime, T: Manager<R>> ModFolderExt<R> for T {
  fn mod_folder(&self) -> &ModFolder<R> {
    self.state::<ModFolder<R>>().inner()
  }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("modfolder")
    .setup(|app, api| {
      #[cfg(target_os = "android")]
      {
        let handle = api.register_android_plugin("com.alya.companion.mobile", "ModFolderPlugin")?;
        app.manage(ModFolder::<R>(handle));
      }
      Ok(())
    })
    .build()
}

#[tauri::command]
pub fn mobile_pick_mod_folder<R: Runtime>(app: AppHandle<R>) -> Result<FolderResult, String> {
  #[cfg(target_os = "android")]
  {
    app.mod_folder().pick_folder()
  }

  #[cfg(not(target_os = "android"))]
  {
    let _ = app;
    Err("Disponible uniquement sur Android.".into())
  }
}

#[tauri::command]
pub fn mobile_list_mod_folder<R: Runtime>(
  app: AppHandle<R>,
  tree_uri: String,
) -> Result<Vec<String>, String> {
  #[cfg(target_os = "android")]
  {
    app.mod_folder().list_folder(&tree_uri)
  }

  #[cfg(not(target_os = "android"))]
  {
    let _ = (app, tree_uri);
    Err("Disponible uniquement sur Android.".into())
  }
}

#[tauri::command]
pub fn mobile_copy_mod_to_folder<R: Runtime>(
  app: AppHandle<R>,
  tree_uri: String,
  source_uri: String,
  fallback_file_name: String,
) -> Result<InstallResult, String> {
  #[cfg(target_os = "android")]
  {
    app.mod_folder()
      .copy_to_folder(&tree_uri, &source_uri, &fallback_file_name)
  }

  #[cfg(not(target_os = "android"))]
  {
    let _ = (app, tree_uri, source_uri, fallback_file_name);
    Err("Disponible uniquement sur Android.".into())
  }
}

#[tauri::command]
pub fn mobile_download_mod_to_folder<R: Runtime>(
  app: AppHandle<R>,
  tree_uri: String,
  url: String,
  fallback_file_name: String,
) -> Result<InstallResult, String> {
  #[cfg(target_os = "android")]
  {
    app.mod_folder()
      .download_to_folder(&tree_uri, &url, &fallback_file_name)
  }

  #[cfg(not(target_os = "android"))]
  {
    let _ = (app, tree_uri, url, fallback_file_name);
    Err("Disponible uniquement sur Android.".into())
  }
}

#[tauri::command]
pub fn mobile_install_packaged_mod<R: Runtime>(
  app: AppHandle<R>,
  tree_uri: String,
  asset_name: String,
  file_name: String,
) -> Result<InstallResult, String> {
  #[cfg(target_os = "android")]
  {
    app.mod_folder()
      .install_packaged(&tree_uri, &asset_name, &file_name)
  }

  #[cfg(not(target_os = "android"))]
  {
    let _ = (app, tree_uri, asset_name, file_name);
    Err("Disponible uniquement sur Android.".into())
  }
}

