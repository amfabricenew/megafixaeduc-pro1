#!/bin/bash
# MegaFixaEduc Pro - Serveur Local

# Aller dans le dossier du script
cd "$(dirname "$0")"

echo "=========================================="
echo "   LANCEMENT DE MEGAFIXAEDUC PRO"
echo "=========================================="
echo ""

# Vérification de Node.js
if ! command -v node &> /dev/null
then
    echo "[ERREUR] Node.js n'est pas installé !"
    echo "Veuillez l'installer sur https://nodejs.org"
    exit
fi

# Installation si nécessaire
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installation des dépendances..."
    npm install
fi

# Ouverture du navigateur
if command -v open &> /dev/null; then
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
fi

# Lancement
echo "[INFO] Démarrage du serveur..."
npm start || npm run dev
