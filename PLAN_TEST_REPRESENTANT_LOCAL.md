# Plan de test terrain complet — ArtisanConnect

_Version du 29 septembre 2026 — guide de recette manuelle pour le représentant local_

Ce plan est la référence actuelle pour la recette terrain. Il couvre les parcours utilisateur et les vérifications de préparation du pilote. Il ne remplace pas les tests automatisés du backend et du frontend.

## Fiche de session

- Date et heure : ______________________________________________
- Testeur / représentant : _____________________________________
- Environnement et URL : ______________________________________
- Version / commit testé : ____________________________________
- Appareil et navigateur : ____________________________________
- Langue testée : `FR` / `EN`
- Responsable technique joignable : ___________________________

Pour chaque scénario, noter un résultat : `PASS`, `FAIL`, `BLOQUÉ` ou `N/A`. Ajouter une capture d’écran sans mot de passe, OTP, numéro privé ni document KYC.

## Règles de sécurité du test

- Utiliser une base locale ou de préproduction isolée de la production. Ne jamais créer de données de test, commande ou demande dans la base de production.
- Confirmer que les migrations attendues sont appliquées, que `DB_SYNCHRONIZE=false` hors développement et que les offres de démonstration sont distinguées des offres réelles.
- Pour le pilote contrôlé, confirmer `DEMO_MODE=false` et `NEXT_PUBLIC_DEMO_MODE=false` uniquement dans l’environnement isolé approuvé.
- Confirmer `NEXT_PUBLIC_MOBILE_MONEY_ENABLED=false` et `NEXT_PUBLIC_CARRIER_ENABLED=false` pour ce pilote.
- Ne jamais effectuer de transfert Mobile Money réel pendant cette recette. Ne pas réserver de course transporteur.
- Ne pas partager les identifiants administrateur. Ils sont saisis par la personne autorisée, hors du présent document.
- Utiliser des comptes et médias de test. Pour une vraie fiche artisan, obtenir son accord avant de publier ses coordonnées, images, prix ou disponibilité.
- Si l’environnement, la base ou le mode démo ne sont pas confirmés : arrêter et prévenir le responsable technique.

## Comptes de test à préparer

Le responsable technique prépare des comptes distincts, sans mot de passe consigné ici :

- Un compte client.
- Deux comptes artisans du même métier et de la même ville, pour recevoir une demande et comparer des offres.
- Un compte artisan d’un autre métier, pour vérifier qu’il ne reçoit pas la demande ciblée.
- Un compte administrateur, pour les scénarios réservés à l’équipe.
- Un compte institution, si les fonctions institutionnelles sont dans le périmètre du test.

Prévoir au moins un produit réel de test, un service approuvé, une demande de devis simple et un brief B2B. Marquer les exemples comme données de test et ne pas utiliser de faux avis présentés comme réels.

## 0. Contrôle de l’environnement — arrêt si échec

- [ ] Ouvrir le frontend et confirmer le nom ArtisanConnect et la bonne langue.
- [ ] Confirmer que le backend répond et que l’équipe technique a validé sa connexion à la base isolée.
- [ ] Confirmer que les images se chargent et que les envois de photos restent dans l’environnement autorisé.
- [ ] Confirmer que les offres de démonstration ne sont pas présentées comme des offres réelles.
- [ ] Confirmer l’état des variables Mobile Money et transporteur ci-dessus.
- [ ] Confirmer un moyen de contacter le responsable technique en cas d’incident.

Résultat du contrôle : `PASS` / `FAIL` — Commentaire : ______________________________

## 1. Marque, navigation et accès à l’accueil

### Desktop

- [ ] Le logo fourni s’affiche dans l’en-tête sans déformation ni rognage.
- [ ] Cliquer sur le logo ramène à l’accueil.
- [ ] Le lien explicite « Accueil » est visible dans la navigation et ramène à `/`.
- [ ] Les liens principaux s’ouvrent : Annonces, Trouver un artisan, Services, Comment ça marche, Blog, Tarifs.
- [ ] Le lien actif est visuellement identifiable.
- [ ] Le footer affiche aussi son accès « Tarifs / Pricing ».

### Mobile

