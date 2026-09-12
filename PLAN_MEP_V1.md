# Plan de mise en production V1 - ArtisanConnect

## 1. Objectif

Mettre en ligne une première version stable d'ArtisanConnect avec :

- le frontend Next.js ;
- l'API NestJS ;
- PostgreSQL ;
- l'authentification et les rôles ;
- les boutiques, annonces, services et commandes ;
- les notifications ;
- Orange Money et le transporteur en mode simulation tant que les accès de production ne sont pas validés ;
- le blog public et ses articles SEO.

La cible de déploiement prévue dans le projet est Render, conformément à `render.yaml`.

## 2. Architecture cible

```text
Utilisateur
   |
   v
Frontend Next.js
artisanconnect-web
   |
   | NEXT_PUBLIC_API_URL
   v
API NestJS
artisanconnect-api
   |
   v
PostgreSQL managé
artisanconnect-db
```

Services Render prévus :

- `artisanconnect-web` : frontend Next.js.
- `artisanconnect-api` : backend NestJS.
- `artisanconnect-db` : PostgreSQL managé.

## 3. Conditions bloquantes avant MEP

### 3.1 Migrations de base de données

Le backend utilise actuellement `synchronize=false` lorsque `NODE_ENV=production`, mais aucune commande de migration TypeORM n'est encore définie dans le projet.

Avant la production, choisir l'une des options suivantes :

1. **Recommandée :** ajouter des migrations TypeORM et exécuter les migrations avant le démarrage de l'API.
2. Utiliser temporairement `DB_SYNCHRONIZE=true` uniquement sur une base neuve de préproduction, puis revenir à `false` avant la production.

Ne pas activer `synchronize=true` sur une base de production contenant des données importantes.

### 3.2 Stockage des fichiers

Les images d'annonces passent par Cloudinary lorsque les trois variables `CLOUDINARY_*` sont configurées. Sans ces variables, le backend conserve un fallback local pour le développement uniquement. Le disque d'un service web Render peut être éphémère : un redéploiement peut supprimer les fichiers.

Avant une utilisation réelle :

- configurer un compte Cloudinary et les trois secrets dans Render ;
- vérifier que les images d'annonces retournent une URL `https://res.cloudinary.com/...` ;
- les nouveaux documents KYC sont envoyés en ressources Cloudinary `authenticated` et ne doivent pas être servis par leur URL d'upload ;
- l'admin obtient une URL de consultation signée temporaire via l'API, avec une durée de 15 minutes ;
- conserver les identifiants `publicId`, `resourceType` et `format` dans le JSON KYC ;
- stocker uniquement les identifiants et métadonnées en base ;
- vérifier les types MIME, tailles et extensions ;
- ne jamais exposer les documents KYC dans les routes publiques.

Pour une démonstration contrôlée, le stockage local peut rester temporaire pour les anciens fichiers uniquement. Les nouveaux KYC exigent Cloudinary.

### 3.3 CORS

Le backend utilise actuellement `app.enableCors()` sans restriction. Avant la production, limiter CORS au domaine du frontend :

```ts
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
});
```

Vérifier ensuite que les requêtes frontend fonctionnent avec le domaine Render réel.

### 3.4 Paiements

Le déploiement initial doit rester en mode simulé tant que les identifiants Orange Money de production ne sont pas disponibles et testés.

Avant d'activer le mode réel :

- obtenir les identifiants marchands ;
- vérifier les URLs de retour et d'annulation ;
- tester les webhooks et la vérification de transaction ;
- définir la procédure de remboursement et de rapprochement ;
- ne jamais placer les secrets dans Git ou dans le frontend.

## 4. Variables d'environnement

### 4.1 Backend Render

Variables obligatoires :

