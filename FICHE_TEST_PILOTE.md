# Fiche de test - Pilote ArtisanConnect

Date : ____ / ____ / ______
Testeur : ____________________
Environnement : ☐ Local  ☐ Render préproduction  ☐ Render pilote
Version / commit : ____________________

## 1. Préparation

- [ ] Backend démarré et accessible.
- [ ] Frontend démarré et accessible.
- [ ] Base PostgreSQL disponible.
- [ ] Variables d'environnement vérifiées.
- [ ] `MOMO_MODE=mock` confirmé.
- [ ] `ORANGE_MONEY_MODE=mock` confirmé.
- [ ] Transporteur en simulation confirmé.
- [ ] SMTP configuré et testable.
- [ ] Cloudinary configuré et testable.
- [ ] Compte administrateur disponible par un canal sécurisé.

## 2. Inscription et authentification

### Compte e-mail

- [ ] Créer un compte client avec e-mail.
- [ ] Recevoir l'e-mail de vérification.
- [ ] Ouvrir le lien de vérification.
- [ ] Vérifier que le compte est marqué comme vérifié.
- [ ] Se connecter avec e-mail et mot de passe.
- [ ] Demander un nouveau lien de vérification.
- [ ] Tester mot de passe oublié et réinitialisation.

### Compte téléphone - mode mock

- [ ] Choisir un pays et un indicatif.
- [ ] Saisir un numéro local sans l'indicatif.
- [ ] Créer un compte avec téléphone.
- [ ] Récupérer le code OTP de test.
- [ ] Valider le numéro avec le code OTP.
- [ ] Se connecter avec téléphone et mot de passe.
- [ ] Tester un code incorrect.
- [ ] Tester un code expiré.
- [ ] Vérifier qu'un numéro déjà utilisé est refusé.
- [ ] Vérifier qu'aucun OTP de test n'est exposé en production.

## 3. Profil utilisateur

Pour un client, un vendeur et une institution :

- [ ] Ouvrir `/profile`.
- [ ] Modifier le nom ou la raison sociale.
- [ ] Modifier le téléphone du profil.
- [ ] Modifier le numéro WhatsApp.
- [ ] Modifier la ville et le pays.
- [ ] Modifier la présentation.
- [ ] Enregistrer et recharger la page.
- [ ] Vérifier que les valeurs sont conservées.
- [ ] Vérifier qu'un utilisateur ne peut pas modifier le profil d'un autre utilisateur.

## 4. Boutique vendeur

- [ ] Créer une boutique artisan.
- [ ] Créer une boutique revendeur.
- [ ] Créer une boutique vendeur individuel.
- [ ] Vérifier la validation manuelle d'une boutique artisan.
- [ ] Vérifier l'upload d'une pièce KYC.
- [ ] Vérifier l'upload d'une image produit.
- [ ] Renseigner un numéro WhatsApp distinct.
- [ ] Choisir un numéro MoMo.
- [ ] Choisir un numéro Orange Money.
- [ ] Choisir MoMo uniquement.
- [ ] Choisir Orange Money uniquement.
- [ ] Choisir MoMo et Orange Money.
- [ ] Choisir un seul mode de livraison.
- [ ] Choisir deux modes de livraison.
- [ ] Choisir les trois modes de livraison.
- [ ] Modifier ces paramètres depuis `/profile`.

## 5. Produits et services

- [ ] Créer un produit.
- [ ] Sélectionner les moyens de paiement acceptés.
- [ ] Sélectionner les modes de livraison proposés.
- [ ] Modifier le produit.
- [ ] Vérifier que les options non acceptées ne sont pas proposées à l'acheteur.
- [ ] Vérifier que le backend refuse une option non autorisée.
- [ ] Créer un service.
- [ ] Vérifier la page détail du service.
- [ ] Vérifier le bouton WhatsApp du vendeur.

## 6. Parcours client et commande

- [ ] Ouvrir une annonce produit.
- [ ] Vérifier le contact par messagerie interne.
- [ ] Vérifier le contact WhatsApp du vendeur.
- [ ] Vérifier le message WhatsApp prérempli.
- [ ] Vérifier un numéro camerounais au format local.
- [ ] Vérifier un numéro international au format `+33`, `+32` ou `+1`.
- [ ] Passer une commande avec paiement espèces.
- [ ] Passer une commande MoMo mock.
- [ ] Passer une commande Orange Money mock.
- [ ] Tester retrait à l'atelier.
- [ ] Tester livraison à domicile.
- [ ] Tester livraison transporteur.
- [ ] Vérifier le stock après commande.
- [ ] Vérifier l'annulation et la restitution du stock.

## 7. Commandes de services