- [ ] Le logo reste lisible à la largeur du téléphone et ne chevauche pas le sélecteur de langue.
- [ ] Ouvrir le menu : le premier lien est « Accueil / Home ».
- [ ] Sélectionner « Accueil / Home » depuis une autre page; vérifier le retour à `/` et la fermeture du menu.
- [ ] Faire défiler le menu si nécessaire; ses derniers liens restent accessibles.
- [ ] Le favicon du navigateur et l’icône installable affichent le nouveau pictogramme.

Résultat : `PASS` / `FAIL` — Capture / remarque : __________________________________

## 2. Pages publiques et recherche

- [ ] Ouvrir l’accueil, le catalogue, l’annuaire « Trouver un artisan », Services, Tarifs, Blog, Contact et Institutions.
- [ ] Rechercher un métier et une ville connus; vérifier les résultats ou un état vide compréhensible.
- [ ] Filtrer le catalogue par catégorie et ouvrir une annonce.
- [ ] Ouvrir une fiche boutique et vérifier que les informations publiques correspondent à la fiche validée.
- [ ] Tester une URL inconnue ou une annonce indisponible : l’utilisateur reçoit un message et une voie de retour.
- [ ] Vérifier qu’aucune offre de démonstration n’est présentée comme réelle dans l’environnement pilote.

Résultat : `PASS` / `FAIL` — Commentaire : __________________________________________

## 3. Inscription, vérification et connexion

### E-mail

- [ ] Créer un compte client avec une adresse de test valide.
- [ ] Vérifier le message de confirmation après inscription.
- [ ] Confirmer que la connexion est bloquée tant que l’adresse n’est pas vérifiée.
- [ ] Utiliser le lien reçu, puis se connecter.
- [ ] Demander un nouvel e-mail de vérification et vérifier le message de résultat.
- [ ] Tester « Mot de passe oublié » et terminer la réinitialisation avec une adresse de test.
- [ ] Essayer une adresse déjà utilisée et vérifier que le message n’expose pas d’informations sensibles.

### Téléphone (OTP de test seulement)

- [ ] Choisir le pays et vérifier l’indicatif affiché.
- [ ] Créer un compte avec un numéro de test autorisé par l’environnement.
- [ ] Vérifier la saisie du code OTP incorrect, expiré et valide.
- [ ] Confirmer que la connexion exige la vérification du téléphone.
- [ ] Confirmer qu’aucun OTP de développement n’est exposé sur un environnement public de production.

### Rôles et sessions

- [ ] Vérifier que le compte client, artisan, institution et administrateur voit les bons parcours.
- [ ] Se déconnecter, revenir en arrière et vérifier qu’une page privée ne reste pas accessible.
- [ ] Vérifier qu’un utilisateur non administrateur ne peut pas ouvrir ou appeler une action admin.

Résultat : `PASS` / `FAIL` — Commentaire : __________________________________________

## 4. Profil artisan et création de boutique

- [ ] Créer ou compléter une boutique avec métier, ville, quartier facultatif, description et disponibilité.
- [ ] Vérifier les étapes et messages obligatoires avant soumission.
- [ ] Tester l’envoi d’une image autorisée; essayer un fichier trop grand ou de type refusé dans l’environnement de test.
- [ ] Si les pièces KYC sont demandées, utiliser exclusivement des fichiers de test; confirmer qu’elles ne sont pas publiques.
- [ ] Vérifier le statut de validation de la boutique et le message reçu par l’artisan.
- [ ] Après approbation admin, vérifier que la boutique devient visible publiquement.
- [ ] Tester la mise à jour de disponibilité et vérifier l’affichage côté client.
- [ ] Vérifier si le formulaire permet de créer une boutique sans fournir de coordonnées Mobile Money. Si un numéro réel est exigé alors que le paiement mobile est désactivé, noter un blocage et ne pas saisir un numéro personnel de remplacement.

Résultat : `PASS` / `FAIL` / `BLOQUÉ` — Détail : __________________________________

## 5. Produits, services et validation

### Produit / annonce

- [ ] Créer une annonce de test avec titre, catégorie, description, prix entier en FCFA et stock.
- [ ] Ajouter une image autorisée et vérifier son affichage.
- [ ] Vérifier le statut après création et, si requis, l’approbation admin.
- [ ] Modifier le stock et les informations; confirmer qu’elles persistent après rechargement.
- [ ] Vérifier qu’une annonce inactive ou démo n’est pas achetable comme offre réelle.