| Variable | Valeur de production |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | injecté par Render ou `10000` |
| `JWT_SECRET` | secret long, aléatoire, généré par Render |
| `JWT_EXPIRATION` | `7d` ou durée validée |
| `DB_HOST` | fourni par PostgreSQL Render |
| `DB_PORT` | fourni par PostgreSQL Render |
| `DB_USERNAME` | fourni par PostgreSQL Render |
| `DB_PASSWORD` | fourni par PostgreSQL Render |
| `DB_DATABASE` | fourni par PostgreSQL Render |
| `DB_SYNCHRONIZE` | `true` uniquement pour initialiser la base pilote neuve |
| `FRONTEND_URL` | domaine HTTPS réel du frontend |
| `CLOUDINARY_CLOUD_NAME` | nom du cloud Cloudinary |
| `CLOUDINARY_API_KEY` | clé API Cloudinary |
| `CLOUDINARY_API_SECRET` | secret API Cloudinary |
| `ORANGE_MONEY_MODE` | `mock` pour la première MEP contrôlée |

Variables recommandées pour les e-mails :

| Variable | Rôle |
| --- | --- |
| `SMTP_ENABLED` | `true` lorsque le fournisseur est configuré |
| `SMTP_HOST` | serveur SMTP |
| `SMTP_PORT` | port SMTP |
| `SMTP_SECURE` | selon le fournisseur |
| `SMTP_USER` | compte SMTP |
| `SMTP_PASSWORD` | secret SMTP |
| `SMTP_FROM` | adresse d'expédition |

Variables d'administration :

| Variable | Rôle |
| --- | --- |
| `ADMIN_EMAIL` | compte admin initial |
| `ADMIN_PASSWORD` | mot de passe initial fort, à changer si nécessaire |
| `ADMIN_NAME` | nom affiché de l'administration |

### 4.2 Frontend Render

| Variable | Valeur |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL HTTPS de `artisanconnect-api` |
| `NEXT_PUBLIC_SITE_URL` | URL HTTPS publique du frontend |

`NEXT_PUBLIC_*` est intégré au build Next.js. Toute modification nécessite un nouveau build du frontend.

## 5. Préparation du dépôt

Avant de déployer :

1. Vérifier que les fichiers `.env` et secrets ne sont pas suivis par Git.
2. Vérifier que `frontend/package-lock.json` et `backend/package-lock.json` sont présents et cohérents.
3. Exécuter les builds locaux.
4. Exécuter les tests backend.
5. Vérifier les URLs officielles du blog et les images locales.
6. Vérifier que le frontend n'utilise pas `http://localhost` en production.
7. Vérifier que les logs ne contiennent pas de mot de passe, token, document KYC ou numéro Mobile Money sensible.
8. Vérifier la configuration du domaine et HTTPS.

Commandes de contrôle :

```powershell
cd backend
npm.cmd ci
npm.cmd run build
npm.cmd test
npm.cmd run test:e2e

cd ..\frontend
npm.cmd ci
npx.cmd tsc --noEmit
npm.cmd run build
```

## 6. Création des services Render

### 6.1 Base PostgreSQL

1. Créer `artisanconnect-db`.
2. Vérifier le nom de base et l'utilisateur produits par Render.
3. Attendre que la base soit disponible.
4. Tester la connexion depuis l'API.
5. Exécuter les migrations dès qu'elles sont disponibles.

### 6.2 Backend

Paramètres :

- Type : Web Service.
- Runtime : Node.
- Répertoire racine : `backend`.
- Build : `npm ci && npm run build`.
- Démarrage : `npm run start:prod`.
- Health check : `/`.

Après déploiement :

- vérifier les logs de connexion PostgreSQL ;
- vérifier l'initialisation NestJS ;
- vérifier la réponse HTTPS de `/` ;
- vérifier qu'aucune erreur de schéma ne survient ;
- vérifier que le compte admin initial est utilisable.

### 6.3 Frontend

Paramètres :

- Type : Web Service.
- Runtime : Node.
- Répertoire racine : `frontend`.
- Build : `npm ci && npm run build`.
- Démarrage : `npm run start`.
- Variable `NEXT_PUBLIC_API_URL` : URL publique de l'API.
- Variable `NEXT_PUBLIC_SITE_URL` : URL publique du frontend.

Après déploiement :

