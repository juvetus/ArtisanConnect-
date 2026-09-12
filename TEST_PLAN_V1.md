# Plan de test V1 - ArtisanConnect

## 1. Objectif

Valider les parcours critiques de la première version d'ArtisanConnect avant ouverture à des utilisateurs réels : inscription, boutiques, annonces, services, commandes, paiements, livraison, notifications et avis.

Ce plan couvre le parcours nominal ainsi que les contrôles de sécurité et de cohérence les plus importants. Les intégrations Orange Money et transporteur sont testées en mode simulation/mock tant que les identifiants de production ne sont pas configurés.

## 2. Périmètre

### Inclus

- Authentification et rôles `artisan`, `client`, `admin`.
- Création et validation manuelle d'une boutique artisan.
- Création et publication d'une annonce.
- Création, soumission et validation d'un service.
- Notifications destinées aux artisans, clients et administrateurs.
- Création d'une commande produit.
- Paiement simulé Orange Money.
- Estimation et suivi de livraison simulée.
- Avis après commande.
- Blog public et pages statiques principales.
- Persistance PostgreSQL.

### Hors périmètre V1

- Paiement Orange Money en production.
- API transporteur réelle.
- Tableau de bord d'administration du blog.
- Tests de charge et tests de pénétration complets.
- Déploiement final et configuration DNS.

## 3. Environnement de test

### Services à démarrer

Depuis la racine du projet :

```powershell
docker compose up -d postgres adminer
```

Backend :

```powershell
cd backend
npm.cmd run start:dev
```

Frontend :

```powershell
cd frontend
npm.cmd run dev
```

### URLs locales

- Frontend : `http://localhost:3000`
- Backend : `http://localhost:3001`
- Adminer : `http://localhost:8080`
- API de santé/racine : `http://localhost:3001/`

### Connexion Adminer

- Système : PostgreSQL
- Serveur : `postgres`
- Utilisateur : `artisan`
- Mot de passe : `artisan_password_dev`
- Base : `artisan_connect`

### Vérifications techniques initiales

```powershell
cd backend
npm.cmd run build
npm.cmd test
npm.cmd run test:e2e
```

Résultats attendus :

- Build backend sans erreur.
- Tests unitaires backend au vert.
- Tests e2e au vert.
- PostgreSQL accessible.
- Les tables métier sont créées par TypeORM en développement.

## 4. Données de test

Utiliser des adresses e-mail distinctes pour éviter les conflits d'unicité.

| Rôle | Nom | E-mail | Mot de passe |
| --- | --- | --- | --- |
| Admin | Admin Test | `admin.v1@example.com` | `AdminTest123!` |
| Artisan | Amina Créations | `artisan.v1@example.com` | `ArtisanTest123!` |
| Client | Client Test | `client.v1@example.com` | `ClientTest123!` |
| Institution | Institution Test | `institution.v1@example.com` | `InstitutionTest123!` |

Données boutique artisan :

- Nom : `Amina Créations`
- Type : `artisan`
- Ville : `Yaoundé`
- Quartier : `Bastos`
- Catégorie : `tissage`
- Numéro Mobile Money de test : utiliser un numéro de test autorisé par l'environnement
- Mode de remise : atelier ou livraison à domicile
- Documents KYC : fichiers de test non sensibles pour l'environnement local uniquement

Données annonce :

- Titre : `Sac en tissu ndop fait main`
- Description : `Sac artisanal fabriqué à Yaoundé avec une finition textile traditionnelle.`
- Prix : `15000 XAF`
- Stock : `3`
- Catégorie : `tissage`

Données service :

- Titre : `Couture sur mesure`
- Description : `Confection de vêtements sur mesure avec prise de mesures et choix du tissu.`
- Catégorie : `couture`
- Délai estimé : `7 jours`
- Prix indicatif : `25000 XAF`

## 5. Scénario A - Contrôles techniques de base

### A1. Compilation et tests backend

**Action**

1. Exécuter `npm.cmd run build` dans `backend`.
2. Exécuter `npm.cmd test`.
3. Exécuter `npm.cmd run test:e2e`.

**Résultat attendu**

- Aucune erreur de compilation.
- Tous les tests unitaires passent.
- Le test e2e démarre AppModule et se connecte à PostgreSQL.

### A2. Vérification PostgreSQL

**Action**

- Ouvrir Adminer.
- Vérifier la présence des tables `users`, `shops`, `listings`, `services`, `orders`, `payments`, `notifications` et des tables associées.

**Résultat attendu**

- Les tables existent.
- Les colonnes et relations principales sont présentes.
- Le type de notification `service_review` existe après synchronisation du schéma.

