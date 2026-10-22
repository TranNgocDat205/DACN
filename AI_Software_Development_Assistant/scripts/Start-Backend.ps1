$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $PSScriptRoot 'Load-Env.ps1')
Set-Location (Join-Path $root 'backend')
Import-DevPilotEnv (Join-Path (Get-Location) '.env')
if (Test-DevPilotPlaceholder $env:DB_PASSWORD) { throw 'DB_PASSWORD must be set in backend/.env.' }
if (Test-DevPilotPlaceholder $env:AI_INTERNAL_KEY) { throw 'AI_INTERNAL_KEY must be set in backend/.env.' }
if (-not $env:AI_SERVICE_URL) { $env:AI_SERVICE_URL = 'http://127.0.0.1:8000' }
if ($env:AI_SERVICE_URL -notmatch '^http://(127\.0\.0\.1|localhost):8000/?$') {
    throw 'AI_SERVICE_URL must be http://127.0.0.1:8000 (plain HTTP, not HTTPS).'
}
# Verify JDK without executing `java -version`.
# In Windows PowerShell 5.1, Java prints -version to stderr. With
# ErrorActionPreference=Stop that can raise a NativeCommandError even on success.
function Test-DevPilotJdk21Plus {
    param([string]$JdkHome)
    if ([string]::IsNullOrWhiteSpace($JdkHome)) { return $false }
    if (-not (Test-Path (Join-Path $JdkHome 'bin\java.exe'))) { return $false }
    if (-not (Test-Path (Join-Path $JdkHome 'bin\javac.exe'))) { return $false }
    $releaseFile = Join-Path $JdkHome 'release'
    if (-not (Test-Path $releaseFile)) { return $false }
    $versionLine = Get-Content $releaseFile | Where-Object { $_ -match '^JAVA_VERSION=' } | Select-Object -First 1
    if ($versionLine -match '^JAVA_VERSION="?([0-9]+)(?:[."]|$)') {
        return ([int]$Matches[1] -ge 21)
    }
    return $false
}
if (-not (Test-DevPilotJdk21Plus $env:JAVA_HOME)) {
    $candidates = @(
        (Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName),
        (Get-ChildItem 'C:\Program Files\Java' -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName),
        'C:\Program Files\Java\jdk-24'
    ) | Where-Object { $_ }
    foreach ($candidate in $candidates) {
        if (Test-DevPilotJdk21Plus $candidate) {
            $env:JAVA_HOME = $candidate
            break
        }
    }
}
if (-not (Test-DevPilotJdk21Plus $env:JAVA_HOME)) {
    throw 'JDK 21+ was not found. Set JAVA_HOME to a JDK 21+ folder (e.g. C:\Program Files\Java\jdk-24).'
}
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
Write-Host "Java environment: $env:JAVA_HOME" -ForegroundColor Cyan
if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) {
    $localMaven = Get-ChildItem 'C:\tools' -Recurse -File -Filter mvn.cmd -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($localMaven) { $env:PATH = "$($localMaven.DirectoryName);$env:PATH" }
}
if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) { throw 'Maven not found. Check C:\tools\apache-maven-3.10.0\bin or PATH.' }
# Check the internal key locally without spending FastRouter API credits.
try {
    $null = Invoke-RestMethod -Uri "$($env:AI_SERVICE_URL.TrimEnd('/'))/internal/check" -Headers @{'X-Internal-Key'=$env:AI_INTERNAL_KEY} -TimeoutSec 4
    Write-Host 'Backend <-> AI Service authentication OK.' -ForegroundColor Green
} catch {
    if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401) {
        throw 'AI_INTERNAL_KEY mismatch: backend/.env and ai-service/.env must use the same value. Restart both services.'
    }
    Write-Warning 'AI Service not ready or is an old version. Start scripts/Start-AI.ps1; then restart Backend for an AI connectivity check.'
}
Write-Host 'Starting Spring Boot (SQL Server + AI proxy)...' -ForegroundColor Cyan
& mvn spring-boot:run
if ($LASTEXITCODE -ne 0) { throw 'Backend startup failed. See Spring Boot errors above.' }
