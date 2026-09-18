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
- [x] Attribution de chaque demande à 5 artisans pertinents au maximum.
- [x] Notification e-mail des artisans ciblés.
- [x] Statuts de la demande : nouvelle, contactée, en cours, terminée.
- [ ] Matching avancé par disponibilité et statut Premium.
- [x] Écran client de création de demande.
- [x] Écran vendeur des demandes ouvertes.
- [x] Réponse vendeur avec prix, délai et commentaire.
- [x] Notification interne au client après réponse vendeur.
- [x] CTA WhatsApp contextualisé sur les réponses artisan.
- [x] Tests backend dédiés aux demandes clients.
- [x] Fiche de test pilote mise à jour avec le parcours client/artisan.

## Phase 2 - Acquisition et conversion vendeur

- [x] Statistiques de vues de boutique et d'annonces.
- [x] Nombre de contacts WhatsApp.
- [x] Nombre de demandes reçues.
- [x] Nombre de réponses envoyées.
- [x] Nombre de devis envoyés.
- [x] Taux de réponse.
- [x] Délai moyen de réponse.
- [x] Catalogue public partageable.
- [x] Partage WhatsApp d'une annonce.
- [x] QR code de boutique.
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
- [x] Définir les plans et limites (5 annonces actives en gratuit, illimité en Premium).
- [x] Ajouter abonnements et facturation MoMo.
- [ ] Prévoir annulation et remboursement.

### Plan de pilotage et de monétisation Premium

#### Objectif du pilote

Valider que les artisans gagnent plus de leads et de commandes que le coût d’un abonnement, avant de lancer une offre payante.

#### Seuils d’usage à mesurer pendant le pilote

- [ ] 30 artisans actifs minimum sur 8 à 12 semaines.
- [ ] 100 demandes clients publiées minimum sur la période.
- [ ] 60 % de taux de réponse vendeur minimum sur les demandes reçues.
- [ ] 10 contacts WhatsApp ou plus par boutique active en moyenne.
- [ ] 5 à 10 commandes ou demandes qualifiées générées par artisan actif sur la période.
- [ ] 20 % de taux de conversion des demandes vers une commande ou un échange qualifié.

#### Critères de décision Go / No-Go Premium

- [ ] Go si au moins 70 % des artisans actifs maintiennent une boutique active et une réponse régulière.
- [ ] Go si la réponse moyenne est inférieure à 30 minutes à 1 heure selon le métier.
- [ ] Go si les boutiques avec 10+ vues WhatsApp déclenchent au moins 1 commande ou 1 échange qualifié.
- [ ] No-Go si les artisans ne génèrent pas assez de leads pour justifier le coût d’un abonnement.

#### Offre gratuite

- profil artisan ;
- 1 boutique ;
- annonces limitées ;
- messagerie et WhatsApp ;
- réception de commandes ;
- avis clients ;
- accès au tableau de bord de base.

#### Offre Premium Artisan

- 5 000 FCFA / mois ;
- annonces illimitées ;
- mise en avant par ville ;
- badge Premium ;
- statistiques détaillées : vues, contacts WhatsApp, partages, demandes et taux de réponse ;
- priorité dans le matching ;
- demandes de devis avancées ;
- catalogue personnalisé et imprimable ;
- produits sponsorisés ;
- support renforcé.

#### Bénéfices premium clairs à démontrer pendant le pilote

- [ ] Le vendeur Premium reçoit plus de demandes qualifiées.
- [ ] Le vendeur Premium est plus visible dans les résultats et en ville.
- [ ] Le vendeur Premium répond plus vite et convertit mieux ses demandes.
- [ ] Le vendeur Premium génère plus de contacts WhatsApp ou de commandes réelles.
- [ ] La plateforme transforme le pilotage en données de vente exploitables par l’artisan.

#### Plan de mise en œuvre

- [ ] Sélectionner 20 à 30 artisans pour le pilote contrôlé.
- [ ] Mesurer chaque indicateur sur 8 à 12 semaines.
- [ ] Attribuer un statut "Pilot" à un groupe limité ouvert à la vérification.
- [ ] Caler le prix Premium sur la valeur générée : 5 000 FCFA / mois, avec validation après preuve de conversion.
- [ ] Préparer un pack de relance commercial : rapport d’activité, score de visibilité, CTA WhatsApp, suivi des commandes.

### Plan opérationnel du pilote

#### 1) Cible et périmètre

