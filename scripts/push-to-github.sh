#!/bin/bash
# ==========================================================
# Script de publication sécurisée et fiable vers GitHub
# MégafixaEduc Pro
# ==========================================================

set -euo pipefail

echo "🚀 Préparation de l'envoi vers GitHub..."

# 1. Configuration des dossiers sûrs et initialisation Git si absente
git config --global --add safe.directory /app/applet 2>/dev/null || true
git config --global --add safe.directory "$(pwd)" 2>/dev/null || true
git config --global --add safe.directory "*" 2>/dev/null || true

if [ ! -d ".git" ]; then
  echo "📁 Initialisation du dépôt Git local (branche main)..."
  git init -b main 2>/dev/null || { git init && git branch -M main; }
fi

# Configurer identité Git locale minimale si absente
if [ -z "$(git config user.name 2>/dev/null || true)" ]; then
  git config user.name "MégafixaEduc Maintainer"
fi
if [ -z "$(git config user.email 2>/dev/null || true)" ]; then
  git config user.email "deploy@megafixaeduc.local"
fi

# 2. Indexation des fichiers (en respectant .gitignore)
git add -A

# 3. Contrôle de sécurité anti-fuite de secrets avant commit/push
echo "🛡️ Vérification de sécurité des fichiers indexés..."
STAGED_FILES=$(git diff --cached --name-only || true)
if [ -n "$STAGED_FILES" ]; then
  # Refuser tout fichier .env ou base SQLite locale s'il était suivi par erreur
  if echo "$STAGED_FILES" | grep -E '(^|/)\.env(\.local|\.production)?$|\.db$|\.sqlite$' >/dev/null 2>&1; then
    echo "❌ ERREUR : Un fichier sensible (.env ou base .db) est indexé dans Git."
    echo "   Retirez-le avec : git reset HEAD <fichier> et vérifiez .gitignore."
    exit 1
  fi

  # Rechercher d'éventuelles clés API / privées exposées dans le diff indexé
  if git diff --cached | grep -E '^\+.*(xkeysib-[A-Za-z0-9_-]{20,}|xsmtpsib-[A-Za-z0-9_-]{20,}|AIzaSy[A-Za-z0-9_-]{20,}|-----BEGIN (RSA |EC )?PRIVATE KEY-----)' >/dev/null 2>&1; then
    echo "❌ ERREUR DE SÉCURITÉ : Une clé API (Brevo/Google) ou clé privée a été détectée dans vos modifications !"
    echo "   GitHub bloquerait l'envoi (Push Protection). Supprimez le secret des fichiers suivis puis réessayez."
    exit 1
  fi
fi

# 4. Création du commit si des changements sont prêts
if ! git diff --cached --quiet; then
  COMMIT_MSG="${2:-Mise à jour MégafixaEduc Pro - $(date +'%Y-%m-%d %H:%M')}"
  echo "📦 Enregistrement des modifications : $COMMIT_MSG"
  git commit -m "$COMMIT_MSG"
elif ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "❌ Aucun fichier suivi à publier."
  exit 1
else
  echo "ℹ️ Aucune nouvelle modification locale, utilisation du dernier commit."
fi

# 5. Récupération et validation de l'URL du dépôt GitHub
REPO_URL="${1:-$(git remote get-url origin 2>/dev/null || true)}"

if [ -z "$REPO_URL" ]; then
  echo ""
  echo "Veuillez fournir l'URL de votre dépôt GitHub."
  echo "Exemple : bash scripts/push-to-github.sh https://github.com/votre-nom/megafixaeduc.git"
  echo "Ou avec Personal Access Token (PAT) :"
  echo "bash scripts/push-to-github.sh https://ghp_VOTRE_TOKEN@github.com/votre-nom/megafixaeduc.git"
  echo ""
  read -r -p "Entrez l'URL du dépôt GitHub: " REPO_URL
fi

if [ -z "$REPO_URL" ]; then
  echo "❌ Erreur: Aucune URL GitHub spécifiée."
  exit 1
fi

if [[ ! "$REPO_URL" =~ ^(https://|git@) ]]; then
  echo "❌ Erreur: L'URL du dépôt doit commencer par https:// ou git@"
  exit 1
fi

echo "🔗 Configuration du dépôt distant (origin)..."
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

echo "⬆️ Envoi vers la branche main sur GitHub..."
git branch -M main

if ! git push -u origin main; then
  echo ""
  echo "⚠️ Le push standard a été refusé (historique distant différent ou conflit)."
  read -r -p "Voulez-vous forcer la mise à jour avec --force-with-lease ? (o/N) : " CONFIRM_FORCE
  if [[ "$CONFIRM_FORCE" =~ ^[OoYy]$ ]]; then
    git push -u origin main --force-with-lease
  else
    echo "❌ Publication annulée. Synchronisez d'abord avec : git pull --rebase origin main"
    exit 1
  fi
fi

echo ""
echo "✅ Dépôt publié avec succès sur GitHub !"
echo "👉 Vous pouvez maintenant redéployer sur Render / Docker en toute sécurité."