## 6. Scénario B - Inscription et authentification

### B1. Inscription artisan

**Action**

1. Ouvrir `/register`.
2. Créer un compte avec le rôle artisan.
3. Se déconnecter puis se reconnecter avec les mêmes identifiants.

**Résultat attendu**

- Le compte est créé une seule fois.
- L'utilisateur est redirigé vers son espace artisan.
- Une seconde inscription avec le même e-mail est refusée avec un message explicite.
- Le jeton de session est conservé après navigation.

### B2. Inscription client

Répéter le scénario avec le rôle client.

**Résultat attendu**

- Le client accède aux pages publiques et à son espace de commandes.
- Les routes réservées à l'artisan ou à l'admin restent protégées.

### B3. Contrôle des rôles

**Action**

- Tenter d'ouvrir `/admin` en tant que client.
- Tenter d'ouvrir `/dashboard` en tant que client.
- Tenter de créer une commande en tant qu'artisan.

**Résultat attendu**

- L'accès non autorisé est refusé ou redirigé.
- Aucune donnée protégée n'est exposée.

## 7. Scénario C - Boutique et validation KYC

### C1. Création d'une boutique artisan

**Action**

1. Se connecter en tant qu'artisan.
2. Ouvrir `/shop/create`.
3. Remplir les informations de boutique.
4. Joindre les documents KYC requis.
5. Soumettre le formulaire.

**Résultat attendu**

- La boutique est créée avec le statut `pending`.
- Une notification est créée pour chaque administrateur actif.
- La notification contient un lien vers `/admin`.
- Une boutique artisan sans documents obligatoires est refusée.

### C2. Validation admin de la boutique

**Action**

1. Se connecter en admin.
2. Ouvrir `/admin`.
3. Consulter la boutique en attente.
4. Ouvrir les documents KYC et vérifier la visionneuse.
5. Approuver la boutique.

**Résultat attendu**

- Le statut passe à `active`.
- L'artisan reçoit une notification de validation.
- L'artisan peut maintenant publier des annonces.

### C3. Refus de boutique

**Action**

- Créer une autre boutique de test.
- La refuser avec un motif.

**Résultat attendu**

- Le statut passe à `rejected`.
- L'artisan reçoit le motif du refus.
- La boutique ne devient pas publiquement accessible.

## 8. Scénario D - Annonce produit

### D1. Création d'annonce

**Action**

1. Depuis le dashboard artisan, créer une annonce.
2. Sélectionner une catégorie produit.
3. Ajouter une ou plusieurs images.
4. Enregistrer l'annonce.

**Résultat attendu**

- Les catégories affichent leur libellé et leur icône.
- Les images sont chargées avec des dimensions stables.
- L'annonce apparaît dans la liste artisan.

### D2. Validation et visibilité publique

**Action**

1. En tant qu'admin, vérifier l'annonce.
2. La publier.
3. Ouvrir la page d'accueil ou la page annonce en navigation publique.

**Résultat attendu**

- Une annonce non validée n'est pas visible publiquement.
- Une annonce active apparaît dans le catalogue.
- Les filtres par catégorie fonctionnent.
- Le badge créatrice locale ou coopérative apparaît lorsque les données le permettent.

## 9. Scénario E - Service et notification admin

### E1. Création d'un service

**Action**

1. Se connecter en artisan.
2. Ouvrir `/artisan/services`.
3. Cliquer sur `Nouveau service`.
4. Vérifier que la liste des catégories est visible.
5. Choisir `Couture sur mesure`.
6. Enregistrer le service en brouillon.

**Résultat attendu**

- Toutes les catégories de services sont affichées avec leur icône et leur libellé.
- Le service est enregistré avec le statut `draft`.
- La page “Mes services” affiche `Couture sur mesure`, et non le code interne `couture`.

### E2. Soumission pour validation

**Action**

1. Cliquer sur `Publier` pour le service en brouillon.
2. Se connecter en admin.
3. Ouvrir `/notifications`.
4. Cliquer sur la notification reçue.

**Résultat attendu**

- Le statut du service passe à `pending_validation`.
- Chaque admin actif reçoit une notification de type `service_review`.
- Le titre indique `Nouveau service à valider`.
- Le contenu indique l'artisan et le titre du service.
- Le lien ouvre `/admin/services`.
- La notification non lue possède un indicateur visuel.
- Cliquer dessus la marque comme lue.

### E3. Validation du service

**Action**

1. Depuis `/admin/services`, approuver le service.
2. Vérifier l'espace artisan.

**Résultat attendu**

