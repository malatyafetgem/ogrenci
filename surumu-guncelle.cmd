@echo off
setlocal
cd /d "%~dp0"

echo.
echo ========================================
echo        Surum Guncelleme Araci
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi.
  echo Node.js LTS surumunu yukleyip tekrar deneyin.
  echo.
  pause
  exit /b 1
)

if not exist "%~dp0bump-version.mjs" (
  echo [HATA] bump-version.mjs bu klasorde bulunamadi.
  echo Bu CMD dosyasi sistem dosyalarinin oldugu ana klasorde olmali.
  echo.
  pause
  exit /b 1
)

node "%~dp0bump-version.mjs"

if errorlevel 1 (
  echo.
  echo [HATA] Guncelleme sirasinda bir sorun olustu.
  echo Yukaridaki hata mesajini kontrol edin.
  echo.
  pause
  exit /b 1
)

echo.
echo [OK] Surum ve cache bilgileri guncellendi.
echo.
pause
endlocal