- ouvrir la page d'accueil ;
- vérifier le catalogue ;
- vérifier `/login`, `/register`, `/blog` ;
- vérifier les appels réseau vers l'API HTTPS et non localhost ;
- vérifier les images et les routes dynamiques.
- vérifier l'upload d'une image d'annonce vers Cloudinary.
- vérifier l'upload d'un document KYC et sa consultation uniquement depuis l'admin.

## 7. Ordre de déploiement recommandé

1. Préparer le dépôt et les secrets.
2. Créer PostgreSQL.
3. Exécuter les migrations sur la base de préproduction.
4. Déployer l'API.
5. Tester l'API avec les endpoints publics et protégés.
6. Déployer le frontend avec l'URL API correcte.
7. Configurer CORS avec le domaine frontend réel.
8. Créer ou vérifier le compte administrateur.
9. Exécuter les smoke tests.
10. Exécuter le parcours métier V1.
11. Ouvrir la plateforme à un petit groupe pilote.
12. Surveiller les logs et les erreurs pendant les premières utilisations.

## 8. Smoke tests après déploiement

### API

- `GET /` répond en HTTPS.
- Les routes publiques des annonces répondent.
- Les routes publiques des services répondent.
- Une inscription fonctionne.
- Une connexion fonctionne.
- Un token invalide est refusé.
- Un utilisateur non admin ne peut pas ouvrir les routes admin.

### Frontend

- La page d'accueil se charge sans erreur console.
- Le catalogue est visible.
- Le blog et les 14 articles sont accessibles.
- Les images de couverture se chargent.
- Les liens MINPMEESA du blog fonctionnent.
- Le changement FR/EN fonctionne.
- Le menu mobile fonctionne.

### Notifications

- La création d'une boutique artisan crée une notification admin.
- La soumission d'un service crée une notification `service_review`.
- Le clic ouvre `/admin/services`.
- La notification est marquée comme lue.

### Base de données

- Les insertions de test sont persistées après redémarrage de l'API.
- Les relations utilisateur, boutique, service, commande et notification sont cohérentes.
- Aucun secret ou fichier KYC n'est stocké dans les logs.

## 9. Parcours métier pilote

Réaliser ensuite le parcours décrit dans [TEST_PLAN_V1.md](TEST_PLAN_V1.md) avec deux comptes de test :

1. Inscrire un artisan.
2. Créer une boutique et vérifier le statut `pending`.
3. Valider la boutique avec un admin.
4. Créer une annonce.
5. Créer un service.
6. Soumettre le service et vérifier la notification admin.
7. Valider le service.
8. Inscrire un client.
9. Passer une commande.
10. Tester le paiement simulé.
11. Tester la livraison simulée.
12. Confirmer la commande.
13. Publier un avis.

Chaque étape doit être vérifiée dans l'interface et dans les logs/API lorsque nécessaire.

## 10. Sécurité avant ouverture

- Remplacer tous les secrets de développement.
- Utiliser HTTPS partout.
- Limiter CORS au frontend officiel.
- Repasser `DB_SYNCHRONIZE=false` après l'initialisation de la base pilote et avant toute ouverture publique.
- Ajouter et tester les migrations.
- Ne pas activer Orange Money réel sans procédure de contrôle.
- Ne pas exposer les documents KYC publiquement.
- Vérifier les droits admin sur chaque endpoint.
- Vérifier les limites de taille et de type pour les uploads.
- Activer la rotation ou le renouvellement des secrets selon le fournisseur.
- Ajouter une adresse de contact/support visible.
- Préparer une politique de confidentialité et des conditions d'utilisation avant l'ouverture publique.

## 11. Monitoring et exploitation

Pendant les premiers jours :

- consulter les logs API et frontend après chaque déploiement ;
- surveiller les erreurs 4xx/5xx ;
- vérifier les erreurs CORS ;
- contrôler les échecs d'e-mails ;
- contrôler les paiements simulés ;
- vérifier les notifications admin ;
- vérifier les créations de commandes ;
- sauvegarder PostgreSQL selon le plan du fournisseur ;
- conserver les étapes de rollback et les informations de contact.

