$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$venvPython = Join-Path $root ".venv\Scripts\python.exe"
$requirements = Join-Path $root "requirements.txt"
$envExample = Join-Path $root ".env.example"
$envFile = Join-Path $root ".env"
$frontendDir = Join-Path $root "frontend"

Write-Host "RiskLens dev setup (Windows)"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "Python is not on PATH. Install Python 3.11+ and retry."
}

$pythonVersion = (& python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')").Trim()
Write-Host "Using system Python $pythonVersion"

if ($pythonVersion -ge "3.14") {
    Write-Warning "Python 3.14+ may show LangChain/Pydantic compatibility warnings. Python 3.11 or 3.12 is recommended."
}

if (-not (Test-Path $venvPython)) {
    Write-Host "Creating virtual environment..."
    python -m venv (Join-Path $root ".venv")
}

Write-Host "Installing backend dependencies (use python -m pip to avoid stale pip launchers)..."
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r $requirements

if (-not (Test-Path $envFile)) {
    Copy-Item $envExample $envFile
    Write-Host "Created .env from .env.example"
} else {
    Write-Host ".env already exists"
}

Write-Host "Installing frontend dependencies..."
Push-Location $frontendDir
npm install
Pop-Location

Write-Host ""
Write-Host "Setup complete."
Write-Host "Start dev servers: powershell -ExecutionPolicy Bypass -File .\start-dev.ps1"
Write-Host "Backend only: cd backend; ..\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload"
Write-Host "Frontend only: cd frontend; npm run dev -- --host 127.0.0.1 --port 5173"
