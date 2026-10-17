# Iwomipay sandbox — paiements Mobile Money et carte

Les paiements Orange Money, MTN MoMo et carte bancaire des commandes passent par Iwomipay. Le moyen de paiement reste associé à la commande (`orange_money`, `momo` ou `card`); seule la couche d'encaissement est mutualisée. Le mode Iwomipay reste en simulation tant que `IWOMIPAY_MODE` n'est pas explicitement défini à `sandbox`.

## Configuration backend

Renseigner ces variables dans l'environnement local du backend, jamais dans le frontend ni dans le dépôt :

```env
IWOMIPAY_MODE=sandbox
IWOMIPAY_BASE_URL=https://www.pay.iwomitechnologies.com/api/iwomipay_sandbox
IWOMIPAY_STATUS_PATH=iwomipayStatus
IWOMIPAY_USERNAME=
IWOMIPAY_PASSWORD=
IWOMIPAY_API_KEY=
IWOMIPAY_API_SECRET=
API_URL=https://<url-publique-du-backend>
FRONTEND_URL=https://<url-du-frontend>
```

Les valeurs `iwomipay2021` et `iwomipay@2020` figurant dans le PDF sont des exemples de documentation et ne sont pas présumées être des identifiants attribués au compte ArtisanConnect. Il faut obtenir les quatre identifiants réels auprès d'Iwomipay avant tout appel sandbox.

## Parcours

1. L'acheteur choisit Orange Money, MoMo ou carte. Les paiements mobiles demandent le numéro camerounais à débiter.
2. Le paiement carte demande prénom, nom, email, adresse et ville pour le formulaire fournisseur; la saisie des données de carte est laissée à la page sécurisée d'Iwomipay. Le numéro de téléphone reste demandé, conformément au tableau des paramètres du PDF.
3. Le backend authentifie le compte avec `POST /authenticate`, met en cache le token moins de cinq minutes, puis crée une collecte `POST /iwomipay`. Le paramètre `type` vaut `om`, `momo` ou `card`.
4. L'identifiant externe généré par ArtisanConnect respecte la limite documentée de 16 caractères; l'identifiant interne retourné par Iwomipay est stocké séparément.
5. Le retour du navigateur n'est pas considéré comme une preuve de paiement. Le callback public et l'endpoint authentifié `GET /payments/iwomipay/status/:orderId` consultent le statut réel auprès d'Iwomipay avant de confirmer le paiement et d'émettre la facture.
6. Les statuts `01`, `1000` et `100` sont interprétés comme réussi, en attente et échoué.

La collecte utilise `op_type=debit`, conformément au tableau de paramètres et à la description « payment = debit » du PDF. Une autre section du même document décrit `credit` comme une collecte : ce choix doit être confirmé par le prestataire lors de la recette. L'endpoint de statut utilise par défaut `iwomipayStatus/{internal_id}`, chemin décrit dans le document; l'exemple PHP donne un autre chemin. `IWOMIPAY_STATUS_PATH` permet de configurer le chemin confirmé par Iwomipay.

Le PDF ne documente pas de remboursement ou de reversement exploitable. Les étapes escrow actuelles de remboursement et de libération restent donc des mises à jour applicatives et ne déplacent pas d'argent. Ne pas activer une collecte avant validation écrite du protocole, des statuts, du chemin de vérification, des types activés sur le compte et des mécanismes de remboursement/reversement.