## 12. Rollback

En cas de problème :

1. Identifier si le problème vient du frontend, de l'API, de la base ou d'une variable d'environnement.
2. Désactiver temporairement une fonctionnalité expérimentale si nécessaire.
3. Revenir au dernier déploiement stable Render.
4. Ne pas supprimer la base ni exécuter de migration destructive.
5. Restaurer la base depuis un backup si une migration a causé une perte ou une incompatibilité.
6. Documenter l'incident et le test qui l'a révélé.
7. Corriger en préproduction avant une nouvelle MEP.

## 13. Critères de Go / No-Go

### Go

- Builds frontend et backend réussis.
- Tests unitaires et e2e réussis.
- Migrations exécutées ou schéma de préproduction vérifié.
- API et frontend accessibles en HTTPS.
- CORS configuré avec le domaine réel.
- Compte admin fonctionnel.
- Parcours boutique, service, commande et notification validé.
- Paiement et livraison explicitement marqués mock si nécessaire.
- Aucun secret de développement exposé.
- Rollback et backup disponibles.

### No-Go

- API inaccessible ou boucle de redémarrage.
- Erreur de connexion PostgreSQL.
- Schéma incomplet ou migration non testée.
- Frontend configuré vers localhost.
- CORS bloquant les appels ou trop ouvert sans justification.
- Compte admin impossible à utiliser.
- Données KYC publiquement accessibles.
- Paiement réel activé sans identifiants et tests officiels.
- Fichiers uploads perdus ou non protégés.
- Erreur bloquante dans le parcours de commande.

## 14. Checklist de mise en production

| Élément | Responsable | Statut | Commentaire |
| --- | --- | --- | --- |
| Domaine frontend choisi |  | À faire |  |
| Domaine API choisi |  | À faire |  |
| PostgreSQL Render créé |  | À faire |  |
| Migrations ajoutées et testées |  | À faire | Bloquant avant production |
| Secrets Render configurés |  | À faire |  |
| `DB_SYNCHRONIZE=false` |  | À faire |  |
| CORS limité au frontend |  | À faire |  |
| Cloudinary configuré pour les images |  | À faire | Important pour les annonces |
| Stockage privé KYC configuré |  | Fait en code | Vérifier les secrets Cloudinary Render |
| Backend déployé |  | À faire |  |
| Frontend déployé |  | À faire |  |
| HTTPS vérifié |  | À faire |  |
| Compte admin vérifié |  | À faire |  |
| Smoke tests réussis |  | À faire |  |
| Parcours métier pilote réussi |  | À faire |  |
| Backup PostgreSQL confirmé |  | À faire |  |
| Procédure rollback confirmée |  | À faire |  |
| Go/No-Go validé |  | À faire |  |

## 14.1 Etat après validation locale

Les contrôles techniques locaux sont validés :

- PostgreSQL et Adminer sont disponibles ;
- le backend compile ;
- les 17 tests unitaires passent ;
- le test e2e passe ;
- le frontend est typé et construit en production ;
- les routes publiques API répondent ;
- les routes admin et KYC refusent les accès anonymes.

La MEP pilote peut commencer après exécution manuelle des parcours multi-rôles et vérification des variables Render/Cloudinary. Elle ne doit pas encore être déclarée comme ouverture publique tant que les migrations, le domaine HTTPS, les sauvegardes et le test réel des uploads Cloudinary n'ont pas été confirmés sur l'environnement déployé.

## 15. Décision recommandée pour la première MEP

Faire une **mise en ligne pilote**, limitée à quelques artisans et clients, avec :

- Orange Money en mode `mock` ;
- livraison en mode mock ;
- données KYC de test uniquement si le stockage persistant n'est pas encore branché ;
- observation des logs et retours utilisateurs ;
- aucune promesse de disponibilité ou de paiement réel avant la validation des intégrations.

Après validation du pilote, traiter les migrations, le stockage fichiers, le SMTP de production et les intégrations réelles avant l'ouverture publique.
