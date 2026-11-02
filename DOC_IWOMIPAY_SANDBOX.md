# Iwomipay sandbox — paiements Mobile Money et carte

Les paiements Orange Money, MTN MoMo et carte bancaire des commandes passent par Iwomipay. Le moyen de paiement reste associé à la commande (`orange_money`, `momo` ou `card`); seule la couche d'encaissement est mutualisée. Le mode Iwomipay reste en simulation tant que `IWOMIPAY_MODE` n'est pas explicitement défini à `sandbox`.

## Configuration backend

Renseigner ces variables dans le backend local ou Railway staging, jamais dans le frontend ni dans le dépôt :

```env
IWOMIPAY_MODE=mock
IWOMIPAY_BASE_URL=https://www.pay.iwomitechnologies.com/api/iwomipay_sandbox
IWOMIPAY_STATUS_PATH=iwomipayStatus
IWOMIPAY_USERNAME=
IWOMIPAY_PASSWORD=
IWOMIPAY_MOMO_ACCOUNT_KEY=
IWOMIPAY_OM_ACCOUNT_KEY=
IWOMIPAY_CARD_ACCOUNT_KEY=
# Compatibilite avec un compte utilisant une paire commune :
IWOMIPAY_API_KEY=
IWOMIPAY_API_SECRET=
API_URL=https://<url-publique-du-backend>
FRONTEND_URL=https://<url-du-frontend>
```

La collection Postman partagee contient une authentification commune et un en-tete
`AccountKey` distinct pour MoMo, Orange Money et carte. Configurer la valeur deja encodee
du canal dans la variable correspondante, sans la decoder ni la reencoder. Ne pas copier
les jetons `Authorization` : le backend obtient un jeton via `/authenticate`.
Une cle du canal est prioritaire ; en son absence seulement, la paire commune
`IWOMIPAY_API_KEY` / `IWOMIPAY_API_SECRET` est encodee en base64 pour compatibilite.
La cle d'un autre canal n'est jamais reutilisee implicitement.

Les identifiants presents dans les documents ne sont pas presumes etre attribues au compte
ArtisanConnect : utiliser uniquement les identifiants sandbox autorises par le fournisseur.
Ne pas importer la collection contenant des secrets dans Git.
Conserver `mock` pendant la configuration puis passer explicitement a `sandbox`
uniquement pour les essais autorises. Aucun mode de production n'est active ici.

## Parcours

1. L'acheteur choisit Orange Money, MoMo ou carte. Les paiements mobiles demandent le numéro camerounais à débiter.
2. Le paiement carte demande prénom, nom, email, adresse et ville pour le formulaire fournisseur; la saisie des données de carte est laissée à la page sécurisée d'Iwomipay. Le numéro de téléphone reste demandé, conformément au tableau des paramètres du PDF.
3. Le backend authentifie le compte avec `POST /authenticate`, met en cache le token moins de cinq minutes, puis crée une collecte `POST /iwomipay`. Le paramètre `type` vaut `om`, `momo` ou `card`.
4. L'identifiant externe généré par ArtisanConnect respecte la limite documentée de 16 caractères; l'identifiant interne retourné par Iwomipay est stocké séparément.
5. Le retour du navigateur n'est pas considéré comme une preuve de paiement. Le callback public et l'endpoint authentifié `GET /payments/iwomipay/status/:orderId` consultent le statut réel auprès d'Iwomipay avant de confirmer le paiement et d'émettre la facture.
6. Les statuts `01`, `1000` et `100` sont interprétés comme réussi, en attente et échoué.

La collecte sandbox utilise desormais `op_type=credit` et `currency=xaf`, conformement
aux trois requetes Postman et a la confirmation de l'utilisateur que CREDIT sert a
encaisser le paiement dans son sandbox. Cela remplace l'interpretation contradictoire du PDF.
Le montant minimal accepte par l'application est de 50 FCFA, valeur des exemples Postman ;
il ne s'agit pas d'une certification du minimum fournisseur en production.
Les secrets marchands sont transmis dans `AccountKey`, pas dupliques dans le corps JSON.
Le champ carte est `first_name` ; la faute `fist_name` de l'exemple MoMo n'est pas reproduite.

La collection ne contient ni requete de statut, ni reponses sauvegardees, ni assertions
automatiques. Elle ne prouve donc pas le succes d'une transaction ou le format de sa reponse.
L'endpoint de statut conserve `iwomipayStatus/{internal_id}`, issu du PDF et toujours a
confirmer avec le fournisseur ; `IWOMIPAY_STATUS_PATH` permet d'adapter ce chemin.
La verification serveur des references et du statut reste obligatoire avant confirmation
de commande. Aucun retour navigateur ou callback seul ne constitue une preuve de paiement.

Le PDF ne documente pas de remboursement ou de reversement exploitable. Les étapes escrow actuelles de remboursement et de libération restent donc des mises à jour applicatives et ne déplacent pas d'argent. Ne pas activer une collecte avant validation écrite du protocole, des statuts, du chemin de vérification, des types activés sur le compte et des mécanismes de remboursement/reversement.
