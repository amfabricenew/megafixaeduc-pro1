@echo off
title MegaFixaEduc Pro - Serveur Local
cd /d "%~dp0"

echo ==========================================
echo    LANCEMENT DE MEGAFIXAEDUC PRO
echo ==========================================
echo.

:: Vérification de Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe ! 
    echo Veuillez l'installer sur https://nodejs.org
    pause
    exit
)

:: Installation automatique si node_modules est absent
if not exist "node_modules" (
    echo [INFO] Premier lancement : Installation des dependances...
    call npm install
)

:: Ouverture automatique du navigateur après un court délai
echo [INFO] Ouverture du navigateur...
start http://localhost:3000

:: Lancement du serveur
echo [INFO] Demarrage du serveur...
npm start

if %errorlevel% neq 0 (
    echo.
    echo [ERREUR] Le serveur a rencontre un probleme.
    echo Essai en mode developpement...
    npm run dev
)

pause
