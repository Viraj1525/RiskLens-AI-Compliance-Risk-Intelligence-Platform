# Build and start the stack using .env.production for Compose variable substitution and container env.
# Usage (from repo root): powershell -ExecutionPolicy Bypass -File .\scripts\docker-up.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$envFile = Join-Path $root ".env.production"
if (-not (Test-Path $envFile)) {
    Write-Error "Missing .env.production. Copy from .env.example and fill in secrets."
}

docker compose --env-file .env.production build
docker compose --env-file .env.production up -d

Write-Host "Frontend: http://localhost:8080"
Write-Host "Backend:  http://localhost:8000/health"
