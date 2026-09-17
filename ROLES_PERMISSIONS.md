# Rôles et permissions ArtisanConnect

## Objectif

Ce document décrit les responsabilités des rôles internes et métiers de la plateforme.

## Rôles internes d'administration

### Admin

L'administrateur possède tous les droits de pilotage :

- consulter la synthèse de la plateforme ;
- consulter les utilisateurs, boutiques, annonces et commandes ;
- créer des utilisateurs ;
- modifier les rôles des utilisateurs ;
- activer ou désactiver un compte utilisateur ;
- supprimer un utilisateur, sous réserve des règles métier ;
- valider ou refuser une boutique ;
- suspendre ou réactiver une boutique ;
- supprimer une boutique ;
- activer ou désactiver une annonce ;
- supprimer une annonce ;
- consulter, rechercher et filtrer les commandes ;
- afficher les détails dépliables d'une commande ;
- annuler une commande ;
- enregistrer un remboursement ;
- exporter les rapports ;
- tester la configuration e-mail ;
- gérer les demandes de service côté administration.

L'admin est le seul rôle autorisé à effectuer les actions financières et les actions destructives.

### Editor / Éditeur

L'éditeur possède des droits de modération et de suivi opérationnel :

- consulter la synthèse ;
- consulter les boutiques ;
- valider ou refuser une boutique ;
- suspendre ou réactiver une boutique ;
- consulter les annonces ;
- activer ou désactiver une annonce ;
- consulter, rechercher et filtrer les commandes ;
- consulter les détails des commandes en lecture seule ;
- consulter les demandes de service selon les écrans autorisés.

L'éditeur ne peut pas :

- créer ou supprimer des utilisateurs ;
- modifier les rôles ;
- désactiver des comptes ;
- supprimer des boutiques ;
- supprimer des annonces ;
- annuler des commandes ;
- enregistrer des remboursements ;
- effectuer des actions financières ;
- envoyer des e-mails de test.

### Viewer

Le viewer possède un accès en lecture seule :

- consulter la synthèse ;
- consulter les commandes ;
- rechercher et filtrer les commandes ;
- déplier les détails d'une commande ;
- consulter les boutiques et les annonces visibles dans le panneau.

Le viewer ne peut pas :

- modifier une donnée ;
- valider ou refuser une boutique ;
- modifier le statut d'une annonce ;
- gérer les utilisateurs ;
- annuler ou rembourser une commande ;
- effectuer une action financière ou destructive.

## Rôles métier

### Client

Le client peut :

- parcourir les produits et services ;
- rechercher par mot-clé et catégorie ;
- consulter les profils et boutiques publics ;
- contacter un vendeur par messagerie interne ou WhatsApp si un numéro est disponible ;
- commander un produit ;
- choisir parmi les moyens de paiement et de livraison proposés par le vendeur ;
- suivre ses commandes ;
- demander un service ;
- répondre à un devis ;
- confirmer une réception ;
- laisser un avis ;
- modifier son profil.

Le client ne peut pas :

- publier une annonce ;
- modifier une boutique qui ne lui appartient pas ;
- accéder au panneau d'administration ;
- consulter les informations privées d'un vendeur.

### Artisan / Vendeur

Le vendeur peut :

- créer et modifier son profil ;
- définir son numéro WhatsApp ;
- créer une boutique ;
- modifier les paramètres de sa boutique ;
- renseigner les numéros MoMo et Orange Money ;
- choisir MoMo, Orange Money ou les deux ;
- choisir un, deux ou trois modes de livraison ;
- créer et modifier des produits et services ;
- choisir les moyens de paiement acceptés par annonce ;
- choisir les modes de livraison proposés par annonce ;
- recevoir des commandes ;
- recevoir des demandes de service ;
- proposer des devis ;
- échanger avec les clients par messagerie ou WhatsApp ;
- confirmer les paiements en espèces ;
- livrer les commandes ;
- consulter ses ventes et son tableau de bord ;
- compléter les documents KYC ;
- formaliser son activité.

Le vendeur ne peut pas :

- accéder aux comptes d'autres vendeurs ;
- modifier les commandes d'un autre vendeur ;
- accéder au panneau d'administration ;
- valider sa propre boutique comme administrateur.

### Institution

L'institution peut :

- accéder à son espace institutionnel ;
- suivre les artisans et les dossiers de formalisation ;
- publier des ressources ;
- publier des programmes d'accompagnement ;
- recevoir et traiter les candidatures ;
- consulter les indicateurs de ses dispositifs ;
- télécharger les rapports disponibles ;
- modifier son profil.

L'institution ne peut pas :

- gérer les commandes commerciales ;
- modifier les utilisateurs hors de son périmètre ;
- publier une boutique vendeur ;
- accéder aux fonctions d'administration générale.

## Matrice synthétique

| Fonction | Admin | Éditeur | Viewer | Client | Vendeur | Institution |
| --- | --- | --- | --- | --- | --- | --- |
| Voir la synthèse admin | Oui | Oui | Oui | Non | Non | Non |
| Voir les commandes admin | Oui | Oui | Oui | Non | Non | Non |
| Rechercher/filtrer les commandes | Oui | Oui | Oui | Non | Non | Non |
| Annuler une commande | Oui | Non | Non | Selon ses commandes | Non | Non |
| Rembourser une commande | Oui | Non | Non | Non | Non | Non |
| Gérer les utilisateurs | Oui | Non | Non | Non | Non | Non |
| Modérer les boutiques | Oui | Oui | Non | Non | Non | Non |
| Modérer les annonces | Oui | Oui | Non | Non | Ses annonces | Non |
| Acheter un produit | Non | Non | Non | Oui | Oui | Non |
| Publier une annonce | Non | Non | Non | Non | Oui | Non |
| Créer une boutique | Non | Non | Non | Non | Oui | Non |
| Publier un programme institutionnel | Non | Non | Non | Non | Non | Oui |
| Contacter un vendeur sur WhatsApp | Selon contexte | Selon contexte | Lecture | Oui | Oui | Oui |
| Modifier son profil | Oui | Oui | Oui | Oui | Oui | Oui |

## Règles de sécurité

- Le backend doit toujours vérifier le rôle, même si l'action est masquée dans le frontend.
- Le rôle ne doit jamais être accepté depuis une modification de profil utilisateur.
- Un utilisateur ne peut modifier que son propre profil.
- Les actions financières et destructives sont réservées à `admin`.
- Les documents KYC ne doivent pas être exposés sur les routes publiques.
- Les numéros WhatsApp et Mobile Money sont distincts.
- Les secrets, mots de passe, OTP et clés API ne doivent jamais être stockés dans Git.
- Toute évolution de permission doit être accompagnée d'un test backend et d'un test manuel dans [FICHE_TEST_PILOTE.md](FICHE_TEST_PILOTE.md).

## Guards backend actuels

- `AdminGuard` : accès strictement réservé à `admin` pour les modules sensibles.
- `AdminPanelGuard` : accès au panneau de pilotage pour `admin`, `editor` et `viewer`.
- Les actions sensibles du panneau admin sont contrôlées individuellement dans le controller.
