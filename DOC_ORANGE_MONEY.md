# Documentation Technique : Intégration Orange Money Cameroun

## 1. Vue d'ensemble du paiement Orange Money

ArtisanConnect intègre l'API **Orange Money Web Payment (CM)** pour sécuriser les transactions entre clients, artisans et transporteurs au Cameroun.

### Modèle de paiement avec séquestre (Escrow)

Pour protéger l'acheteur et l'artisan contre la fraude :
1. **Paiement bloqué (Escrow)** : Lors de la commande, le montant est prélevé via Orange Money et bloqué sur le compte marchand sécurisé de la plateforme.
2. **Validation disponibilité** : L'artisan confirme que le produit ou service est prêt.
3. **Vérification transporteur** : Le transporteur ou livreur certifie la conformité du colis lors du ramassage.
4. **Réception client** : Le client valide la réception à domicile ou à l'atelier.
5. **Reversement (Disbursement)** : La plateforme libère les fonds :
   - **90 %** reversés directement sur le numéro Orange Money de l'artisan ;
   - **10 %** de commission plateforme conservée par ArtisanConnect.

---

## 2. Variables d'environnement requises (`backend/.env`)

```env
# Configuration Orange Money Cameroun
ORANGE_MONEY_CLIENT_ID=votre_client_id_orange_developer
ORANGE_MONEY_CLIENT_SECRET=votre_client_secret_orange_developer
ORANGE_MONEY_MERCHANT_KEY=votre_cle_marchand
ORANGE_MONEY_BASE_URL=https://api.orange.com
ORANGE_MONEY_MODE=sandbox # ou production / mock
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
| `disburseToArtisan(dto)` | Reversement automatique vers l'artisan | `POST /orange-money/v1/disbursement` |
| `handleCallback(payload)` | Traitement des webhooks IPN d'Orange | Endpoint public `/payments/orange/callback` |

---

## 4. Endpoints API d'ArtisanConnect

| Méthode | Route | Rôle |
| :--- | :--- | :--- |
| `POST` | `/payments/order/:orderId/webpayment` | Déclenche l'initialisation du paiement Orange Money et retourne l'URL de paiement. |
| `POST` | `/payments/order/:orderId/confirm-availability` | L'artisan confirme la disponibilité de la commande. |
| `POST` | `/payments/order/:orderId/carrier-verify` | Le transporteur confirme la prise en charge et conformité. |
| `POST` | `/payments/order/:orderId/confirm-reception` | Le client confirme la bonne réception. |
| `POST` | `/payments/order/:orderId/disbursement` | Déclenche le reversement automatique des 90% à l'artisan. |
| `POST` | `/payments/order/:orderId/refund` | Remboursement automatique en cas de non-conformité ou annulation. |
| `POST` | `/payments/orange/callback` | Webhook IPN public recevant les statuts de paiement émis par Orange. |
| `GET` | `/payments/orange/status/:orderId` | Vérification en direct du statut d'une transaction Orange Money. |

---

## 5. Bascule entre Mode Simulation (Mock) et Production

- **Mode Mock (Développement / Test)** : Si aucune clé n'est renseignée dans `.env` ou si `ORANGE_MONEY_MODE=mock`, le système génère des transactions simulées instantanées sans bloquer le développement.
- **Mode Réel (Sandbox / Production)** : Dès que vous disposez d'un compte **Orange Developer** validé pour le Cameroun, renseignez vos clés dans le fichier `.env` pour activer les paiements et reversements réels.
