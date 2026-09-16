# Checklist authentification avant pilote

## Objectif

Valider les deux modes d'inscription ArtisanConnect avant l'ouverture du pilote :

- inscription avec adresse e-mail ;
- inscription avec numéro de téléphone camerounais et code OTP.

Le mode OTP actuel est un **mode mock de développement**. Aucun message WhatsApp ou SMS réel n'est envoyé tant qu'un fournisseur n'est pas configuré.

## État actuel

### Inscription par e-mail

- [x] L'utilisateur choisit l'inscription par e-mail.
- [x] Le compte est créé avec un mot de passe.
- [x] Un lien de vérification e-mail est envoyé par SMTP lorsque Brevo SMTP est actif.
- [x] Le lien expire après 24 heures.
- [x] La connexion accepte l'adresse e-mail et le mot de passe.
- [ ] Tester le lien dans un vrai e-mail sur l'environnement pilote.
- [ ] Vérifier les domaines SPF, DKIM et DMARC de l'expéditeur.

### Inscription par téléphone

- [x] L'utilisateur peut choisir le mode téléphone.
- [x] Les numéros camerounais sont normalisés au format international `+237...`.
- [x] Un OTP à 6 chiffres est généré.
- [x] L'OTP est stocké sous forme hachée en base.
- [x] L'OTP expire après 10 minutes.
- [x] La connexion accepte le numéro de téléphone et le mot de passe.
- [x] Le compte peut être vérifié avec l'endpoint `POST /auth/verify-phone`.
- [x] En mode développement, le code de test est renvoyé dans la réponse d'inscription et écrit dans les logs backend.
- [ ] Remplacer le mock par un envoi WhatsApp Brevo ou SMS avant toute utilisation réelle.
- [ ] Ajouter une limite de tentatives OTP.
- [ ] Ajouter une limite de renvois OTP par numéro et par adresse IP.
- [ ] Ne jamais renvoyer `developmentOtp` lorsque `NODE_ENV=production`.
- [ ] Ajouter une journalisation sans afficher le code OTP en production.

## Test local du mode mock

### Préparation

Backend :

```powershell
cd c:\POC\ArtisanConnect\backend
npm.cmd run start:dev
```

Frontend :

```powershell
cd c:\POC\ArtisanConnect\frontend
npm.cmd run dev
```

Ouvrir :

```text
http://localhost:3000/register
```

### Parcours téléphone

1. Sélectionner **Téléphone**.
2. Saisir un numéro de test au format `+237 6XX XXX XXX`.
3. Choisir le rôle : client, artisan ou institution.
4. Créer le compte.
5. Relever le code OTP de test affiché par l'application ou dans les logs backend.
6. Saisir le code à 6 chiffres.
7. Vérifier que le numéro est accepté.
8. Se connecter avec le numéro et le mot de passe.
9. Vérifier que la session est créée et que le rôle est respecté.

### Parcours e-mail

1. Sélectionner **Email**.
2. Saisir une adresse de test réellement accessible.
3. Créer le compte.
4. Vérifier la réception du message Brevo SMTP.
5. Cliquer sur le lien de vérification.
6. Vérifier que le bandeau de vérification disparaît après connexion.
7. Tester le renvoi du lien expiré.

## Cas négatifs obligatoires

- [ ] Inscription sans e-mail ni téléphone refusée.
- [ ] E-mail déjà utilisé refusé.
- [ ] Numéro déjà utilisé refusé.
- [ ] Numéro camerounais invalide refusé.
- [ ] OTP incorrect refusé.
- [ ] OTP expiré refusé.
- [ ] OTP réutilisé refusé après vérification.
- [ ] Connexion avec mauvais mot de passe refusée.
- [ ] Connexion avec un numéro non vérifié refusée ou contrôlée selon la règle métier retenue.
- [ ] Un compte téléphone ne reçoit pas de tentative d'envoi e-mail vers l'adresse technique interne.
- [ ] Un compte e-mail conserve son fonctionnement historique.

## Configuration mock recommandée

Ajouter explicitement dans l'environnement de développement :

```env
PHONE_OTP_MODE=mock
```

Le mock ne doit pas être utilisé pour une ouverture publique. Le code OTP ne doit jamais être affiché dans l'interface ou les logs d'un environnement de production.

## Passage à WhatsApp Brevo

Brevo utilise l'endpoint :

```text
POST https://api.brevo.com/v3/whatsapp/sendMessage
```

Avant l'activation :

- [ ] Activer WhatsApp dans Brevo.
- [ ] Connecter le compte WhatsApp Business.
- [ ] Vérifier le numéro expéditeur.
- [ ] Créer et faire approuver un template OTP.
- [ ] Récupérer le `templateId` dans le tableau de bord Brevo ou via l'API des templates WhatsApp.
- [ ] Ajouter les secrets uniquement dans Render, jamais dans Git :

```env
PHONE_OTP_MODE=brevo_whatsapp
BREVO_API_KEY=...
BREVO_WHATSAPP_SENDER_NUMBER=237XXXXXXXXX
BREVO_WHATSAPP_TEMPLATE_ID=...
```

- [ ] Envoyer les destinataires sans espaces ni caractères spéciaux, par exemple `2376XXXXXXXX`.
- [ ] Tester les réponses HTTP 201 et les erreurs HTTP 400.
- [ ] Vérifier les journaux d'activité WhatsApp Brevo.
- [ ] Prévoir un message de secours si WhatsApp est indisponible.
- [ ] Ne jamais exposer la clé API Brevo dans le frontend.

## Décision métier à prendre

Avant le pilote, choisir la règle suivante pour les comptes non vérifiés :

- [ ] Autoriser la connexion mais limiter les commandes tant que le contact n'est pas vérifié.
- [ ] Interdire la connexion jusqu'à la vérification du contact.
- [ ] Autoriser la connexion complète uniquement après vérification e-mail ou téléphone.

La règle retenue doit être appliquée de manière identique aux deux modes de contact.

## Critères de validation avant pilote

Le parcours est prêt lorsque :

- [ ] Les parcours e-mail et téléphone passent sur une base pilote propre.
- [ ] Aucun OTP de test n'est exposé en production.
- [ ] Les doublons e-mail et téléphone sont bloqués.
- [ ] Les codes expirés et réutilisés sont refusés.
- [ ] Les comptes téléphone peuvent se connecter sans adresse e-mail utilisateur.
- [ ] Les comptes e-mail continuent à recevoir les liens de vérification.
- [ ] Le fournisseur WhatsApp/SMS réel est configuré, ou le téléphone est désactivé du pilote public.
- [ ] Les logs ne contiennent ni mot de passe, ni clé API, ni OTP de production.
- [ ] Les limites anti-abus sont en place.
- [ ] La procédure de support pour un numéro perdu ou remplacé est documentée.

## Commandes de validation

Backend :

```powershell
cd c:\POC\ArtisanConnect\backend
npm.cmd run build
npm.cmd test
npm.cmd run test:e2e
```

Frontend :

```powershell
cd c:\POC\ArtisanConnect\frontend
npm.cmd run lint
npm.cmd run build
```

Référence pilote générale : [PILOT_LAUNCH_CHECKLIST.md](./PILOT_LAUNCH_CHECKLIST.md)
