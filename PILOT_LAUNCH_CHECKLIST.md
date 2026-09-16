# Checklist phase pilote controlee

Checklist complémentaire pour l'authentification e-mail/téléphone : [CHECKLIST_AUTH_PILOTE.md](./CHECKLIST_AUTH_PILOTE.md).

## Positionnement pilote

Objectif : lancer ArtisanConnect avec un perimetre controle, sans attendre les cles API de paiement et transporteur.

Modes actifs pendant le pilote :
- Paiement en especes : reel.
- MoMo : mock/sandbox.
- Orange Money : mock/sandbox.
- Gozem : simulation.
- KYC boutique : facultatif a la creation.
- Boutiques artisan : validation manuelle admin.
- SMTP : reel.

## Configuration backend

1. Copier `backend/.env.pilot.example` vers `backend/.env` sur l'environnement pilote.
2. Renseigner les valeurs reelles :
   - `DATABASE_URL` ou `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
   - `JWT_SECRET`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
   - `API_URL`, `FRONTEND_URL`
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
3. Garder les paiements externes en mock :
   - `MOMO_MODE=mock`
   - `ORANGE_MONEY_MODE=mock`
4. Garder Gozem en simulation :
   - `CARRIER_PROVIDER=Gozem`
   - `CARRIER_API_KEY=` vide
5. Ne pas activer les cles MoMo, Orange ou Gozem tant que les comptes API ne sont pas valides.

## Points fonctionnels a tester

1. Inscription client.
2. Inscription artisan.
3. Verification email.
4. Creation boutique artisan sans pieces KYC.
5. Validation manuelle admin de la boutique artisan.
6. Creation annonce produit.
7. Commande produit avec paiement en especes.
8. Commande produit avec MoMo mock.
9. Commande produit avec Orange Money mock.
10. Commande avec livraison : atelier, domicile, transporteur.
11. Creation course transporteur simulee.
12. Messagerie interne.
13. Reception email lors d'un nouveau message.
14. Reset password par email.
15. Consultation dashboard artisan/admin.

## Regles operationnelles pilote

- Limiter le pilote a un petit groupe d'artisans et clients connus.
- Communiquer clairement que MoMo, Orange Money et Gozem sont en simulation tant que les contrats API ne sont pas finalises.
- Utiliser le paiement en especes pour les transactions reelles.
- Garder une validation manuelle des boutiques artisan.
- Accepter les boutiques sans KYC au demarrage, puis completer les pieces plus tard.
- Surveiller les emails transactionnels : verification email, reset password, nouveau message.

## Passage aux paiements reels plus tard

Quand les cles API sont recues et validees :

MoMo :
- Renseigner `MOMO_API_USER`, `MOMO_API_KEY`, `MOMO_SUBSCRIPTION_KEY`.
- Configurer `MOMO_WEBHOOK_SECRET`.
- Passer `MOMO_MODE` au mode fourni par l'environnement cible.
- Configurer les callbacks publics : `/payments/momo/webhook`, `/subscriptions/webhook`.

Orange Money :
- Renseigner `ORANGE_MONEY_CLIENT_ID`, `ORANGE_MONEY_CLIENT_SECRET`, `ORANGE_MONEY_MERCHANT_KEY`.
- Passer `ORANGE_MONEY_MODE` au mode reel/sandbox selon le compte.
- Configurer le callback public : `/payments/orange/callback`.

Gozem :
- Renseigner `CARRIER_API_KEY`.
- Confirmer `CARRIER_API_URL` avec Gozem.
- Configurer `CARRIER_WEBHOOK_SECRET`.
- Configurer le callback public : `/delivery/webhook`.

## Commandes de verification locale

Backend :
```powershell
cd c:/POC/ArtisanConnect/backend
npm.cmd run build
npm.cmd test -- --run src/modules/shops/shops.service.spec.ts src/modules/messages/messages.service.spec.ts
npm.cmd run test:e2e -- --run test/momo-webhooks.e2e-spec.ts
npm.cmd run test:e2e -- --run test/orange-money-webhook.e2e-spec.ts
npm.cmd run test:e2e -- --run test/delivery-gozem.e2e-spec.ts
```

Frontend :
```powershell
cd c:/POC/ArtisanConnect/frontend
npm.cmd run build
```
