# Documentation Technique : Parcours Orange Money Cameroun

## 1. Vue d'ensemble du paiement Orange Money

ArtisanConnect contient un parcours Web Payment Orange Money avec un mode mock/sandbox. Cette documentation décrit l’architecture et les endpoints applicatifs; elle ne signifie pas que l’encaissement, le séquestre ou le reversement sont opérationnels en production. Vérifier la configuration et l’état d’activation avant toute transaction réelle.

### Parcours applicatif (état actuel)

Le code représente les étapes d’un workflow de type escrow : initialisation du paiement, confirmation de disponibilité, contrôle de livraison, confirmation de réception et demande de libération. En mode mock, ces statuts ne déplacent pas d’argent réel. L’appel officiel Orange Money de reversement B2W n’est pas intégré à ce jour.

Règle de commission prévue pour le pilote : **5 % uniquement sur les paiements réellement encaissés par ArtisanConnect**; 0 % sur les paiements directs en espèces et sur les essais mock/sandbox. Le montant est comptabilisé dans la commande lors du déblocage en configuration réelle, mais il n’est pas automatiquement retenu d’un reversement artisan. La facture client est distincte : elle porte le total de vente et la TVA configurée, sans y ajouter la commission artisan.

---

## 2. Variables d'environnement requises (`backend/.env`)

```env
# Configuration Orange Money Cameroun
ORANGE_MONEY_CLIENT_ID=votre_client_id_orange_developer
ORANGE_MONEY_CLIENT_SECRET=votre_client_secret_orange_developer
ORANGE_MONEY_MERCHANT_KEY=votre_cle_marchand
ORANGE_MONEY_BASE_URL=https://api.orange.com
ORANGE_MONEY_MODE=mock # live uniquement après validation de l'intégration et des identifiants officiels
```

---

## 3. Architecture du Service Backend

- **Service Orange Money** : `backend/src/modules/payments/orange-money.service.ts`
- **Service Escrow (Séquestre)** : `backend/src/modules/payments/escrow.service.ts`
- **Contrôleur API** : `backend/src/modules/payments/payments.controller.ts`

### Méthodes disponibles dans `OrangeMoneyService`

| Méthode | Rôle | Endpoint Orange appelé |
| :--- | :--- | :--- |
| `getAccessToken()` | Génération & mise en cache automatique du jeton OAuth2 | `POST /oauth/v3/token` |
| `initWebPayment(dto)` | Création de la session de paiement sécurisé | `POST /orange-money-webpay/cm/v1/webpayment` |
| `checkTransactionStatus(...)` | Consultation de l'état d'une transaction | `POST /orange-money-webpay/cm/v1/transactionstatus` |
| `disburseToArtisan(dto)` | Prototype; l'appel officiel Orange Money B2W est commenté/non intégré | Aucun appel réel actuellement |
| `handleCallback(payload)` | Traitement des webhooks IPN d'Orange | Endpoint public `/payments/orange/callback` |

---

## 4. Endpoints API d'ArtisanConnect

| Méthode | Route | Rôle |
| :--- | :--- | :--- |
| `POST` | `/payments/order/:orderId/webpayment` | Déclenche l'initialisation du paiement Orange Money et retourne l'URL de paiement. |
| `POST` | `/payments/order/:orderId/confirm-availability` | L'artisan confirme la disponibilité de la commande. |
| `POST` | `/payments/order/:orderId/carrier-verify` | Le transporteur confirme la prise en charge et conformité. |
| `POST` | `/payments/order/:orderId/confirm-reception` | Le client confirme la bonne réception. |
| `POST` | `/payments/order/:orderId/disbursement` | Enregistre la capture/libération dans le workflow applicatif; ne déclenche pas un reversement Orange Money réel. |
| `POST` | `/payments/order/:orderId/refund` | Déclenche le workflow applicatif de remboursement; ne garantit pas un transfert Orange Money réel. |
| `POST` | `/payments/orange/callback` | Webhook IPN public recevant les statuts de paiement émis par Orange. |
| `GET` | `/payments/orange/status/:orderId` | Vérification en direct du statut d'une transaction Orange Money. |

---

## 5. Bascule entre Mode Simulation (Mock) et Production

- **Mode Mock (Développement / Préproduction)** : Sans identifiants complets ou avec `ORANGE_MONEY_MODE=mock`, le parcours ne doit servir qu'aux essais; il n'encaisse ni ne reverse d'argent réel.
- **Mode live** : `ORANGE_MONEY_MODE=live` et les identifiants officiels requis sont nécessaires à la comptabilisation de la commission. Ne l'activer qu'après validation contractuelle, technique, sécurité et recette avec Orange; ce réglage ne rend pas le reversement B2W disponible.
- **Avant mise en production** : confirmer les URLs et identifiants fournis par Orange, la signature et l'idempotence des callbacks, le traitement des remboursements, ainsi que le reversement séparé. Une sandbox Orange n'est pas une transaction live et ne doit pas produire de commission.
