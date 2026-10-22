# Safe first-time setup helper for this full source distribution.
# Does not overwrite existing environment files or secrets.
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
foreach($part in @('backend','ai-service')) {
  $example=Join-Path $root "$part\.env.example"
  $real=Join-Path $root "$part\.env"
  if (!(Test-Path $real)) {
    Copy-Item -LiteralPath $example -Destination $real
    Write-Host "Created $part/.env template. Fill in its secrets before running." -ForegroundColor Yellow
  } else {
    Write-Host "Existing $part/.env preserved." -ForegroundColor Green
  }
}
Write-Host 'Read docs/ENGINEERING_INTELLIGENCE.md. Start AI, Backend, Frontend with scripts/Start-*.ps1.' -ForegroundColor Cyan