- Le statut passe à `approved`.
- L'artisan reçoit une notification ou un e-mail de validation selon la configuration.
- Le service apparaît dans la liste publique des services.

### E4. Demande de modification ou refus

**Action**

- Demander une modification avec un motif.
- Vérifier la notification artisan.
- Modifier puis renvoyer le service.
- Tester également un refus avec feedback.

**Résultat attendu**

- Le statut passe à `validation_requested` ou `rejected`.
- Le feedback est visible par l'artisan.
- Le service peut être corrigé et renvoyé lorsque le statut l'autorise.
- Le refus exige un motif.

## 10. Scénario F - Commande produit

### F1. Passage de commande

**Action**

1. Se connecter en client.
2. Ouvrir une annonce active.
3. Choisir une quantité.
4. Choisir le paiement espèces ou Orange Money test.
5. Confirmer la commande.

**Résultat attendu**

- La commande est créée avec le bon montant.
- Le stock est cohérent.
- L'artisan reçoit une notification de nouvelle commande.
- Le client voit la commande dans `/orders`.

### F2. Statuts de commande

**Action**

Faire progresser la commande selon le workflow prévu : acceptation, préparation, remise/livraison, confirmation.

**Résultat attendu**

- Seuls les statuts autorisés peuvent être appliqués.
- Le client et l'artisan reçoivent les notifications correspondantes.
- Une commande ne peut pas être confirmée deux fois.

## 11. Scénario G - Paiement Orange Money simulé

**Action**

1. Créer une commande éligible.
2. Lancer le paiement Orange Money de test.
3. Confirmer le paiement simulé.
4. Vérifier le paiement et l'ordre associé.

**Résultat attendu**

- Le paiement passe au statut attendu.
- Le montant est égal au montant de la commande.
- La commission et le montant artisan sont cohérents.
- Une notification de paiement est créée.
- Le reversement simulé ne révèle aucune donnée sensible.

## 12. Scénario H - Livraison simulée

**Action**

1. Choisir la livraison à domicile ou par transporteur.
2. Fournir une adresse, un quartier et une position.
3. Demander une estimation.
4. Créer la course simulée.
5. Consulter le suivi.

**Résultat attendu**

- L'estimation retourne un montant et une distance cohérents.
- Le calcul fonctionne avec les coordonnées de Douala ou Yaoundé de test.
- Les statuts de livraison évoluent correctement.
- Une erreur d'API transporteur déclenche le mode mock documenté.

## 13. Scénario I - Avis client

**Action**

1. Finaliser une commande.
2. Ouvrir l'espace commandes client.
3. Ajouter une note de 1 à 5 et un commentaire.
4. Consulter l'annonce ou le service concerné.

**Résultat attendu**

- Un avis ne peut être créé que pour une commande éligible.
- La note est comprise entre 1 et 5.
- Le commentaire est enregistré.
- La moyenne et le nombre d'avis sont mis à jour.
- Un même client ne peut pas publier plusieurs avis pour la même commande.

## 14. Scénario J - Blog public et SEO

**Action**

1. Ouvrir `/blog` en visiteur.
2. Ouvrir plusieurs articles.
3. Vérifier les images, titres, sections et sources.
4. Tester une URL de slug inexistant.
5. Changer la langue du site.

**Résultat attendu**

- Les 14 articles sont accessibles depuis la page blog.
- Chaque article possède un titre, un résumé, une date, une image et un texte alternatif.
- Les sources officielles sont visibles sous forme de liens.
- Les liens CODEPA et types de foires MINPMEESA fonctionnent.
- Une URL inconnue affiche la page 404.
- Les métadonnées SEO sont générées.
- Les pages articles sont générées statiquement lors du build.

## 15. Scénario K - Notifications

### K1. Lecture individuelle

**Action**

- Ouvrir `/notifications`.
- Cliquer sur une notification non lue.

**Résultat attendu**

- La notification passe à `read=true`.
- Le compteur non lu diminue.
- Le lien associé est ouvert si présent.

### K2. Lecture globale

**Action**

- Cliquer sur `Tout marquer comme lu`.

**Résultat attendu**

- Toutes les notifications du compte sont marquées comme lues.
- Le compteur disparaît ou passe à zéro.

### K3. Isolation entre utilisateurs

**Action**

- Créer des notifications pour un artisan et un admin.
- Se connecter successivement avec les deux comptes.

**Résultat attendu**

- Chaque utilisateur ne voit que ses propres notifications.
- Un artisan ne peut pas lire ou modifier la notification d'un autre utilisateur.

## 16. Scénario L - Responsive et bilingue

