$ErrorActionPreference = "SilentlyContinue"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidsDir = Join-Path $root ".run"

foreach ($name in @("backend", "frontend")) {
    $pidFile = Join-Path $pidsDir "$name.pid"

    if (-not (Test-Path $pidFile)) {
        continue
    }

    $pid = Get-Content $pidFile | Select-Object -First 1
    if ($pid) {
        Stop-Process -Id ([int]$pid) -Force
    }

    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

Write-Output "Stopped tracked dev processes."
