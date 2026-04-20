$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $projectRoot "frontend"
$nodeDir = "C:\Program Files\nodejs"
$nodeExe = "C:\Program Files\nodejs\node.exe"
$pnpmScript = "C:\Users\XD\AppData\Roaming\npm\node_modules\pnpm\bin\pnpm.cjs"

if (-not (Test-Path $nodeExe)) {
  throw "Node.js 未安装或路径不存在: $nodeExe"
}

if (-not (Test-Path $pnpmScript)) {
  throw "pnpm 未安装或路径不存在: $pnpmScript"
}

$env:Path = "$nodeDir;C:\Users\XD\AppData\Roaming\npm;$env:Path"

Push-Location $frontendDir
try {
  & $nodeExe $pnpmScript build
} finally {
  Pop-Location
}
