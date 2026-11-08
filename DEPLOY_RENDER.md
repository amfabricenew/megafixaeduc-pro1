# Guide de Déploiement Render (MégafixaEduc Pro)

Ce projet est entièrement préconfiguré pour un déploiement continu et sans erreur sur **Render** (Web Service Node.js) directement depuis votre dépôt GitHub.

---

## Étape Préalable : Publier le Code sur GitHub

Pour envoyer ce projet vers votre dépôt GitHub :

### Option A : Via le terminal (Ligne de commande ou script inclus)
1. Créez un nouveau dépôt vide sur [GitHub](https://github.com/new) (sans cocher 'Add README').
2. Exécutez le script d'envoi automatique :
   ```bash
   bash scripts/push-to-github.sh https://github.com/VOTRE_NOM/VOTRE_DEPOT.git
   ```
   *(Ou si vous utilisez un Personal Access Token GitHub: `bash scripts/push-to-github.sh https://ghp_TOKEN@github.com/VOTRE_NOM/VOTRE_DEPOT.git`)*

### Option B : Via le bouton "Export to GitHub" de l'interface Google AI Studio
1. Cliquez sur le bouton de partage ou d'export GitHub en haut à droite.
2. Choisissez votre compte GitHub et un nom de dépôt vierge.
3. Le projet est synchronisé directement.

---

## Méthode 1 : Déploiement automatique via Render Blueprint (Recommandé - 1 Clic)

Le fichier `render.yaml` situé à la racine du projet configure automatiquement l'ensemble du service.

1. Connectez-vous sur [dashboard.render.com](https://dashboard.render.com).
2. Cliquez sur **New +** puis sélectionnez **Blueprint**.
3. Associez votre compte GitHub et choisissez le dépôt de **MégafixaEduc Pro**.
4. Render détecte immédiatement `render.yaml` et applique les configurations suivantes :
   - **Nom du service :** `megafixaeduc-pro`
   - **Environnement d'exécution :** Node.js 20+
   - **Commande de build :** `npm install && npm run build`
   - **Commande de lancement :** `npm start`
   - **Health Check Path :** `/api/health`
   - **Génération automatique de `JWT_SECRET`** sécurisé.
5. Cliquez sur **Apply** : le déploiement se lance et votre application sera en ligne en quelques minutes avec HTTPS automatique.

---

## Méthode 2 : Déploiement Manuel sur Render (Web Service)

Si vous préférez créer manuellement le Web Service sur Render :

1. Dans votre tableau de bord Render, cliquez sur **New +** > **Web Service**.
2. Connectez votre dépôt GitHub.
3. Renseignez les paramètres suivants :
   - **Name :** `megafixaeduc-pro`
   - **Region :** Frankfurt (Europe) ou Oregon (US)
   - **Branch :** `main` (ou votre branche par défaut)
   - **Root Directory :** *(laisser vide)*
   - **Runtime :** `Node`
   - **Build Command :** `npm install && npm run build`
   - **Start Command :** `npm start`
   - **Plan :** Free (ou Starter)
4. Dans la section **Environment Variables**, ajoutez :
   - `NODE_ENV` = `production`
   - `PORT` = `10000` *(Render écoute automatiquement sur ce port)*
   - `JWT_SECRET` = *(une chaîne secrète aléatoire de 32 caractères)*
   - `DATABASE_PATH` = `megafixaEduc.db`
   - `OFFLINE_MODE` = `false`
   - `SMTP_USER` = *(votre adresse Gmail / SMTP pour l'envoi d'emails)*
   - `SMTP_PASS` = *(mot de passe d'application Google de 16 caractères)*
5. Dans **Advanced** > **Health Check Path**, entrez `/api/health`.
6. Cliquez sur **Create Web Service**.

---

## Persistance des Données SQLite sur Render

- **Plan Gratuit (Free Web Service) :**
  L'application dispose d'un système de synchronisation et de checkpoint local. Le serveur recrée automatiquement la structure complète de la base de données SQLite au démarrage.
- **Plan Payant avec Disque Persistant (Recommandé pour Production) :**
  Render permet d'ajouter un disque persistant (**Disks**) monté par exemple sur `/var/data` :
  - Définissez la variable `DATABASE_PATH` = `/var/data/megafixaEduc.db`.
  - Le serveur crée automatiquement le dossier parent s'il n'existe pas encore.
