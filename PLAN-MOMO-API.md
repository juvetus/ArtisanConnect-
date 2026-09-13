# Plan complet – Intégration MoMo dans ArtisanConnect

## 1. Objectif
Construire une plateforme de paiement fiable pour ArtisanConnect avec :
- collecte de paiements via MoMo Collections,
- abonnements mensuels automatiques,
- paiements de commandes et de devis,
- commission automatique pour la plateforme,
- versements aux artisans via MoMo Disbursements,
- historique des transactions, webhooks, sécurité et gestion des erreurs.

L’objectif n’est pas seulement d’intégrer une API, mais de mettre en place un système complet de paiement et de financement autour du modèle ArtisanConnect.

---

## 2. Cas d’usage métier

### 2.1. Pour le client
- créer un compte,
- payer une commande ou un devis,
- payer un abonnement mensuel,
- recevoir une confirmation de paiement,
- consulter son historique de paiements.

### 2.2. Pour l’artisan
- activer un abonnement premium,
- recevoir des paiements de clients,
- recevoir les paiements de la plateforme,
- suivre ses revenus et commissions,
- recevoir des notifications sur les transactions.

### 2.3. Pour la plateforme
- encaisser les paiements clients,
- calculer la commission,
- verser le montant net aux artisans,
- gérer les abonnements,
- suspendre ou réactiver les fonctionnalités selon le statut des paiements.

---

## 3. Modules à construire

### 3.1. Module MoMo
Responsable de :
- configuration API,
- génération et stockage du token,
- appels HTTP vers les endpoints MoMo,
- logique de retry,
- gestion des erreurs et callbacks.

### 3.2. Module Abonnements
Responsable de :
- création de plans,
- souscription des artisans,
- renouvellement automatique,
- suspension si paiement refusé,
- relance de paiement,
- durée d’abonnement.

### 3.3. Module Paiements
Responsable de :
- paiement de commande,
- paiement de devis,
- historique des transactions,
- statut de paiement,
- référence externe MoMo.

### 3.4. Module Versements artisans (Payouts)
Responsable de :
- calcul du montant à reverser à l’artisan,
- déclenchement du disbursement,
- suivi du statut de versement,
- remboursement ou correction éventuelle.

### 3.5. Module Commission
Responsable de :
- calcul de la commission de la plateforme,
- gestion des règles selon type de commande ou de service,
- génération de reporting financier.

### 3.6. Module Webhook
Responsable de :
- réception des callbacks MoMo,
- validation du statut de paiement,
- mise à jour des transactions,
- déclenchement des actions métier.

---

## 4. Architecture recommandée

### Stack technique
- Backend : NestJS
- Base de données : PostgreSQL
- ORM : TypeORM
- Auth : JWT
- File d’async : Redis (recommandé)
- Queue d’événements : éventuellement BullMQ / Redis
- Envoi notification : email + SMS
- Monitoring : logs centralisés + erreurs

### Structure backend
- src/modules/momo/
- src/modules/subscriptions/
- src/modules/payments/
- src/modules/payouts/
- src/modules/commissions/
- src/modules/webhooks/
- src/modules/users/
- src/entities/
- src/common/

---

## 5. Entités principales

### User
- id
- email
- passwordHash
- role
- isActive
- subscriptionStatus
- createdAt

### Plan
- id
- name
- price
- currency
- durationDays
- features

### Subscription
- id
- userId
- planId
- status
- amount
- currency
- startDate
- endDate
- paymentReference
- momoToken
- lastPaymentAt

### Payment
- id
- userId
- orderId
- subscriptionId
- amount
- fee
- netAmount
- currency
- status
- provider
- providerReference
- externalId
- createdAt

### Payout
- id
- artisanId
- paymentId
- amount
- status
- provider
- providerReference
- processedAt

### Commission
- id
- paymentId
- platformFee
- artisanAmount
- status

### WebhookEvent
- id
- provider
- eventType
- payload
- status
- processedAt

---

## 6. Flux fonctionnel

### 6.1. Paiement d’une commande
1. Le client choisit un produit ou un service.
2. Le backend calcule le montant total.
3. Le backend appelle MoMo Collections.
4. MoMo renvoie une référence de paiement.
5. Le backend enregistre la transaction en statut `pending`.
6. Le client valide le paiement sur son téléphone.
7. MoMo envoie un callback webhook.
8. Le backend met à jour la transaction en `success` ou `failed`.
9. Si succès : la commande est validée et les notifications sont envoyées.
10. Si échec : la commande reste bloquée ou est annulée selon le cas.

### 6.2. Abonnement mensuel automatisé
1. L’artisan souscrit à un plan.
2. Le backend active l’abonnement.
3. Le premier paiement est déclenché.
4. Le token MoMo récurrent est conservé.
5. Chaque mois, le backend déclenche un nouveau paiement.
6. Si paiement réussi : extension de l’abonnement.
7. Si paiement échoué : suspension du compte ou des fonctionnalités premium.
8. Une relance est envoyée par email/SMS.

### 6.3. Versement à l’artisan
1. Un client paie une commande.
2. La plateforme calcule :
   - montant total payé,
   - commission platforme,
   - montant net à verser à l’artisan.
