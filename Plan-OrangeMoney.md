1. Positionnement Orange Money pour ArtisanConnect
Pourquoi Orange Money est indispensable :
Moyen de paiement le plus utilisé au Cameroun

Confiance élevée des utilisateurs

Paiement instantané

Réduction du cash → moins de fraude

API officielle disponible via Orange Developer + validation locale

Compatible avec ton modèle marketplace

Cas d’usage ArtisanConnect :
Paiement des commandes

Paiement des services

Paiement des livraisons (Phase 2)

Reversement automatique aux artisans (Phase 2)

🟦 2. Modes de paiement à proposer dans ArtisanConnect
Pour le client :
Orange Money (recommandé)

Espèces

Stripe (Phase 2)

Pour l’artisan :
Voir statut du paiement

Voir montant reçu

Voir commission plateforme

Historique des paiements

🟧 3. Flux Orange Money – Phase 1 (MVP Web Payment)
Version MVP avec Web Payment, la méthode la plus simple et la plus fiable.

1️⃣ Client passe commande
Choix du paiement :

Espèces

Orange Money

2️⃣ Backend initie une transaction
Endpoint :

Code
POST /payments/orange/init
Backend génère :

transaction_id

order_id

amount

status = pending

3️⃣ Backend appelle Orange Money Web Payment
Envoie :

Montant

Numéro client (msisdn)

Description

Reçoit :

payment_token

payment_url (si web)

status = PENDING

4️⃣ Client valide via USSD ou app Orange Money
Orange Money gère :

Authentification

Confirmation du paiement

5️⃣ Orange Money envoie un callback à ton backend
Endpoint :

Code
POST /payments/orange/callback
Payload :

transaction_id

status = SUCCESS | FAILED

amount

msisdn

6️⃣ Backend met à jour la commande
Si SUCCESS :

order.status = confirmed

payment.status = confirmed

Si FAILED :

order.status = pending

payment.status = failed

7️⃣ Notifications
Client : “Paiement confirmé”

Artisan : “Nouvelle commande payée”

Admin : “Paiement Orange Money reçu”

🟫 4. Flux Orange Money – Phase 2 (Escrow + Reversement artisans)
1️⃣ Client paie → argent stocké dans un compte escrow
2️⃣ Artisan livre → client confirme
3️⃣ Plateforme reverse automatiquement :
90% à l’artisan

10% à la plateforme

4️⃣ Dashboard admin :
Paiements en attente

Reversements effectués

Historique complet

5️⃣ API Orange Money Business (si disponible)
Paiement marchand

Reversement automatique

Vérification transaction

Réconciliation

🟨 5. Modèle de données Orange Money (Phase 1)
sql
CREATE TABLE orange_money_transactions (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  payment_token VARCHAR,
  transaction_id VARCHAR,
  amount DECIMAL,
  msisdn VARCHAR,
  status ENUM('pending', 'success', 'failed'),
  raw_callback JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
Phase 2 (ajouts)
sql
ALTER TABLE orange_money_transactions
ADD COLUMN escrow BOOLEAN DEFAULT FALSE,
ADD COLUMN artisan_payout_status ENUM('pending','paid') DEFAULT 'pending';
🟥 6. Endpoints API Orange Money
Phase 1
Code
POST /payments/orange/init
POST /payments/orange/callback
GET  /payments/orange/:orderId
GET  /admin/payments/orange
Phase 2
Code
POST /payments/orange/escrow/init
POST /payments/orange/payout/:artisanId
GET  /admin/payments/orange/escrow
🟦 7. Sécurité & conformité
Obligatoire Phase 1 :
Signature HMAC du callback

Validation IP Orange Money

Token OAuth2 stocké en mémoire sécurisée

Logs complets des transactions

Double vérification du montant

Phase 2 :
Anti‑fraude

Réconciliation automatique

Dashboard des paiements

Audit logs

---

## 🟦 8. Documentation technique d'intégration & état

- **Documentation complète du module Orange Money** : Voir le fichier [DOC_ORANGE_MONEY.md](DOC_ORANGE_MONEY.md).
- **Service Orange Money prêt** : [orange-money.service.ts](backend/src/modules/payments/orange-money.service.ts)
- **Service Escrow / Séquestre raccordé** : [escrow.service.ts](backend/src/modules/payments/escrow.service.ts)
- **Endpoints & Webhooks IPN en place** : [payments.controller.ts](backend/src/modules/payments/payments.controller.ts)
- **Mode simulation / Fallback** : Fonctionnel par défaut en environnement local jusqu'à configuration des clés Orange Developer.

🟩 8. UX côté client
Page paiement :
Choix :

Espèces

Orange Money (recommandé)

Message :
“Vous allez recevoir une demande de paiement Orange Money.”

Après validation :
Loader “En attente de confirmation Orange Money”

Redirection automatique après callback

🟧 9. UX côté artisan
Page commandes :
Badge “Payée via Orange Money”

Montant reçu

Commission plateforme

Historique des paiements

🟫 10. UX côté admin
Dashboard :
Paiements Orange Money

Transactions en attente

Transactions échouées

Reversements artisans (Phase 2)

Export CSV

🎯 Résumé pour ta checklist
Élément	Phase	Description
Web Payment	1	Paiement client → callback → confirmation
Table OM	1	Stockage transactions
Sécurité	1	HMAC, IP whitelist, logs
Dashboard admin	1	Suivi paiements
Escrow	2	Argent bloqué jusqu’à livraison
Reversement artisans	2	Paiement automatique
Réconciliation	2	Vérification transactions
Anti‑fraude	2	Protection avancée