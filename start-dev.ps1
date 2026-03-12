$ErrorActionPreference = "Stop"

function Start-DetachedCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string]$WorkingDirectory
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "C:\Windows\System32\cmd.exe"
    $psi.Arguments = "/c $Command"
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $process = [System.Diagnostics.Process]::Start($psi)

    if ($null -eq $process) {
        throw "Failed to start command: $Command"
    }

    return $process
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$logsDir = Join-Path $root "logs"
$pidsDir = Join-Path $root ".run"

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
New-Item -ItemType Directory -Force -Path $pidsDir | Out-Null

$backendPidFile = Join-Path $pidsDir "backend.pid"
$frontendPidFile = Join-Path $pidsDir "frontend.pid"

$backendOut = Join-Path $logsDir "backend.out.log"
$backendErr = Join-Path $logsDir "backend.err.log"
$frontendOut = Join-Path $logsDir "frontend.out.log"
$frontendErr = Join-Path $logsDir "frontend.err.log"

foreach ($log in @($backendOut, $backendErr, $frontendOut, $frontendErr)) {
    if (Test-Path $log) {
        Remove-Item $log -Force -ErrorAction SilentlyContinue
    }
}

$backendRunner = Join-Path $root "backend_run.cmd"
$frontendRunner = Join-Path $root "frontend_run.cmd"

if (-not (Test-Path $backendRunner)) {
    throw "Backend runner not found at $backendRunner"
}

if (-not (Test-Path $frontendRunner)) {
    throw "Frontend runner not found at $frontendRunner"
}

$backendCommand = "`"$backendRunner`" 1>> `"$backendOut`" 2>> `"$backendErr`""
$frontendCommand = "`"$frontendRunner`" 1>> `"$frontendOut`" 2>> `"$frontendErr`""

$backendProc = Start-DetachedCommand -Command $backendCommand -WorkingDirectory (Join-Path $root "backend")
$frontendProc = Start-DetachedCommand -Command $frontendCommand -WorkingDirectory (Join-Path $root "frontend")

Set-Content -Path $backendPidFile -Value $backendProc.Id
Set-Content -Path $frontendPidFile -Value $frontendProc.Id

Write-Output "Backend PID: $($backendProc.Id)"
Write-Output "Frontend PID: $($frontendProc.Id)"
Write-Output "Logs: $logsDir"
