@echo off
setlocal

set "OBS_APP_DIR=%~dp0"

set "OBS_PY=C:\Users\ayust\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
set "OBS_PYARGS="

if exist "%OBS_PY%" goto :run

where python >nul 2>nul
if not errorlevel 1 (
  set "OBS_PY=python"
  goto :run
)

where py >nul 2>nul
if not errorlevel 1 (
  set "OBS_PY=py"
  set "OBS_PYARGS=-3"
  goto :run
)

echo Python bulunamadi. Sistem yerelde acilamadi.
pause
exit /b 1

:run
powershell -NoProfile -ExecutionPolicy Bypass -Command "$url='http://127.0.0.1:8091/dashboard.html'; $ok=$false; try { $r=Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1; $ok=($r.StatusCode -eq 200) } catch {}; if(-not $ok){ $args=@(); if($env:OBS_PYARGS){ $args += $env:OBS_PYARGS }; $args += @('-m','http.server','8091','--bind','127.0.0.1','--directory',$env:OBS_APP_DIR); Start-Process -WindowStyle Hidden -FilePath $env:OBS_PY -ArgumentList $args; Start-Sleep -Milliseconds 900 }; Start-Process $url"

endlocal