# Plan restant ArtisanConnect

## État actuel

Le workflow principal est opérationnel :

```text
Service artisan → Validation admin → Demande client → Devis
→ Acompte mock → Exécution → Livraison → Avis → Solde mock
```

Les fonctions déjà disponibles incluent les notifications Brevo, la messagerie liée aux commandes, les pièces jointes, les exports PDF/CSV, les avis, les catégories, la galerie multi-images, la modération admin et les graphiques du dashboard.

---

## Phase 1 — Stabilisation et tests

### 1. Tests automatisés de bout en bout

#### Tests unitaires déjà disponibles

- [x] Règles des avis : commande terminée, commentaire conditionnel et unicité.
- [x] Suite backend unitaire exécutée avec succès.

- [ ] Créer une base PostgreSQL de test isolée.
- [ ] Préparer un fichier `.env.test`.
- [ ] Ajouter les fixtures : client, artisan, admin, service et boutique.
- [ ] Tester la création d'une demande de service.
- [ ] Tester la validation admin.
- [ ] Tester l'acceptation ou le refus par l'artisan.
- [ ] Tester l'acompte puis le démarrage de la commande.
- [ ] Tester la livraison et la notification client.
- [ ] Tester l'acceptation de livraison et le statut `completed`.
- [ ] Tester les avis client et artisan.
- [ ] Tester les permissions sur commande, fichiers et paiements.
- [ ] Tester les exports PDF et CSV.

### 2. Qualité frontend

- [ ] Tester les parcours mobile et desktop.
- [ ] Tester le menu responsive de la navbar.
- [ ] Tester la galerie multi-images et le zoom.
- [ ] Tester les messages d'erreur API.
- [x] Typecheck frontend exécuté avec succès.
- [ ] Ajouter des états de chargement et d'erreur cohérents aux écrans critiques.

**Critère de sortie** : le workflow complet passe automatiquement sans modifier la base de développement.

---

## Phase 2 — Sécurité des fichiers et stockage

### 1. Stockage externe

- [ ] Choisir Amazon S3, Cloudflare R2 ou Supabase Storage.
- [ ] Créer un module de stockage indépendant du fournisseur.
- [ ] Migrer les images, pièces jointes et livrables depuis `uploads/`.
- [ ] Utiliser des URLs signées pour les fichiers privés.
- [ ] Prévoir l'expiration des URLs.
- [ ] Nettoyer les fichiers orphelins.
- [ ] Configurer les sauvegardes et la rétention.

### 2. Antivirus et sécurité upload

- [ ] Vérifier le type MIME réel du fichier.
- [ ] Bloquer les extensions dangereuses.
- [ ] Ajouter une limite par fichier et par utilisateur.
- [ ] Intégrer ClamAV ou un service antivirus cloud.
- [ ] Marquer les fichiers comme `pending_scan`, `clean` ou `rejected`.
- [ ] Empêcher le téléchargement avant validation antivirus.
- [ ] Journaliser les fichiers rejetés.

**Critère de sortie** : aucun fichier privé n'est accessible sans autorisation et aucun fichier non analysé n'est téléchargeable.

---

## Phase 3 — Migrations et préparation production

### Base de données

- [ ] Désactiver `synchronize` hors développement.
- [x] Synchronisation TypeORM configurable via `DB_SYNCHRONIZE`.
- [ ] Générer les migrations TypeORM pour toutes les entités actuelles.
- [ ] Tester `migration:run` sur une base staging vide.
- [ ] Tester la migration sur une copie de la base actuelle.
- [ ] Ajouter une procédure de sauvegarde avant migration.
- [ ] Documenter la procédure de rollback.

### Configuration

- [ ] Créer `.env.example` complet et sans secret.
- [ ] Séparer les variables développement, staging et production.
- [ ] Configurer `FRONTEND_URL` et `API_URL` publics.
- [ ] Restreindre CORS au domaine officiel.
- [ ] Activer HTTPS.
- [ ] Configurer les logs structurés.
- [ ] Ajouter monitoring, alertes et healthcheck.
- [ ] Configurer les sauvegardes PostgreSQL.
- [ ] Vérifier les limites et timeouts du serveur.

**Critère de sortie** : le déploiement staging démarre uniquement avec les migrations et aucune synchronisation destructive.

---

## Phase 4 — Politique métier et conformité

### Annulation et remboursement

- [ ] Définir les règles d'annulation client.
- [ ] Définir les règles d'annulation artisan.
- [ ] Définir le traitement de l'acompte.
- [ ] Définir les remboursements complets et partiels.
- [ ] Définir les frais de plateforme conservés ou remboursés.
- [ ] Définir les délais de réclamation.
- [ ] Faire valider les conditions par un conseil juridique local.
- [ ] Afficher les conditions avant la confirmation de commande.
- [ ] Enregistrer la version des conditions acceptée par chaque partie.

