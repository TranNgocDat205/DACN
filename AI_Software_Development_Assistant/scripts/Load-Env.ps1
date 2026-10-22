# Shared loader for Windows PowerShell 5.1 / PowerShell 7.
# Keep API keys and database passwords in .env files, not in command history.
function Import-DevPilotEnv {
    param([Parameter(Mandatory=$true)][string]$FilePath)
    if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
        throw "Missing configuration file: $FilePath"
    }
    foreach ($raw in [System.IO.File]::ReadAllLines((Resolve-Path -LiteralPath $FilePath).Path, [System.Text.Encoding]::UTF8)) {
        $line = $raw.TrimStart([char]0xFEFF).Trim()
        if (-not $line -or $line.StartsWith('#')) { continue }
        if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $name = $Matches[1]
            $value = $Matches[2].Trim()
            if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}

function Test-DevPilotPlaceholder {
    param([string]$Value)
    return ([string]::IsNullOrWhiteSpace($Value) -or $Value -match '^(REPLACE_|CHANGE_ME|YOUR_|NHAP_|MAT_KHAU_)')
}
