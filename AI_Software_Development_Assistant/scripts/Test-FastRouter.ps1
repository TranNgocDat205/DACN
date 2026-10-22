$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'Load-Env.ps1')
Import-DevPilotEnv (Join-Path $root 'ai-service\.env')

$baseUrl = 'http://127.0.0.1:8000'
$headers = @{
    'X-Internal-Key' = $env:AI_INTERNAL_KEY
}

Write-Host 'Step 1: Checking AI Service...'
$health = Invoke-RestMethod -Uri "$baseUrl/health"
Write-Host "AI status: $($health.status)"

Write-Host 'Step 2: Checking internal authentication...'
$auth = Invoke-RestMethod -Uri "$baseUrl/internal/check" -Headers $headers
Write-Host "Internal authentication: $($auth.status)"

Write-Host 'Step 3: Testing FastRouter...'
$payload = @{
    title = 'User login'
    description = 'Allow login with email and password.'
} | ConvertTo-Json -Compress

$result = Invoke-RestMethod `
    -Uri "$baseUrl/ai/analyze" `
    -Method POST `
    -Headers $headers `
    -ContentType 'application/json; charset=utf-8' `
    -Body ([System.Text.Encoding]::UTF8.GetBytes($payload)) `
    -TimeoutSec 90

Write-Host "Analysis mode: $($result.mode)"
$result | ConvertTo-Json -Depth 10