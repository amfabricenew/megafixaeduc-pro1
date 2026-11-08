#!/bin/bash
# ==========================================================
# Script de publication automatique vers GitHub
# MégafixaEduc Pro
# ==========================================================

set -e

echo "🚀 Préparation de l'envoi vers GitHub..."

# 1. Vérification de la configuration git
git config --global --add safe.directory /app/applet 2>/dev/null || true
git config --global --add safe.directory "*" 2>/dev/null || true

# 2. Vérification des changements non validés
if [ -n "$(git status --porcelain)" ]; then
  echo "📦 Enregistrement des dernières modifications..."
  git add .
  git commit -m "Mise à jour MégafixaEduc Pro - Prêt pour déploiement" || true
fi

# 3. Récupération de l'URL du dépôt GitHub
REPO_URL="$1"

if [ -z "$REPO_URL" ]; then
  echo ""
  echo "Veuillez fournir l'URL de votre dépôt GitHub."
  echo "Exemple : bash scripts/push-to-github.sh https://github.com/votre-nom/megafixaeduc.git"
  echo "Ou avec Personal Access Token (PAT) :"
  echo "bash scripts/push-to-github.sh https://ghp_VOTRE_TOKEN@github.com/votre-nom/megafixaeduc.git"
  echo ""
  read -p "Entrez l'URL du dépôt GitHub: " REPO_URL
fi

if [ -z "$REPO_URL" ]; then
  echo "❌ Erreur: Aucune URL spécifiée."
  exit 1
fi

echo "🔗 Configuration du dépôt distant (remote origin)..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

echo "⬆️ Envoi vers la branche main sur GitHub..."
git branch -M main
git push -u origin main --force

echo ""
echo "✅ Dépôt publié avec succès sur GitHub !"
echo "👉 Vous pouvez maintenant aller sur https://render.com et lier ce dépôt pour déployer votre application."