3. Le backend déclenche le disbursement MoMo.
4. Le montant est envoyé à l’artisan.
5. La transaction de payout est enregistrée en base.
6. Le dashboard artisan affiche le statut du versement.

---

## 7. Workflow MoMo à intégrer

### 7.1. Collections
À utiliser pour :
- paiement d’abonnement,
- paiement de commandes,
- paiement de devis.

### 7.2. Disbursements
À utiliser pour :
- payer les artisans,
- payer certaines commissions,
- rembourser ou corriger des transactions.

### 7.3. Tokenization
À utiliser pour :
- abonnements récurrents,
- paiements automatiques mensuels,
- fidélisation de la relation de paiement.

---

## 8. Endpoints backend à prévoir

### Auth
- POST /auth/register
- POST /auth/login

### Payments
- POST /payments/create
- POST /payments/confirm
- GET /payments/:id
- GET /payments/history
- GET /payments/user/:userId

### Subscriptions
- POST /subscriptions/create
- POST /subscriptions/renew
- POST /subscriptions/cancel
- GET /subscriptions/:id
- GET /subscriptions/user/:userId

### Payouts
- POST /payouts/initiate
- GET /payouts/:artisanId
- POST /payouts/reconcile

### Webhooks
- POST /webhooks/momo
- GET /webhooks/momo/status

### Admin
- GET /admin/payments
- GET /admin/subscriptions
- GET /admin/payouts
- GET /admin/reports

---

## 9. Gestion des statuts
Il faut un modèle d’état explicite pour éviter les ambiguïtés :
- pending
- processing
- success
- failed
- cancelled
- refunded
- expired
- suspended

Cela permet de gérer correctement le cycle complet de paiement et d’abonnement.

---

## 10. Sécurité
- valider les signatures webhook MoMo,
- empêcher les doubles paiements,
- utiliser des références externes idempotentes,
- stocker les identifiants de transactions externes,
- vérifier les montants reçus,
- journaliser chaque transaction,
- sécuriser les tokens et clés API.

---

## 11. Gestion des erreurs
À gérer :
- token expiré,
- paiement refusé,
- callback manquant,
- retry réseau,
- transaction en attente,
- conflit sur la référence externe,
- montant incohérent,
- paiement partiel ou incohérent.

Le backend doit être capable de reprendre proprement une transaction sans créer de doublon.

---

## 12. Règles de business à définir avant le code
Avant de se lancer dans le développement, il faut fixer :
- prix de l’abonnement mensuel,
- commission plateforme,
- montant des frais de transaction,
- qui paie les frais,
- politique de suspension d’un artisan,
- politique de remboursement,
- délais de versement,
- règle d’extension ou d’échec lors d’un paiement.

Ce sont des décisions critiques car elles influencent le design technique et le business logic.

---

## 13. MVP recommandé
### Phase 1 – MVP Paiement
- abonnement artisan mensuel,
- paiement d’une commande,
- webhook de validation,
- historique des paiements,
- commission simple,
- dashboard de suivi.

### Phase 2 – Payout et gestion
- versements pour artisans,
- remboursements,
- relances automatiques,
- dashboard admin.

### Phase 3 – Évolution
- paiements récurrents avancés,
- reçus PDF,
- notifications SMS,
- reporting financier,
- optimisation du support client.

---

## 14. Rôle de MoMo dans le modèle de business
Le vrai enjeu n’est pas seulement d’“ajouter MoMo” dans l’application. Le vrai enjeu est de faire de la plateforme un moteur financier capable de :
- collecter les paiements clients,
- gérer automatiquement les abonnements,
- prélever les commissions,
- verser les artisans,
- sécuriser les transactions,
- automatiser les opérations sans intervention manuelle.

Autrement dit, ArtisanConnect devient une plateforme qui gère non seulement les annonces et commandes, mais aussi le cycle de paiement complet.

---

## 15. Plan de livraison technique

### Semaine 1
- architecture du backend,
- entités de base,
- modules MoMo, paiement et abonnement,
- configuration sandbox MoMo.

### Semaine 2
- paiement d’une commande,
- gestion des callbacks,
- statut de transaction,
- historique et logs.

### Semaine 3
- abonnement mensuel,
- tokenisation,
- suspension et réactivation,
- notifications.

### Semaine 4
- versements artisans,
- commission,
- dashboard admin,
- recette sandbox,
- préparation production.

---

## 16. Conclusion
Le plan le plus solide pour ArtisanConnect est celui d’une plateforme de paiement complète avec 4 briques majeures :
1. MoMo Collections pour recevoir l’argent,
2. Abonnements pour monétiser les artisans,
3. MoMo Disbursements pour payer les artisans,
4. Webhooks et transactions pour automatiser le cycle complet.

C’est cette combinaison qui permet de transformer ArtisanConnect d’une simple plateforme d’annonces en une vraie plateforme fintech artisanale.

---

## 17. Prochaine étape concrète
Je peux maintenant te faire immédiatement l’une de ces tâches :
- créer l’architecture NestJS exacte pour MoMo,
- écrire les entités TypeORM,
- définir les endpoints API complets,
- coder le service MoMo (Collections + Disbursement + Webhook),
- créer le module abonnement mensuel complet,
- ou préparer la version MVP de paiement avec code de base.