# Run only after configuring SQL Server and backend/.env and ai-service/.env.
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Write-Host "Starting AI service, backend and frontend in separate PowerShell windows..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @('-NoExit','-ExecutionPolicy','Bypass','-File',(Join-Path $root 'scripts\Start-AI.ps1'))
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList @('-NoExit','-ExecutionPolicy','Bypass','-File',(Join-Path $root 'scripts\Start-Backend.ps1'))
Start-Process powershell -ArgumentList @('-NoExit','-ExecutionPolicy','Bypass','-File',(Join-Path $root 'scripts\Start-Frontend.ps1'))
Write-Host 'Frontend: http://localhost:5173 ; Backend: http://localhost:8080/api/health ; AI: http://localhost:8000/health' -ForegroundColor Green
