@echo off
setlocal
chcp 65001 >nul

echo.
echo  ╔══════════════════════════════════════╗
echo  ║       Surum Guncelleme Araci         ║
echo  ╚══════════════════════════════════════╝
echo.

:: Node.js kontrolü
where node >nul 2>nul
if errorlevel 1 (
  echo  [HATA] Node.js bulunamadi.
  echo.
  echo  Lutfen https://nodejs.org adresinden Node.js yukleyin.
  echo.
  pause
  exit /b 1
)

:: bump-version.js'in bu dizinde olup olmadığını kontrol et
if not exist "%~dp0bump-version.js" (
  echo  [HATA] bump-version.js bulunamadi.
  echo  Bu dosyanin bump-version.js ile ayni klasorde olmasi gerekiyor.
  echo.
  pause
  exit /b 1
)

:: Çalışma dizinini scriptin bulunduğu klasöre al
cd /d "%~dp0"

:: Scripti çalıştır
node bump-version.js

if errorlevel 1 (
  echo.
  echo  [HATA] Guncelleme sirasinda bir sorun olustu.
  echo.
  pause
  exit /b 1
)

echo  Tamamlandi. Bu pencereyi kapatabilirsiniz.
echo.
pause
endlocal