Tester les pages principales aux largeurs suivantes :

- Mobile : `375px`.
- Tablette : `768px`.
- Desktop : `1440px`.

Pages prioritaires :

- Accueil.
- Connexion et inscription.
- Dashboard artisan.
- Mes services.
- Administration.
- Blog et article.
- Notifications.

**Résultat attendu**

- Aucun texte ne déborde.
- Les boutons et formulaires restent utilisables au clavier et au tactile.
- Les images conservent leurs proportions.
- Le menu mobile fonctionne.
- Le changement FR/EN ne casse pas la mise en page.

## 17. Contrôles de sécurité minimaux

- Les endpoints admin refusent un utilisateur non admin.
- Les données KYC ne sont jamais exposées sur les pages publiques.
- Les mots de passe ne sont jamais renvoyés par l'API.
- Un artisan ne peut modifier que ses propres services, boutiques et annonces.
- Un client ne peut consulter que ses propres commandes privées.
- Les notifications sont filtrées par `recipientId`.
- Les fichiers envoyés sont limités aux formats et tailles prévus.
- Les identifiants de production ne sont pas commités dans le dépôt.

## 18. Critères de sortie V1

La V1 peut être considérée comme prête pour une démonstration contrôlée lorsque :

- les builds frontend et backend passent ;
- les tests unitaires et e2e passent ;
- PostgreSQL est accessible et le schéma est cohérent ;
- le parcours boutique KYC est validé ;
- le parcours service et notification admin est validé ;
- le parcours commande, paiement mock et livraison mock est validé ;
- les notifications sont isolées par utilisateur ;
- les pages principales sont utilisables sur mobile et desktop ;
- aucun secret de production n'est utilisé en local ;
- les anomalies bloquantes sont corrigées ou documentées.

## 19. Tableau de suivi

| ID | Scénario | Statut | Observations |
| --- | --- | --- | --- |
| A | Contrôles techniques | À exécuter |  |
| B | Inscription et rôles | À exécuter |  |
| C | Boutique et KYC | À exécuter |  |
| D | Annonces | À exécuter |  |
| E | Services et notification admin | À exécuter |  |
| F | Commande produit | À exécuter |  |
| G | Orange Money mock | À exécuter |  |
| H | Livraison mock | À exécuter |  |
| I | Avis client | À exécuter |  |
| J | Blog et SEO | À exécuter |  |
| K | Notifications | À exécuter |  |
| L | Responsive et bilingue | À exécuter |  |
| S | Sécurité minimale | À exécuter |  |

## 20. Rapport d'anomalie

Pour chaque anomalie, noter :

```text
ID :
Date :
Scénario :
Utilisateur / rôle :
URL ou endpoint :
Étapes pour reproduire :
Résultat attendu :
Résultat obtenu :
Capture ou logs :
Sévérité : Bloquante / Majeure / Mineure
Statut : Ouverte / En cours / Corrigée / Vérifiée
```

## 21. Exécution locale du 12 septembre 2026

### Contrôles exécutés

| Contrôle | Résultat | Preuve |
| --- | --- | --- |
| PostgreSQL Docker | Réussi | Conteneur healthy sur le port 5432 |
| Adminer | Réussi | Disponible sur `http://localhost:8080` |
| Build backend | Réussi | `npm.cmd run build` |
| Tests unitaires backend | Réussi | 6 fichiers, 17 tests |
| Tests e2e backend | Réussi | 1 fichier, 1 test |
| Typecheck frontend | Réussi | `npx.cmd tsc --noEmit` |
| Build frontend | Réussi | Routes Next.js générées |
| `GET /` API | Réussi | HTTP 200 |
| `GET /listings?take=1` | Réussi | HTTP 200 |
| `GET /services?limit=1` | Réussi | HTTP 200 |
| `GET /admin/overview` sans token | Réussi | HTTP 401 attendu |
| `GET /shops/admin/.../kyc-url` sans token | Réussi | HTTP 401 attendu |

### Etat des tests métier

Les contrôles automatisés sont au vert. Les scénarios qui nécessitent des comptes, des fichiers et plusieurs rôles restent à exécuter manuellement selon les sections B à L, notamment :

- validation boutique KYC avec compte admin ;
- notification `service_review` lors de la soumission d'un service ;
- commande client complète ;
- paiement Orange Money mock ;
- livraison mock ;
- upload d'une image produit et d'un document KYC Cloudinary sur l'environnement déployé.

Le retour HTTP 404 sur `GET /blog` est normal : `/blog` est une route frontend Next.js et non une route de l'API NestJS.
