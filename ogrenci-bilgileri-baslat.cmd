@echo off
setlocal
cd /d "%~dp0"

echo.
echo Ogrenci Bilgileri Sistemi baslatiliyor...
echo.
echo Bu pencere acik kaldigi surece sistem calisir.
echo Kapatmak icin bu pencereyi kapatabilir veya CTRL+C yapabilirsiniz.
echo.

where python >nul 2>nul
if not errorlevel 1 (
  start "" "http://127.0.0.1:8091/"
  python -m http.server 8091 --bind 127.0.0.1
  exit /b
)

where py >nul 2>nul
if not errorlevel 1 (
  start "" "http://127.0.0.1:8091/"
  py -3 -m http.server 8091 --bind 127.0.0.1
  exit /b
)

echo Python bulunamadi.
echo Lutfen Python kurun ya da sistemi Electron ile paketleyin.
echo.
pause
exit /b 1
