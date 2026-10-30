$ErrorActionPreference = "Stop"

Write-Host "=== Alya Companion - installation Auth V1 + V2 ===" -ForegroundColor Cyan

if (-not (Test-Path ".\src-tauri\tauri.conf.json")) {
  throw "Lance ce script depuis la racine du projet Alya Companion."
}

Write-Host "[1/5] Dépendances frontend..." -ForegroundColor Yellow
npm install @supabase/supabase-js @tauri-apps/plugin-deep-link @tauri-apps/plugin-opener
if ($LASTEXITCODE -ne 0) { throw "npm install a échoué." }

Write-Host "[2/5] Dépendances Rust/Tauri..." -ForegroundColor Yellow
Push-Location ".\src-tauri"
try {
  cargo add tauri-plugin-deep-link
  if ($LASTEXITCODE -ne 0) { throw "cargo add tauri-plugin-deep-link a échoué." }
  cargo add tauri-plugin-opener
  if ($LASTEXITCODE -ne 0) { throw "cargo add tauri-plugin-opener a échoué." }
  cargo add tauri-plugin-single-instance --features deep-link
  if ($LASTEXITCODE -ne 0) { throw "cargo add tauri-plugin-single-instance a échoué." }
} finally {
  Pop-Location
}

Write-Host "[3/5] Configuration Tauri + deep link..." -ForegroundColor Yellow
$confPath = ".\src-tauri\tauri.conf.json"
$conf = Get-Content $confPath -Raw | ConvertFrom-Json

if (-not $conf.plugins) {
  $conf | Add-Member -NotePropertyName "plugins" -NotePropertyValue ([pscustomobject]@{})
}

$deepLinkConfig = [pscustomobject]@{
  desktop = [pscustomobject]@{
    schemes = @("alya-companion")
  }
}

if ($conf.plugins.PSObject.Properties.Name -contains "deep-link") {
  $conf.plugins."deep-link" = $deepLinkConfig
} else {
  $conf.plugins | Add-Member -NotePropertyName "deep-link" -NotePropertyValue $deepLinkConfig
}

# Supabase doit être autorisé par le CSP du WebView Tauri.
if ($conf.app -and $conf.app.security -and $conf.app.security.csp) {
  $csp = [string]$conf.app.security.csp
  if ($csp -notmatch "supabase\.co") {
    if ($csp -match "connect-src") {
      $csp = [regex]::new("connect-src\s+([^;]+);").Replace($csp, 'connect-src $1 https://*.supabase.co wss://*.supabase.co;', 1)
    } else {
      $csp += " connect-src 'self' ipc: http://ipc.localhost https://*.supabase.co wss://*.supabase.co;"
    }
    if ($csp -match "img-src") {
      $csp = [regex]::new("img-src\s+([^;]+);").Replace($csp, 'img-src $1 https://*.supabase.co;', 1)
    } else {
      $csp += " img-src 'self' asset: data: https://*.supabase.co;"
    }
    $conf.app.security.csp = $csp
  }
}

[System.IO.File]::WriteAllText((Resolve-Path $confPath), ($conf | ConvertTo-Json -Depth 100), ([System.Text.UTF8Encoding]::new($false)))

Write-Host "[4/5] Capabilities..." -ForegroundColor Yellow
$capPath = ".\src-tauri\capabilities\default.json"
$cap = Get-Content $capPath -Raw | ConvertFrom-Json
$permissions = @($cap.permissions)
foreach ($permission in @("core:event:default", "deep-link:default", "deep-link:allow-register", "deep-link:allow-is-registered", "opener:default")) {
  if (-not ($permissions -contains $permission)) {
    $permissions += $permission
  }
}
$cap.permissions = $permissions
[System.IO.File]::WriteAllText((Resolve-Path $capPath), ($cap | ConvertTo-Json -Depth 100), ([System.Text.UTF8Encoding]::new($false)))

Write-Host "[5/5] Initialisation des plugins dans lib.rs..." -ForegroundColor Yellow
$libPath = ".\src-tauri\src\lib.rs"
$lib = Get-Content $libPath -Raw

$missingPluginLines = @()
if ($lib -notmatch "tauri_plugin_single_instance::init") {
  $missingPluginLines += '        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))'
}
if ($lib -notmatch "tauri_plugin_deep_link::init") {
  $missingPluginLines += '        .plugin(tauri_plugin_deep_link::init())'
}
if ($lib -notmatch "tauri_plugin_opener::init") {
  $missingPluginLines += '        .plugin(tauri_plugin_opener::init())'
}

if ($missingPluginLines.Count -gt 0) {
  $needle = "tauri::Builder::default()"
  if (-not $lib.Contains($needle)) {
    throw "Impossible de trouver tauri::Builder::default() dans src-tauri/src/lib.rs. Ajoute les plugins manuellement avec le guide SETUP-COMPTES.md."
  }
  $replacement = $needle + "`r`n" + ($missingPluginLines -join "`r`n")
  $lib = $lib.Replace($needle, $replacement)
  [System.IO.File]::WriteAllText((Resolve-Path $libPath), $lib, ([System.Text.UTF8Encoding]::new($false)))
}


# Evite de committer par accident les variables locales.
$gitignorePath = ".\.gitignore"
if (Test-Path $gitignorePath) {
  $gitignore = Get-Content $gitignorePath -Raw
  if ($gitignore -notmatch "(?m)^\.env$") {
    Add-Content -Path $gitignorePath -Value "`r`n.env" -Encoding utf8
  }
}

Write-Host "" 
Write-Host "Installation technique terminée." -ForegroundColor Green
Write-Host "Il reste à :" -ForegroundColor White
Write-Host "  1. Créer/configurer Supabase."
Write-Host "  2. Exécuter supabase/alya_companion.sql dans le SQL Editor."
Write-Host "  3. Copier .env.example vers .env et renseigner les 2 valeurs."
Write-Host "  4. Ajouter alya-companion://auth/callback aux Redirect URLs Supabase."
Write-Host "  5. Activer Discord dans Supabase si tu veux le bouton Discord."
Write-Host ""
Write-Host "Puis teste : npm run build ; cargo check --manifest-path .\src-tauri\Cargo.toml ; npm run tauri dev" -ForegroundColor Cyan
