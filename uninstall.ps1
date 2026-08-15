#requires -Version 5.1
<#
  uninstall.ps1 - uninstaller for dsh-client-api-stats
  Removes the plugin directory and drops the api-stats entry block from cordis.patch.yml.
  Usage: powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
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

$dshHome = Resolve-DshHome

# 1) Remove the plugin directory
$target = Join-Path $dshHome "profiles\node_modules\@deepseek-ai\dsh-client-api-stats"
if (Test-Path $target) {
    Remove-Item $target -Recurse -Force
    Write-Host "[OK] Removed plugin directory: $target" -ForegroundColor Green
} else {
    Write-Host "[INFO] Plugin directory not found: $target" -ForegroundColor Yellow
}

# 2) Remove the api-stats entry block from cordis.patch.yml.
#    The block is the contiguous chunk starting at the comment/insert that names
#    api-stats (with our plugin id/name lines), removed as one unit so leftover
#    half-lines never survive.
$patchPath = Join-Path $dshHome "profiles\web\cordis.patch.yml"
if (Test-Path $patchPath) {
    $content = Read-Utf8 $patchPath
    # Match: the comment line (unique to this plugin) followed by its
    # insert / id / name lines, each optional so partial blocks from older
    # installers are cleaned too. Name line tolerates a trailing newline or EOF.
    $pattern = "(?m)^[ \t]*# DeepSeek API balance ring plugin[^\r\n]*\r?\n" +
               "(?:[ \t]*- insert:[ \t]*\r?\n)?" +
               "(?:[ \t]*- id: api-stats[ \t]*\r?\n)?" +
               "(?:[ \t]*name: '[^']*dsh-client-api-stats'[ \t]*(?:\r?\n|\z))?"
    $newContent = [regex]::Replace($content, $pattern, "")
    if ($newContent -ne $content) {
        Write-Utf8 $patchPath $newContent
        Write-Host "[OK] Removed the api-stats entry from cordis.patch.yml." -ForegroundColor Green
    } else {
        Write-Host "[INFO] No api-stats entry found in cordis.patch.yml." -ForegroundColor Yellow
    }
} else {
    Write-Host "[INFO] cordis.patch.yml not found - skipped." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done. Restart the DSH web service (or refresh the page) and the ring disappears." -ForegroundColor Cyan
