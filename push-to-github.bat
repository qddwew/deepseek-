@echo off
rem push-to-github.bat - Push dsh-client-api-stats to GitHub (run in YOUR terminal)
rem GCM will open your browser to authorize GitHub access; just confirm there.
chcp 65001 >nul 2>&1
setlocal

set "GIT=C:\Users\28916\.workbuddy\vendor\PortableGit\cmd\git.exe"
set "REPO=C:\Users\28916\Desktop\新建文件夹 (2)\dsh-client-api-stats"

if not exist "%GIT%" (
    echo [ERROR] git not found at %GIT%
    pause
    exit /b 1
)

echo ============================================================
echo   Pushing dsh-client-api-stats to GitHub
echo   Repo: https://github.com/qddwew/deepseek-.git
echo   If a browser window opens, confirm the GitHub authorization.
echo   If a device code is shown, enter it at github.com/login/device
echo ============================================================
echo.

cd /d "%REPO%"
"%GIT%" -c http.sslBackend=openssl push -u origin main

if %errorlevel%==0 (
    echo.
    echo [OK] Push succeeded! Your plugin is now on GitHub.
) else (
    echo.
    echo [FAIL] Push failed. Common causes:
    echo   - Browser authorization was not completed
    echo   - Wrong repo URL or no write permission
    echo   - Network/proxy issue
)
echo.
pause
endlocal
