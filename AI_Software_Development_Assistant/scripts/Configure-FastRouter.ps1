# Configure DevPilot to use FastRouter for LLM requests.
# Reads/writes only ai-service/.env; preserves existing secrets and AI_INTERNAL_KEY.
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $projectRoot 'ai-service\.env'
if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) {
    throw 'Missing ai-service/.env. Copy ai-service/.env.example first, then restore your existing private keys.'
}
function Set-EnvEntry {
    param([string[]]$Lines, [string]$Name, [string]$Value)
    $seen = $false
    $out = New-Object System.Collections.Generic.List[string]
    foreach ($line in $Lines) {
        if ($line -match ('^\s*' + [regex]::Escape($Name) + '\s*=')) {
            if (-not $seen) {
                $out.Add("$Name=$Value")
                $seen = $true
            }
        } else {
            $out.Add($line)
        }
    }
    if (-not $seen) { $out.Add("$Name=$Value") }
    return $out.ToArray()
}
$lines = [System.IO.File]::ReadAllLines($envFile, [Text.Encoding]::UTF8)
$existingKey = ''
foreach ($line in $lines) {
    if ($line -match '^\s*AI_API_KEY\s*=\s*(.*)$') {
        $existingKey = $Matches[1].Trim().Trim('"', "'")
        break
    }
}
$needKey = [string]::IsNullOrWhiteSpace($existingKey) -or $existingKey -match '^(REPLACE_|CHANGE_ME|YOUR_|NHAP_)'
if ($needKey) {
    Write-Host 'Missing FastRouter API key. Enter your FastRouter key (hidden).' -ForegroundColor Yellow
    $secure = Read-Host 'FastRouter API key' -AsSecureString
    $ptr = [IntPtr]::Zero
    try {
        $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        $newKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
        if ([string]::IsNullOrWhiteSpace($newKey)) { throw 'FastRouter API key is required.' }
        if ($newKey -match '[\r\n]') { throw 'API key cannot contain line breaks.' }
        $lines = Set-EnvEntry -Lines $lines -Name 'AI_API_KEY' -Value $newKey
    } finally {
        if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
        $newKey = $null
    }
}
$lines = Set-EnvEntry -Lines $lines -Name 'AI_PROVIDER' -Value 'fastrouter'
$lines = Set-EnvEntry -Lines $lines -Name 'AI_BASE_URL' -Value 'https://api.fastrouter.ai/api/v1'
$lines = Set-EnvEntry -Lines $lines -Name 'AI_MODEL' -Value 'fastrouter/auto'
[System.IO.File]::WriteAllLines($envFile, [string[]]$lines, (New-Object Text.UTF8Encoding($false)))
Write-Host 'FastRouter is now the selected LLM provider in ai-service/.env.' -ForegroundColor Green
Write-Host 'Restart the running AI Service (port 8000) and run scripts/Start-AI.ps1.'
Write-Host 'Then check http://127.0.0.1:8000/health for provider=FastRouter.AI and llm_configured=True.'
Write-Host 'This check verifies configuration only; test a real AI response from the UI.'
