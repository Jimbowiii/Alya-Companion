$ErrorActionPreference = "Stop"

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Version = "3.2.2"
$ArchiveName = "xdelta3-$Version-windows-x86_64.zip"
$Url = "https://github.com/jmacd/xdelta/releases/download/v$Version/$ArchiveName"
$ExpectedArchiveSha256 = "d48f7651d86b78fdca397057b46601f89131f37219675df736db70af44ec3379"
$ExpectedExeSha256 = "732980d52f9220dc81817ccdd0c295eadce8a0048a24c2a771a73f791ac824e9"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BinaryDir = Join-Path $ProjectRoot "src-tauri\binaries"
$TargetTriple = (& rustc --print host-tuple).Trim()

if ($TargetTriple -ne "x86_64-pc-windows-msvc") {
  throw "Alya Companion fournit actuellement xdelta3 pour Windows x64 uniquement. Cible detectee : $TargetTriple"
}

$Sidecar = Join-Path $BinaryDir "xdelta3-$TargetTriple.exe"
New-Item -ItemType Directory -Force -Path $BinaryDir | Out-Null

# Ne reutilise un ancien sidecar que s'il correspond exactement au binaire 3.2.2 attendu.
if (Test-Path $Sidecar) {
  $ExistingHash = (Get-FileHash -Algorithm SHA256 -Path $Sidecar).Hash.ToLowerInvariant()
  if ($ExistingHash -eq $ExpectedExeSha256) {
    Write-Host "xdelta3 $Version deja pret : $Sidecar" -ForegroundColor DarkGreen
    exit 0
  }
  Write-Host "Ancien xdelta3 detecte, remplacement..." -ForegroundColor Yellow
  Remove-Item -Force $Sidecar -ErrorAction SilentlyContinue
}

$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("alya-xdelta-" + [Guid]::NewGuid().ToString("N"))
$Archive = Join-Path $TempRoot $ArchiveName
$Extract = Join-Path $TempRoot "extract"
New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null

try {
  Write-Host "Telechargement de xdelta3 $Version depuis le depot officiel..." -ForegroundColor Cyan
  Invoke-WebRequest -Uri $Url -OutFile $Archive -UseBasicParsing

  $ActualArchiveHash = (Get-FileHash -Algorithm SHA256 -Path $Archive).Hash.ToLowerInvariant()
  if ($ActualArchiveHash -ne $ExpectedArchiveSha256) {
    throw "SHA-256 de l'archive xdelta3 invalide. Attendu: $ExpectedArchiveSha256 / recu: $ActualArchiveHash"
  }

  Expand-Archive -Path $Archive -DestinationPath $Extract -Force
  $Exe = Get-ChildItem -Path $Extract -Recurse -Filter "xdelta3.exe" | Select-Object -First 1
  if (-not $Exe) {
    throw "xdelta3.exe est introuvable dans l'archive officielle."
  }

  $ActualExeHash = (Get-FileHash -Algorithm SHA256 -Path $Exe.FullName).Hash.ToLowerInvariant()
  if ($ActualExeHash -ne $ExpectedExeSha256) {
    throw "SHA-256 de xdelta3.exe invalide. Attendu: $ExpectedExeSha256 / recu: $ActualExeHash"
  }

  Copy-Item -Force $Exe.FullName $Sidecar
  & $Sidecar -V *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Le binaire xdelta3 extrait ne s'execute pas correctement."
  }

  Write-Host "xdelta3 $Version pret pour Tauri : $Sidecar" -ForegroundColor Green
} finally {
  Remove-Item -Recurse -Force $TempRoot -ErrorAction SilentlyContinue
}
