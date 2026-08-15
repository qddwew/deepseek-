@echo off
rem install.bat - one-click installer for dsh-client-api-stats (Windows)
rem Usage: double-click it, or run install.bat from a command prompt.
rem (Pure ASCII; goto-based flow so it works under any codepage and any path.)
setlocal

rem Locate the plugin source directory
set "SCRIPT_DIR=%~dp0"

rem Locate the DSH home (DSH_HOME env wins, else ~/.dsh)
if defined DSH_HOME goto :use_env
set "DSH_HOME_DIR=%USERPROFILE%\.dsh"
goto :home_ok
:use_env
set "DSH_HOME_DIR=%DSH_HOME%"
:home_ok

if exist "%SCRIPT_DIR%package.json" goto :src_ok
echo [ERROR] Run this script from the plugin source directory.
exit /b 1
:src_ok

if exist "%DSH_HOME_DIR%\profiles" goto :home_ok2
echo [WARN] DSH home not found: %DSH_HOME_DIR%
echo        Make sure DSH is installed, or set DSH_HOME and retry.
exit /b 1
:home_ok2

rem 1) Copy the plugin into the profile's flat node_modules
set "TARGET=%DSH_HOME_DIR%\profiles\node_modules\@deepseek-ai\dsh-client-api-stats"
if not exist "%TARGET%" mkdir "%TARGET%"
copy /y "%SCRIPT_DIR%package.json" "%TARGET%\" >nul
if exist "%SCRIPT_DIR%lib" xcopy /e /i /y "%SCRIPT_DIR%lib" "%TARGET%\lib\" >nul
echo [OK] Plugin copied to: %TARGET%

rem 2) Register the entry in profiles\web\cordis.patch.yml
if exist "%DSH_HOME_DIR%\profiles\web" goto :profile_ok
echo [WARN] web profile directory not found - skipping patch registration.
echo        Add the api-stats entry manually to your profile's cordis.patch.yml.
goto :done
:profile_ok

set "PATCH=%DSH_HOME_DIR%\profiles\web\cordis.patch.yml"
if exist "%PATCH%" goto :patch_ok
echo # Your patch layer for this dsh profile, applied after every bundle layer:> "%PATCH%"
echo # a top-level YAML array of loader patch entries (id-targeted config>> "%PATCH%"
echo # overrides, disables, and insert lists; `!!js` expressions allowed).>> "%PATCH%"
:patch_ok

findstr /c:"api-stats" "%PATCH%" >nul
if errorlevel 1 goto :add_entry
echo [OK] cordis.patch.yml already contains the api-stats entry - skipped.
goto :done
:add_entry

echo.>> "%PATCH%"
echo # DeepSeek API balance ring plugin (above the settings button)>> "%PATCH%"
echo - insert:>> "%PATCH%"
echo     - id: api-stats>> "%PATCH%"
echo       name: '@deepseek-ai/dsh-client-api-stats'>> "%PATCH%"
echo [OK] Registered the api-stats entry in cordis.patch.yml.

:done
echo.
echo Done! Next steps:
echo   1. Restart the DSH web service (dsh web) or refresh the browser page;
echo   2. Make sure DEEPSEEK_API_KEY is set in %DSH_HOME_DIR%\.credentials.yaml;
echo   3. The balance ring appears above the settings button; hover it for details.
endlocal
