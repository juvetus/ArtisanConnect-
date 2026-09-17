# Plan de développement ArtisanConnect

## Objectif

Faire évoluer ArtisanConnect d'une marketplace artisanale vers une plateforme qui génère des clients, des demandes de devis et des opportunités pour les artisans, vendeurs, coopératives et institutions du Cameroun.

## Phase 0 - Stabilisation du pilote

- [ ] Déployer le dernier code validé sur Render.
- [ ] Vérifier les migrations et les nouvelles colonnes TypeORM.
- [ ] Tester l'inscription e-mail et téléphone OTP mock.
- [ ] Tester les rôles `admin`, `editor` et `viewer`.
- [ ] Tester les boutiques, produits, services et commandes.
- [ ] Tester WhatsApp vendeur, Mobile Money et modes de livraison.
- [ ] Tester les images, Cloudinary et les e-mails Brevo.
- [ ] Exécuter [FICHE_TEST_PILOTE.md](./FICHE_TEST_PILOTE.md).
- [ ] Décider Go/No-Go pour un groupe pilote limité.

## Phase 1 - Génération de demandes

### Fonction prioritaire : Je cherche un artisan

Le client décrit un besoin et la plateforme le transmet aux artisans pertinents.

Données du besoin :

- ville ;
- quartier ;
- métier ou catégorie ;
- budget minimum et maximum ;
- délai souhaité ;
- description ;
- photos ou pièces jointes ;
- préférence de contact : messagerie, WhatsApp ou les deux.

Parcours :

1. Le client publie une demande.
2. La plateforme recherche les artisans compatibles.
3. Les artisans reçoivent une notification.
4. Les artisans répondent avec un prix, un délai et un message.
5. Le client compare les réponses.
6. Le client poursuit par messagerie, WhatsApp ou commande.

### Livrables

- [x] Modèle `CustomerRequest` séparé de `ServiceOrder`.
- [x] API de création et consultation des demandes.
- [x] Filtrage initial par catégorie et ville côté opportunités artisan.
- [x] Matching serveur par catégories publiées et localisation du vendeur.
- [x] Score de correspondance catégorie/ville/boutique vérifiée.
- [ ] Matching avancé par disponibilité, statut Premium et score de fiabilité.
- [x] Écran client de création de demande.
- [x] Écran vendeur des demandes ouvertes.
- [x] Réponse vendeur avec prix, délai et commentaire.
- [x] Notification interne au client après réponse vendeur.
- [x] CTA WhatsApp contextualisé sur les réponses artisan.
- [x] Tests backend dédiés aux demandes clients.
- [x] Fiche de test pilote mise à jour avec le parcours client/artisan.

## Phase 2 - Acquisition et conversion vendeur

- [ ] Statistiques de vues de boutique et d'annonces.
- [ ] Nombre de contacts WhatsApp.
- [x] Nombre de demandes reçues.
- [x] Nombre de réponses envoyées.
- [ ] Nombre de devis envoyés.
- [ ] Taux de réponse et délai moyen de réponse.
- [x] Catalogue public partageable.
- [x] Partage WhatsApp d'une annonce.
- [ ] QR code de boutique.
- [ ] Affiche/catalogue téléchargeable.

## Phase 3 - Offre Premium

### Offre gratuite

- profil ;
- boutique ;
- annonces limitées ;
- messagerie et WhatsApp ;
- réception de commandes ;
- avis clients.

### Offre Premium

- annonces illimitées ;
- mise en avant par ville ;
- badge Premium ;
- statistiques ;
- priorité dans le matching ;
- demandes de devis avancées ;
- catalogue personnalisé ;
- produits sponsorisés ;
- support renforcé.

Avant facturation :

- [ ] Tester la valeur avec le pilote.
- [ ] Mesurer les commandes générées.
- [ ] Définir les plans et limites.
- [ ] Ajouter abonnements et facturation.
- [ ] Prévoir annulation et remboursement.

## Phase 4 - Confiance et qualité

- [ ] Vérification du téléphone.
- [ ] Vérification WhatsApp.
- [ ] Badges boutique vérifiée et vendeur vérifié.
- [ ] Avis vérifiés après commande.
- [ ] Signalement d'annonce ou vendeur.
- [ ] Modération renforcée.
- [ ] Score de fiabilité.
- [ ] Historique de réponse du vendeur.

## Phase 5 - Institutions et impact

- [ ] Campagnes de recrutement d'artisans.
- [ ] Appels à projets.
- [ ] Suivi des bénéficiaires.
- [ ] Statistiques par ville, genre et coopérative.
- [ ] Exports PDF/CSV améliorés.
- [ ] Accès multi-utilisateurs institutionnels.
- [ ] Rapports d'impact périodiques.

## Phase 6 - Paiements et opérations réelles

- [ ] Migrations TypeORM contrôlées.
- [ ] MoMo réel.
- [ ] Orange Money réel.
- [ ] WhatsApp Brevo pour OTP et notifications.
- [ ] Procédure de remboursement fournisseur.
- [ ] Transporteur réel.
- [ ] Rapprochement financier.
- [ ] Sauvegardes et rollback documentés.

## Indicateurs à suivre

- vendeurs actifs ;
- clients actifs ;
- demandes publiées ;
- taux de réponse vendeur ;
- contacts WhatsApp ;
- commandes ;
- chiffre d'affaires généré pour les vendeurs ;
- rétention à 30 jours ;
- boutiques vérifiées ;
- taux d'erreur et tickets support.

## Priorité de démarrage

La première fonctionnalité à développer après stabilisation du pilote est **Je cherche un artisan**. Elle doit démontrer qu'ArtisanConnect apporte des clients aux vendeurs avant l'introduction d'un abonnement Premium.
