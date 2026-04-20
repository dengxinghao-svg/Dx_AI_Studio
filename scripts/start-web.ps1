$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendDist = Join-Path $projectRoot "frontend\dist\index.html"
$uvExe = "C:\Users\XD\AppData\Local\Microsoft\WinGet\Links\uv.exe"
$backendDir = Join-Path $projectRoot "backend"

if (-not (Test-Path $uvExe)) {
  throw "uv 未安装或路径不存在: $uvExe"
}

if (-not (Test-Path $frontendDist)) {
  Write-Host "前端构建产物不存在，先执行 build-web.ps1 ..."
  & (Join-Path $PSScriptRoot "build-web.ps1")
}

Push-Location $backendDir
try {
  & $uvExe run uvicorn app.main:app --host 0.0.0.0 --port 8000
} finally {
  Pop-Location
}