### Service

- [ ] Créer un service artisan avec description, prix ou fourchette et délai.
- [ ] Le faire approuver par l’admin si nécessaire.
- [ ] Ouvrir sa page publique et vérifier la description, l’artisan et le moyen de contact.
- [ ] Vérifier les limites de fichiers, photos ou vidéos selon le formulaire.

Résultat : `PASS` / `FAIL` — Commentaire : __________________________________________

## 6. Commande d’un produit et règlement espèces

- [ ] Depuis une annonce, changer la quantité et vérifier le total.
- [ ] Confirmer que le paiement espèces reste disponible.
- [ ] Vérifier que MoMo et Orange Money apparaissent désactivés avec « bientôt disponible ».
- [ ] Vérifier que le transporteur est désactivé avec « bientôt disponible ».
- [ ] Choisir le retrait atelier, puis, sur un autre test, la livraison directe à domicile si elle est offerte.
- [ ] Saisir une adresse uniquement lorsqu’elle est nécessaire; vérifier que l’absence d’adresse bloque la commande concernée.
- [ ] Passer la commande espèces et la retrouver côté client et artisan.
- [ ] Vérifier la mise à jour du stock; annuler une commande de test et confirmer que le stock est rétabli.
- [ ] Confirmer la remise et le paiement selon le processus du pilote; vérifier le statut final.
- [ ] Sur une commande existante, vérifier que les actions Mobile Money et transporteur ne permettent pas de lancer un vrai paiement ou une course.

Résultat : `PASS` / `FAIL` — ID de commande de test : _______________________________

## 7. Demande de service et devis

- [ ] Depuis un service, créer une demande client avec un objectif suffisamment détaillé.
- [ ] Vérifier le contrôle du nombre minimal de caractères et les champs requis.
- [ ] Ajouter un budget, une date, des fichiers et une méthode de livraison directe si pertinents.
- [ ] Vérifier que « Transporteur » est désactivé / indiqué « bientôt disponible ».
- [ ] Côté artisan, recevoir et ouvrir la demande; envoyer un devis avec prix, délai et message.
- [ ] Côté client, accepter ou refuser le devis; vérifier le statut pour les deux rôles.
- [ ] Tester une demande de complément, la réponse client et la revalidation du devis si cette étape est disponible.
- [ ] Vérifier messagerie, notification et contact WhatsApp sans exposer un numéro non autorisé.
- [ ] Clore une prestation terminée et laisser un avis si le parcours l’autorise.

Résultat : `PASS` / `FAIL` — Référence de test : ____________________________________

## 8. « Je cherche un artisan » et comparaison des propositions

### Publication client

- [ ] Créer une demande personnelle avec métier, ville, description et budget facultatif.
- [ ] Essayer une description trop courte; elle doit être refusée avec une explication.
- [ ] Ajouter une date et jusqu’à cinq photos de test; vérifier leur affichage et leur persistance.
- [ ] Tester messagerie plateforme, WhatsApp et les deux; le numéro ne doit être requis que pour les choix WhatsApp.
- [ ] Vérifier le statut de la demande et le compteur des artisans sollicités.

### Réponse artisan

- [ ] Les artisans du métier et de la zone reçoivent la demande; un compte d’un autre métier ne doit pas être ciblé.
- [ ] Répondre depuis chacun des deux comptes artisans avec des prix et délais différents.
- [ ] Vérifier la notification, le nom, le prix, le délai et le message côté client.
- [ ] Vérifier qu’une réponse modifiée apparaît avec son nouvel état.

### Comparaison et décision client

- [ ] Comparer le nombre sollicité, le nombre de réponses et le nombre encore en attente.
- [ ] Vérifier le tableau comparatif des prix, délais et décisions; aucune offre ne doit être classée automatiquement comme la meilleure.
- [ ] Vérifier le cas sans réponse et le cas où un seul artisan répond.
- [ ] Accepter une offre, refuser une autre; les états doivent être lisibles côté client et artisan.
- [ ] Vérifier le rappel de convenir directement avec l’artisan de la remise et du règlement en espèces pendant le pilote.
- [ ] Marquer la demande terminée seulement après l’issue convenue; confirmer que le statut se met à jour.

