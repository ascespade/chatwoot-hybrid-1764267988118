@echo off
echo ========================================
echo   Chatwoot Auto-Deployment
echo ========================================
echo.

echo [1/2] Installing dependencies...
call npm install

echo.
echo [2/2] Starting auto-deployment...
echo.
node auto-deploy.js

echo.
echo ========================================
echo   Done! Check the output above.
echo ========================================
pause