### Litiges

- [ ] Ajouter l'ouverture d'un litige par le client ou l'artisan.
- [ ] Ajouter les motifs et pièces justificatives.
- [ ] Ajouter l'interface d'arbitrage admin.
- [ ] Ajouter les décisions : remboursement, paiement, correction ou clôture.
- [ ] Conserver l'historique complet des décisions.

---

## Phase 5 — Paiement réel

Le paiement mock actuel reste disponible pour le développement. Le paiement réel est volontairement reporté.

### Intégration

- [ ] Choisir Orange Money Web Payment ou Stripe.
- [ ] Créer les comptes et clés de production.
- [ ] Implémenter le paiement de l'acompte de 30 %.
- [ ] Implémenter le paiement du solde de 70 %.
- [ ] Ajouter les webhooks signés.
- [ ] Rendre les callbacks idempotents.
- [ ] Gérer les paiements échoués ou expirés.
- [ ] Enregistrer les identifiants de transaction.
- [ ] Ajouter les reçus définitifs.
- [ ] Ajouter les remboursements réels.
- [ ] Tester en sandbox puis en production contrôlée.

### Commission

- [x] Commission produit configurée à 10 %.
- [x] Commission service configurée à 10 %.
- [ ] Vérifier la commission avec les frais de paiement réels.
- [ ] Documenter la commission dans les conditions générales.

**Critère de sortie** : aucune commande ne peut être considérée comme payée sans confirmation fiable du fournisseur.

---

## Phase 6 — Transporteur

- [ ] Créer le profil transporteur.
- [ ] Attribuer une livraison à un transporteur.
- [ ] Ajouter les zones et frais de livraison.
- [ ] Ajouter les statuts : attribuée, récupérée, en transit, livrée.
- [ ] Ajouter la preuve de remise.
- [ ] Ajouter un code de confirmation client.
- [ ] Ajouter les notifications de livraison.
- [ ] Ajouter les litiges liés au transport.

---

## Phase 7 — Vérification vendeurs

- [x] Types vendeur : artisan, revendeur, vendeur individuel.
- [x] Vérification KYC progressive.
- [x] Boutique active pour artisan et revendeur.
- [x] Boutique facultative pour vendeur individuel.
- [x] Localisation : ville, quartier et marché.
- [x] Badge vendeur vérifié après ventes réussies.
- [ ] Vérification du téléphone.
- [ ] Vérification de l'identité.
- [ ] Score de fiabilité vendeur.
- [ ] Suspension automatique en cas de fraude.
- [ ] Historique visible des ventes et évaluations.

### Localisation cartographique MVP

- [x] Ajouter une carte OpenStreetMap/Leaflet pour choisir la position de la boutique.
- [x] Ajouter une carte pour la livraison à domicile.
- [x] Enregistrer latitude et longitude pour boutiques et commandes de service.
- [x] Conserver ville, quartier, marché et repère textuel pour les zones mal cartographiées.
- [ ] Ajouter le géocodage assisté et la recherche de lieux.
- [ ] Masquer la position exacte d'une boutique sur le profil public.

---

## Phase 8 — Exploitation et lancement

- [ ] Déployer une instance staging.
- [ ] Exécuter la suite E2E sur staging.
- [ ] Configurer le domaine et le certificat HTTPS.
- [ ] Configurer SPF, DKIM et DMARC pour Brevo.
- [ ] Régénérer toute clé exposée.
- [ ] Vérifier les variables de production.
- [ ] Effectuer une sauvegarde initiale.
- [ ] Créer un compte admin de secours sécurisé.
- [ ] Préparer une procédure de support.
- [ ] Effectuer un lancement progressif avec quelques vendeurs.
- [ ] Surveiller les erreurs et les paiements pendant les premières semaines.

---

## Ordre recommandé

```text
1. Tests E2E et base de test
2. Migrations TypeORM
3. Stockage externe et antivirus
4. Politique annulation/remboursement
5. Litiges
6. Transporteur
7. Paiement réel
8. Staging
9. SPF, DKIM et DMARC
10. Lancement progressif
```

## Décisions actuelles

- Commission : 10 % pour les produits et les services.
- Paiement réel : reporté ; le mode mock reste utilisé en développement.
- Fournisseur e-mail : Brevo SMTP.
- Modes de livraison : atelier, domicile ou transporteur.
- Les secrets restent uniquement dans les fichiers `.env` locaux ou les variables sécurisées de production.
