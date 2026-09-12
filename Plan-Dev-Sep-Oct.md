PLAN DE DÉVELOPPEMENT — SEPTEMBRE → OCTOBRE
(Version prête à exécuter)

🟧 SEPTEMBRE — Finalisation Phase 1 + Préparation Phase 2
Semaine 1 — Stabilisation du MVP
🎯 Objectif : rendre la plateforme stable, testable, et prête pour les partenaires.

À faire :

Finaliser les modules :

Authentification

Artisans

Clients

Produits

Commandes

Finaliser le module Livraison (artisan / tiers local)

Finaliser le module Litiges (version simple)

Finaliser le module Notifications email

Finaliser le Dashboard admin (v1)

Livrables :

MVP fonctionnel

Tests internes OK

Déploiement DigitalOcean stable

Semaine 2 — Paiement (Mock Orange Money)
🎯 Objectif : préparer l’intégration Orange Money sans l’API réelle.

À faire :

Créer les endpoints internes :

/payments/init

/payments/callback

/payments/status

/payments/refund

/payments/payout

Créer un simulateur de paiement (mock)

Créer la table orange_money_transactions

Intégrer le simulateur dans le flux de commande

Ajouter les statuts : pending, success, failed

Livrables :

Paiement simulé fonctionnel

Flux complet commande → paiement → confirmation

Semaine 3 — Livraison (Mock Gozem)
🎯 Objectif : préparer l’intégration Gozem sans API réelle.

À faire :

Créer les endpoints internes :

/delivery/init

/delivery/update-status

/delivery/assign-driver

/delivery/track

Créer un simulateur de livraison :

preparing → out_for_delivery → delivered

Ajouter les champs :

provider = gozem

provider_driver_name

provider_driver_phone

Livrables :

Livraison simulée fonctionnelle

Timeline livraison côté client

Semaine 4 — Commission + Reversement (Mock)
🎯 Objectif : préparer la logique financière interne.

À faire :

Ajouter la commission plateforme (ex : 10%)

Calcul automatique dans les commandes

Module reversement manuel (mock)

Dashboard admin :

revenus

commissions

reversements

Livrables :

Commission opérationnelle

Reversement manuel simulé

Dashboard admin complet

🟦 OCTOBRE — Activation Phase 2 sur le terrain
Semaine 1 — Orange Money Cameroun (réel)
🎯 Objectif : activer le paiement réel.

À faire sur place :

Ouvrir ton compte marchand Orange Money

Signer le contrat API

Obtenir les identifiants API

Brancher l’API réelle dans ton module paiement

Tester :

Web Payment réel

Callback réel

Reversement manuel réel

Refund réel

Livrables :

Paiement Orange Money opérationnel

Argent dans ton compte marchand

Commandes réelles payées

Semaine 2 — Gozem Business (réel)
🎯 Objectif : activer la livraison réelle.

À faire :

Rencontre Gozem Business

Tester livraison réelle (coursier)

Brancher l’API si disponible

Ajouter tracking réel

Ajouter estimation prix (si API)

Livrables :

Livraison Gozem opérationnelle

Tracking réel

Artisan → Gozem → Client

Semaine 3 — Onboarding artisans
🎯 Objectif : lancer la marketplace sur le terrain.

À faire :

Onboarder 10 artisans

Créer leurs boutiques

Ajouter leurs produits

Tester commandes réelles

Tester livraisons réelles

Tester reversements réels

Livrables :

Premiers artisans actifs

Premières commandes réelles

Premières livraisons réelles

Semaine 4 — Lancement officiel Cameroun
🎯 Objectif : ouverture publique.

À faire :

Communication locale

Partenariats artisans

Partenariats livreurs

Partenariats boutiques physiques

Tests intensifs

Optimisation UX

Livrables :

ArtisanConnect Cameroun lancé

Premiers clients

Premières ventes

Premiers revenus

🎯 Résumé ultra clair
Mois	Objectif	Résultat
Septembre	Finaliser MVP + préparer API	Plateforme prête
Octobre	Activer API partenaires + lancer	ArtisanConnect Cameroun lancé