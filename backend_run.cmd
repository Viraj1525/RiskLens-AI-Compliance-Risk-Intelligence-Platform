@echo off
setlocal
cd /d "%~dp0backend"
"%~dp0.venv\Scripts\python.exe" -m uvicorn app:app --host 127.0.0.1 --port 8000