Résultat : `PASS` / `FAIL` — ID de demande : __________________  Nombre de réponses : ____

## 9. Brief B2B et relance admin après 24 h

Ces scénarios nécessitent un compte admin. Le représentant travaille avec un administrateur autorisé; aucun identifiant admin ne doit être inscrit dans ce document.

### Brief entreprise

- [ ] Créer un brief B2B avec organisation et quantité; vérifier que ces champs sont obligatoires.
- [ ] Confirmer que le brief attend l’examen admin avant transmission.
- [ ] L’admin charge les artisans suggérés, vérifie métier et zone, puis sélectionne seulement les destinataires pertinents (1 à 5).
- [ ] Confirmer que seuls les artisans choisis reçoivent le brief.

### Demande sans réponse

- [ ] Préparer en staging isolé une demande réelle de test, adressée à au moins deux artisans, avec `createdAt` antérieur de plus de 24 h. Ne jamais antidater une demande en production.
- [ ] Confirmer que la file admin « En attente de réponse (24 h et plus) » l’affiche et nomme les artisans sans réponse.
- [ ] Confirmer qu’un artisan ayant répondu n’est pas inclus dans les destinataires de la relance.
- [ ] Appuyer sur « Relancer »; vérifier la notification uniquement aux artisans toujours en attente.
- [ ] Vérifier que l’action apparait côté artisan dans les notifications d’opportunité.
- [ ] Recharger la file : l’artisan relancé doit être en délai de refroidissement et ne pas recevoir une nouvelle relance immédiate.
- [ ] Vérifier qu’une demande de démonstration, une demande de moins de 24 h, une demande terminée et une demande sans destinataire ne sont pas relançables.
- [ ] Vérifier qu’un compte non-admin ne peut ni consulter cette file ni appeler les endpoints de relance.

Résultat : `PASS` / `FAIL` — Demande fixture staging : ______________________________

## 10. Administration, modération et institutions

### Administration

- [ ] La page d’administration n’est accessible qu’aux rôles autorisés.
- [ ] Consulter une demande sans artisan correspondant; répondre au client ou suivre le brief B2B.
- [ ] Consulter et valider/refuser une boutique ou un service de test; le motif de refus est compréhensible.
- [ ] Vérifier les commandes et leurs statuts; toute annulation ou action financière doit être contrôlée côté serveur.
- [ ] Tester le signalement d’une annonce, boutique ou avis; confirmer qu’il apparaît dans la modération et qu’un utilisateur ne peut pas traiter le signalement d’un autre rôle.
- [ ] Vérifier l’onglet ressources et les actions réservées à l’administration.

### Institution

- [ ] Avec un compte institution de test, ouvrir l’espace institution.
- [ ] Créer ou consulter une ressource/un programme de test et vérifier ses champs requis et son statut.
- [ ] Vérifier qu’une institution ne voit ni les pages admin ni les commandes privées client/artisan.

Résultat : `PASS` / `FAIL` — Commentaire : __________________________________________

## 11. Messagerie, notifications et réputation

- [ ] Échanger un message client-artisan; vérifier l’identité des interlocuteurs et l’état « lu » si disponible.
- [ ] Vérifier le compteur de messages non lus et son actualisation.
- [ ] Vérifier les notifications de nouvelle demande et de relance côté artisan.
- [ ] Marquer les notifications d’opportunité comme lues; le compteur doit se mettre à jour.
- [ ] Essayer de noter avant la clôture d’une prestation ou sans transaction admissible; l’avis doit être refusé.
- [ ] Après clôture admissible, soumettre un avis et vérifier qu’un second avis identique est impossible.
- [ ] Vérifier que les avis visibles correspondent à des expériences réelles de test et ne pas créer de faux avis publics.

Résultat : `PASS` / `FAIL` — Commentaire : __________________________________________

## 12. État des fonctionnalités reportées

