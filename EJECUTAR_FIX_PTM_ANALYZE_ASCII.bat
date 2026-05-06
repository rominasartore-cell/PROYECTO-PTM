@echo off
chcp 65001 > nul
powershell -ExecutionPolicy Bypass -File "%~dp0FIX_PTM_ANALYZE_ASCII.ps1"
pause
