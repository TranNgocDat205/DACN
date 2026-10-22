$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $PSScriptRoot 'Load-Env.ps1')
Set-Location (Join-Path $root 'ai-service')
Import-DevPilotEnv (Join-Path (Get-Location) '.env')
if (Test-DevPilotPlaceholder $env:AI_INTERNAL_KEY) {
    throw 'AI_INTERNAL_KEY in ai-service/.env is missing or is a placeholder. It must match backend/.env.'
}
if (-not (Test-Path '.venv\Scripts\python.exe')) {
    py -3 -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Cannot create Python venv. Install Python 3.11+ and try again.' }
}
$python = '.\.venv\Scripts\python.exe'
# Avoid reinstalling dependencies every time when they already exist.
& $python -c 'import fastapi, uvicorn, httpx, multipart, pypdf, docx'
if ($LASTEXITCODE -ne 0) {
    & $python -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Python dependencies could not be installed.' }
}
$listener = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    throw "Port 8000 is already in use (PID $($listener.OwningProcess)). Stop the old AI Service before starting this version."
}
Write-Host 'Starting DevPilot AI Service: http://127.0.0.1:8000' -ForegroundColor Cyan
Write-Host 'FastRouter key loaded from ai-service/.env (value hidden).' -ForegroundColor Cyan
& $python -m uvicorn main:app --host 127.0.0.1 --port 8000
if ($LASTEXITCODE -ne 0) { throw 'AI Service exited with an error.' }