- [ ] MoMo et Orange Money sont visibles comme indisponibles (« bientôt disponible ») et aucun parcours de transfert ne démarre.
- [ ] Le paiement d’abonnement mobile est bloqué pour le pilote; aucun code promotionnel ne permet de contourner ce blocage.
- [ ] Le transporteur reste désactivé (« bientôt disponible ») dans l’achat produit et les demandes de service.
- [ ] Les modes retrait atelier / remise convenue et livraison directe à domicile restent utilisables selon l’offre.
- [ ] Aucune course réelle ni notification à un transporteur n’est déclenchée.
- [ ] Noter tout écran qui présente encore ces fonctionnalités comme actives : c’est un défaut à signaler.

Résultat : `PASS` / `FAIL` — Écran concerné : _______________________________________

## 13. Confidentialité, droits et sécurité

- [ ] Un client ne voit et ne modifie que ses propres demandes, commandes et profil.
- [ ] Un artisan ne voit que les opportunités qui lui sont adressées ou qui sont publiques selon la règle produit.
- [ ] Un artisan ne peut ni publier une demande client ni accéder aux pages admin.
- [ ] Les documents KYC et coordonnées privées ne sont pas exposés sur une page publique.
- [ ] Les numéros WhatsApp ne sont transmis qu’aux destinataires prévus par la demande.
- [ ] Vérifier qu’aucun écran, URL, notification ou message de démonstration ne révèle mot de passe, clé API ou OTP de production.
- [ ] Signaler toute donnée réelle affichée sans autorisation; ne pas la copier dans une capture non sécurisée.

Résultat : `PASS` / `FAIL` — Incident / responsable : _________________________________

## 14. Affichage et accessibilité terrain

Tester au minimum un téléphone Android courant et un ordinateur si disponibles :

- [ ] FR et EN : libellés, boutons et statuts traduits sur les parcours prioritaires.
- [ ] Le menu mobile s’ouvre, défile, se ferme après navigation et laisse un accès évident à « Accueil ».
- [ ] Le logo et le favicon sont nets; les boutons et champs sont assez grands pour une utilisation tactile.
- [ ] Aucun texte ni action n’est coupé, superposé ou hors écran.
- [ ] Les images, erreurs, chargements, listes vides et messages de confirmation sont compréhensibles.
- [ ] Retour navigateur/rechargement : pas de perte inattendue d’une réponse ou d’un statut enregistré.

Résultat : `PASS` / `FAIL` — Appareil / navigateur : _________________________________

## 15. Fiche d’incident

Créer une fiche par défaut observé; ne jamais se contenter de « ça ne marche pas ».

- Identifiant du test : ____________________  Gravité : `P0` / `P1` / `P2` / `P3`
- Rôle et environnement : _________________________________________________________
- Étapes exactes pour reproduire : _________________________________________________
- Résultat attendu : ______________________________________________________________
- Résultat observé : ______________________________________________________________
- Fréquence : `toujours` / `parfois` / `une fois`
- Capture ou référence de preuve expurgée : _______________________________________
- Responsable du suivi et date : _________________________________________________

Gravité : `P0` = sécurité, données ou fonds en risque; `P1` = parcours pilote bloqué; `P2` = gêne avec solution de contournement; `P3` = amélioration non bloquante.

## 16. Décision Go / No-Go

Le pilote n’est prêt que si :

- [ ] Les préconditions et la séparation d’environnement sont confirmées.
- [ ] Un client réel de test peut trouver une offre ou publier une demande et comprendre la suite.
- [ ] Un artisan peut publier/compléter son offre, recevoir une demande pertinente et répondre.
- [ ] Le client peut comparer les propositions, accepter/refuser et voir l’état correspondant.
- [ ] Une commande en espèces et les modes de remise disponibles ont été testés sans paiement réel.
- [ ] MoMo, Orange Money et transporteur sont clairement désactivés pour ce pilote.
- [ ] L’admin peut traiter les demandes sans match, les briefs B2B et les relances 24 h en staging.
- [ ] Aucun défaut `P0` ou `P1` n’est ouvert; les défauts restants ont un responsable et une décision.
- [ ] Le représentant sait joindre le responsable support et expliquer les modalités de remise/règlement.

Décision : `GO pilote contrôlé` / `NO-GO — corriger puis retester`

Ville / métiers testés : __________________________________________________________

Artisans participants avec accord : __________________  Clients participants : ________

Défauts bloquants : _______________________________________________________________

Responsable et date de réexamen : _________________________________________________