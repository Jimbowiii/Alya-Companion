$ErrorActionPreference = "Stop"

Write-Host "== Alya Companion / Windows build ==" -ForegroundColor Magenta

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js 22+ est requis."
}
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  throw "Rust 1.90+ est requis. Installe rustup puis relance ce script."
}

npm install
npm run prepare:xdelta
npm run tauri build

Write-Host "Build terminé. Installateurs dans src-tauri\\target\\release\\bundle" -ForegroundColor Green
