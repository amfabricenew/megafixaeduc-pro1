# Installation Locale - MégafixaEduc Pro

Ce guide vous explique comment installer et exécuter MégafixaEduc Pro sur votre machine locale.

## Prérequis

- **Node.js** (v18 ou supérieur recommandé)
- **npm** (inclus avec Node.js)

## Étapes d'installation

1. **Extraire les fichiers** : Placez tous les fichiers du projet dans un dossier sur votre ordinateur.
2. **Installer les dépendances** :
   ```bash
   npm install
   ```
3. **Configurer l'environnement** :
   - Copiez le fichier `.env.example` et renommez-le en `.env`.
   - Remplissez les variables nécessaires dans le fichier `.env` (notamment `JWT_SECRET`).
4. **Lancer l'application en mode développement** :
   ```bash
   npm run dev
   ```
   L'application sera accessible sur `http://localhost:3000`.

## Déploiement en Production (Serveur Sécurisé)

Pour un déploiement plus stable et sécurisé :

1. **Construire l'application** :
   ```bash
   npm run build
   ```
2. **Démarrer le serveur de production** :
   ```bash
   npm start
   ```

## Sécurité et Mode Hors-ligne incluse

Le serveur est configuré avec :
- **Mode Hors-ligne (OFFLINE_MODE=true)** : Désactive les tentatives de synchronisation avec le Cloud (Firebase/Firestore) et permet un fonctionnement fluide sans connexion internet.
- **PWA (Progressive Web App)** : L'interface est mise en cache localement dans le navigateur pour être accessible même sans réseau.
- **Polices Locales** : Utilisation de polices intégrées (Geist) pour éviter les dépendances aux CDN externes comme Google Fonts.
- **Helmet** : Protection contre les vulnérabilités web courantes via les en-têtes HTTP.
- **CORS** : Configuration des partages de ressources entre origines.
- **Rate Limiting** : Protection contre les attaques par force brute (limitation du nombre de requêtes).
- **Compression** : Optimisation des performances et de la bande passante.
- **JWT** : Authentification sécurisée par jetons.

## Base de données et Persistance des données

L'application utilise **SQLite** via le fichier local **`megafixaEduc.db`**. 

- **Persistance garantie** : Toutes vos données (élèves, notes, finances, configurations) sont sauvegardées en temps réel dans ce fichier. Elles sont conservées même si vous fermez l'application ou redémarrez votre ordinateur.
- **Sauvegardes (Backups)** : 
  - Un dossier `backups/` est utilisé pour stocker vos points de restauration.
  - Vous pouvez exporter manuellement votre base de données depuis les **Paramètres > Sauvegardes** dans l'application.
  - **Conseil Sécurité** : Nous vous recommandons de copier régulièrement le fichier `megafixaEduc.db` sur une clé USB ou un stockage externe pour plus de sécurité.