- [ ] Demander un service.
- [ ] Vérifier le contact WhatsApp de l'artisan.
- [ ] Vérifier la messagerie liée à la demande.
- [ ] Recevoir un devis.
- [ ] Accepter ou refuser le devis.
- [ ] Tester le paiement d'acompte mock.
- [ ] Tester le paiement du solde mock.
- [ ] Valider la livraison.
- [ ] Laisser un avis.

## 8. Fonctionnalité « Je cherche un artisan »

### Parcours client

- [ ] Ouvrir `/customer-requests` avec un compte client.
- [ ] Publier une demande avec métier, ville et description.
- [ ] Vérifier le contrôle de longueur minimale de la description.
- [ ] Ajouter un budget minimum et maximum.
- [ ] Vérifier que la demande apparaît dans « Mes demandes ».
- [ ] Vérifier le statut initial `open`.

### Parcours artisan

- [ ] Ouvrir `/artisan/customer-requests` avec un compte artisan.
- [ ] Vérifier que seules les demandes compatibles avec les catégories publiées sont proposées.
- [ ] Vérifier le filtrage par métier.
- [ ] Vérifier le filtrage par ville.
- [ ] Répondre avec un prix, un délai et un message.
- [ ] Vérifier qu'un artisan ne peut pas répondre deux fois à la même demande.
- [ ] Vérifier qu'une notification est créée pour le client.

### Retour client

- [ ] Vérifier que la réponse apparaît dans la demande client.
- [ ] Vérifier le nom de l'artisan, le prix et le délai proposés.
- [ ] Vérifier le bouton WhatsApp si le profil artisan possède un numéro.
- [ ] Vérifier le fallback vers la messagerie si WhatsApp n'est pas renseigné.

## 9. Administration

- [ ] Se connecter avec un compte admin.
- [ ] Ouvrir l'onglet Commandes.
- [ ] Rechercher par ID de commande.
- [ ] Rechercher par client.
- [ ] Rechercher par vendeur.
- [ ] Filtrer par statut.
- [ ] Déplier les détails d'une commande.
- [ ] Annuler une commande depuis l'admin.
- [ ] Vérifier la restitution du stock.
- [ ] Enregistrer un remboursement mock.
- [ ] Vérifier que les actions admin sont protégées côté API.
- [ ] Valider une boutique artisan.
- [ ] Modifier le statut d'une annonce.

## 10. SEO et pages publiques

- [ ] Ouvrir `/clients`.
- [ ] Ouvrir `/artisans`.
- [ ] Ouvrir `/institutions`.
- [ ] Ouvrir `/services`.
- [ ] Ouvrir `/blog`.
- [ ] Ouvrir au moins trois articles du blog.
- [ ] Vérifier que les images du blog se chargent.
- [ ] Vérifier `/robots.txt`.
- [ ] Vérifier `/sitemap.xml`.
- [ ] Vérifier les titres et descriptions dans le HTML.

## 11. Responsive et navigation

- [ ] Tester desktop.
- [ ] Tester tablette.
- [ ] Tester mobile.
- [ ] Vérifier la barre verticale desktop.
- [ ] Vérifier le menu mobile défilable.
- [ ] Vérifier que Déconnexion est accessible.
- [ ] Vérifier le bouton WhatsApp flottant.
- [ ] Vérifier qu'aucun contenu n'est masqué par la navigation.

## 12. Sécurité et données

- [ ] Aucun secret dans Git.
- [ ] Aucun mot de passe dans la documentation publique.
- [ ] Les clés API restent dans les variables Render.
- [ ] Les routes admin refusent les utilisateurs anonymes.
- [ ] Les documents KYC ne sont pas accessibles publiquement.
- [ ] Les commandes d'un autre utilisateur sont refusées.
- [ ] Les profils d'un autre utilisateur ne sont pas modifiables.
- [ ] Les logs ne contiennent pas de mot de passe, clé API ou OTP de production.

## 13. Go / No-Go

Go uniquement si :

- [ ] Les parcours e-mail et téléphone mock fonctionnent.
- [ ] Les commandes réelles utilisent les espèces uniquement.
- [ ] MoMo, Orange Money et transporteur sont clairement indiqués comme simulés.
- [ ] Les images et uploads persistent correctement.
- [ ] Le compte admin est vérifié.
- [ ] Les sauvegardes PostgreSQL sont confirmées.
- [ ] La procédure de rollback est connue.
- [ ] Les erreurs critiques sont corrigées.
- [ ] Le pilote est limité à un groupe connu d'utilisateurs.

Décision : ☐ GO pilote contrôlé  ☐ NO-GO

Observations :

____________________________________________________________________

____________________________________________________________________

____________________________________________________________________
