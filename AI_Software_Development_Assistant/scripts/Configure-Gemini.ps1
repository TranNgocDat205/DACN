# Configure DevPilot Gemini provider without putting credentials in terminal history.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $root 'ai-service\.env'
if (-not (Test-Path -LiteralPath $envFile -PathType Leaf)) {
    throw 'ai-service/.env not found. Create it from ai-service/.env.example and preserve your AI_INTERNAL_KEY first.'
}

$secure = Read-Host 'Paste your NEW Gemini API key (hidden)' -AsSecureString
$ptr = [IntPtr]::Zero
try {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    if ([string]::IsNullOrWhiteSpace($key)) { throw 'Gemini key is empty.' }
    if ($key -match '[\r\n]') { throw 'Gemini key has invalid line breaks.' }

    function Set-EnvEntry {
        param([string[]]$Lines, [string]$Name, [string]$Value)
        $found = $false
        $result = New-Object 'System.Collections.Generic.List[string]'
        foreach ($line in $Lines) {
            if ($line -match ('^\s*' + [regex]::Escape($Name) + '\s*=')) {
                if (-not $found) { $result.Add("$Name=$Value"); $found = $true }
            } else { $result.Add($line) }
        }
        if (-not $found) { $result.Add("$Name=$Value") }
        return $result.ToArray()
    }

    $lines = [System.IO.File]::ReadAllLines($envFile, [Text.Encoding]::UTF8)
    $lines = Set-EnvEntry -Lines $lines -Name 'AI_PROVIDER' -Value 'gemini'
    $lines = Set-EnvEntry -Lines $lines -Name 'GEMINI_MODEL' -Value 'gemini-3.5-flash-lite'
    $lines = Set-EnvEntry -Lines $lines -Name 'GEMINI_API_KEY' -Value $key
    [System.IO.File]::WriteAllLines($envFile, [string[]]$lines, (New-Object Text.UTF8Encoding($false)))
    Write-Host 'Configured Gemini. Restart AI Service, then check /health.' -ForegroundColor Green
} finally {
    if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
    $key = $null
}