- [ ] 20 à 30 artisans sélectionnés dans 3 à 5 villes clés du Cameroun.
- [ ] 1 à 2 catégories prioritaires par ville pour un pilotage concentré (ex. menuiserie, couture, plomberie, beauté, transformation alimentaire).
- [ ] 50 à 100 clients ou prospects cibles pour tester la publication de demandes et la réception de réponses.
- [ ] 1 statut "Pilot" distinct dans le profil artisan pour encadrer les artisans sélectionnés.

#### 2) Durée du pilote

- [ ] Durée cible : 8 à 12 semaines.
- [ ] Vérification hebdomadaire des KPI : demandes publiées, réponses, contacts WhatsApp, commandes, conversion.
- [ ] Point de revue à la semaine 4, puis décision à la semaine 8 ou 12 selon les résultats.

#### 3) KPI de suivi hebdomadaire

- [ ] Nombre d’artisans actifs
- [ ] Nombre de boutiques actives
- [ ] Nombre de demandes client publiées
- [ ] Taux de réponse vendeur
- [ ] Délai moyen de réponse
- [ ] Nombre de contacts WhatsApp
- [ ] Nombre de demandes qualifiées
- [ ] Nombre de commandes ou d’échanges qualifiés
- [ ] Chiffre d’affaires réel généré pour les vendeurs
- [ ] Taux de rétention des artisans sur 30 jours

#### 4) Onboarding artisans

- [ ] Création de profil et boutique vérifiée.
- [ ] Validation du téléphone et du WhatsApp.
- [ ] Import de 3 à 5 annonces ou services de démonstration.
- [ ] Activation des notifications de demandes et réponses.
- [ ] Envoi d’un tutoriel court : "recevoir une demande, répondre, fermer une commande".
- [ ] Mise en place d’un premier rapport de performance personnalisé.

#### 5) Messages et relances

- [ ] Message de bienvenue à l’inscription au pilote.
- [ ] Relance à la semaine 2 pour vérifier activation et réponse aux demandes.
- [ ] Relance à la semaine 4 pour analyser le volume de leads reçus.
- [ ] Relance à la semaine 8 pour confirmer les artisans engagés et les meilleurs cas d’usage.
- [ ] Message de décision finale : Go Premium / continuer en gratuit / restructurer le plan.

#### 6) Checklist de lancement

- [ ] Les comptes artisan et client de test sont créés.
- [ ] Les boutiques sont actives et visibles.
- [ ] Les demandes client sont publiées correctement.
- [ ] Les notifications et réponses sont déclenchées.
- [ ] Les liens WhatsApp fonctionnent.
- [ ] Les KPI de vues, contacts et partages sont visibles.
- [ ] Les métriques backend sont synchronisées et exploitables.
- [ ] Les responsables du pilotage disposent d’un tableau de bord de suivi.
- [ ] La politique de remboursement et d’annulation est documentée.

#### 7) Décision de fin de pilote

- [ ] Go Premium si les critères de valeur sont dépassés pendant 8 à 12 semaines.
- [ ] Maintien en version gratuite si le volume est insuffisant mais la valeur est démontrée.
- [ ] Ajustement du plan si les artisans ont besoin de plus de visibilité ou d’outils de conversion.

## Phase 4 - Confiance et qualité

- [x] Vérification du téléphone (OTP, envoi SMS encore simulé).
- [ ] Vérification WhatsApp.
- [x] Badges de vérification progressifs : téléphone vérifié, profil contrôlé, identité vérifiée, artisan recommandé.
- [x] Avis vérifiés après commande (marqueur « avis vérifié » sur la boutique publique).
- [x] Signalement d'annonce, de boutique ou de vendeur.
- [x] Modération renforcée (file de signalements et décisions tracées côté admin).
- [x] Score de fiabilité (niveau « artisan recommandé » : identité vérifiée + ventes réussies + avis).
- [x] Historique de réponse du vendeur (taux, délai moyen, dernière réponse).

## Phase 5 - Institutions et impact

- [ ] Campagnes de recrutement d'artisans.
- [ ] Appels à projets.
- [ ] Suivi des bénéficiaires.
- [ ] Statistiques par ville, genre et coopérative.
- [ ] Exports PDF/CSV améliorés.
- [ ] Accès multi-utilisateurs institutionnels.
- [ ] Rapports d'impact périodiques.

## Phase 6 - Paiements et opérations réelles

- [x] Migrations TypeORM contrôlées.
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
