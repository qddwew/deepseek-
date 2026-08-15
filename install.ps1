#requires -Version 5.1
<#
  install.ps1 - one-click installer for dsh-client-api-stats
  Locates the DSH home, copies the plugin, and registers it in cordis.patch.yml.
  Usage: powershell -ExecutionPolicy Bypass -File .\install.ps1
  (The script is pure ASCII so it runs on any Windows locale / PowerShell 5.1.)
#>
$ErrorActionPreference = "Stop"

function Resolve-DshHome {
    $envHome = $env:DSH_HOME
    if (-not [string]::IsNullOrWhiteSpace($envHome)) { return $envHome.Trim() }
    return (Join-Path $HOME ".dsh")
}

function Read-Utf8($path) {
    return [System.IO.File]::ReadAllText($path, [System.Text.UTF8Encoding]::new($false))
}

function Write-Utf8($path, $text) {
    [System.IO.File]::WriteAllText($path, $text, [System.Text.UTF8Encoding]::new($false))
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dshHome   = Resolve-DshHome

if (-not (Test-Path (Join-Path $scriptDir "package.json"))) {
    Write-Host "[ERROR] Run this script from the plugin source directory (the one containing package.json)." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path (Join-Path $dshHome "profiles"))) {
    Write-Host "[WARN] DSH home not found: $dshHome" -ForegroundColor Yellow
    Write-Host "       Make sure DSH is installed, or set the DSH_HOME environment variable and retry." -ForegroundColor Yellow
    exit 1
}

# 1) Copy the plugin into the profile's flat node_modules (sibling of the other
#    @deepseek-ai packages; Node parent-dir lookup resolves it from the profile).
$target = Join-Path $dshHome "profiles\node_modules\@deepseek-ai\dsh-client-api-stats"
New-Item -ItemType Directory -Path $target -Force | Out-Null
Copy-Item -Path (Join-Path $scriptDir "package.json") -Destination $target -Force
if (Test-Path (Join-Path $scriptDir "lib")) {
    Copy-Item -Path (Join-Path $scriptDir "lib") -Destination $target -Recurse -Force
}
Write-Host "[OK] Plugin copied to: $target" -ForegroundColor Green

# 2) Register the entry in profiles/web/cordis.patch.yml
$profileDir = Join-Path $dshHome "profiles\web"
$patchPath  = Join-Path $profileDir "cordis.patch.yml"
if (-not (Test-Path $profileDir)) {
    Write-Host "[WARN] web profile directory not found: $profileDir - skipping patch registration." -ForegroundColor Yellow
    Write-Host "       If your profile has a different name, add the entry manually to its cordis.patch.yml." -ForegroundColor Yellow
} else {
    if (-not (Test-Path $patchPath)) {
        $header = "# Your patch layer for this dsh profile, applied after every bundle layer:`n" +
                  "# a top-level YAML array of loader patch entries (id-targeted config`n" +
                  "# overrides, disables, and insert lists; ``!!js`` expressions allowed).`n"
        Write-Utf8 $patchPath $header
    }
    $content = Read-Utf8 $patchPath
    if ($content -match "api-stats") {
        Write-Host "[OK] cordis.patch.yml already contains the api-stats entry - skipped." -ForegroundColor Green
    } else {
        $entry = @"

# DeepSeek API balance ring plugin (above the settings button)
- insert:
    - id: api-stats
      name: '@deepseek-ai/dsh-client-api-stats'
"@
        # 确保条目以换行结尾，便于卸载脚本整块匹配
        $entry = $entry.TrimEnd("`r", "`n") + "`n"
        Write-Utf8 $patchPath ($content + $entry)
        Write-Host "[OK] Registered the api-stats entry in cordis.patch.yml." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Done! Next steps:" -ForegroundColor Cyan
Write-Host "  1. Restart the DSH web service (dsh web) or simply refresh the browser page;" -ForegroundColor Cyan
Write-Host "  2. Make sure DEEPSEEK_API_KEY is configured in <DSH_HOME>/.credentials.yaml;" -ForegroundColor Cyan
Write-Host "  3. The balance ring appears right above the settings button; hover it for details." -ForegroundColor Cyan
