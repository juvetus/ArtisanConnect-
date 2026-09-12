Comment le client passe commande ? → Via un formulaire de demande de service
🟦 1) Le client clique sur “Commander ce service”
Sur la page du service validé par l’admin, le client voit un bouton :

👉 Commander / Demander un devis

Cela ouvre le formulaire de commande.

🟦 2) Le formulaire de commande (côté client)
🔹 Informations de base
Nom complet

Email

Téléphone

Ville / Quartier (optionnel)

🔹 Besoin détaillé
Objectif du projet (ex : “Créer un site vitrine pour mon entreprise”)

Fonctionnalités souhaitées

Exemples de sites / inspirations

Budget estimé

Délai souhaité

Upload de fichiers (maquette, cahier des charges, logo…)

🔹 Options spécifiques au service
Pour un service “Création site Web”, tu peux ajouter :

Type de site : vitrine / e‑commerce / blog

Nombre de pages

Besoin de design ? Oui / Non

Besoin de maintenance ? Oui / Non

Pour un service “Application mobile” :

Plateforme : Android / iOS / les deux

Fonctionnalités clés

Besoin d’API ? Oui / Non

🔹 Confirmation
Case à cocher : “Je confirme ma demande”

Bouton : Envoyer la demande

🎯 Objectif : transformer le besoin du client en une commande exploitable

🟦 3) Après envoi → Statut “En attente de validation admin”
La commande arrive dans le back‑office :

Client → Formulaire → Admin → Artisan

Statut initial :
👉 En attente de validation

L’admin peut :

Valider

Refuser

Demander des précisions au client

Modifier la demande avant envoi à l’artisan

🎯 Objectif : éviter les demandes floues ou impossibles

🟦 4) Une fois validée → Envoi à l’artisan
Statut :
👉 Transmise à l’artisan

L’artisan reçoit :

Le détail complet de la demande

Les fichiers

Le budget estimé

Le délai souhaité

Il peut :

Accepter

Refuser

Proposer un devis ajusté

🟦 5) Le client reçoit la réponse de l’artisan
Si l’artisan accepte :

Le client reçoit une notification

La commande passe en En cours

Si l’artisan propose un devis :

Le client peut accepter ou refuser

🟦 6) Résumé du workflow complet
Client → Formulaire → Admin → Artisan → Client

Le client remplit un formulaire détaillé

L’admin valide la demande

L’artisan reçoit la demande

L’artisan accepte ou propose un devis

Le client confirme

La commande démarre

🟦 7) Pourquoi ce système est parfait pour ArtisanConnect ?
Tu contrôles la qualité des demandes

Tu évites les clients qui demandent n’importe quoi

Tu protèges les artisans

Tu centralises les projets complexes

Tu peux filtrer les demandes sérieuses

Tu peux ajuster les prix avant transmission

🟦 8) Si tu veux, je peux te créer :
🔥 Le formulaire complet (tous les champs + logique)
🔥 Le workflow en diagramme  
🔥 Le modèle de données SQL (tables : services, demandes, validations, devis)
🔥 Les écrans UI (client, admin, artisan)

---

## 🟦 9) Documentation technique d'intégration & état d'avancement

- **Documentation complète du module de livraison** : Voir le fichier [DOC_LIVRAISON_CARRIER.md](DOC_LIVRAISON_CARRIER.md).
- **Service Backend prêt** : [delivery-carrier.service.ts](backend/src/modules/delivery/delivery-carrier.service.ts)
- **Module Backend injecté** : [delivery.module.ts](backend/src/modules/delivery/delivery.module.ts)
- **Mode simulation / Fallback** : Activé par défaut jusqu'à configuration des clés d'accès réelles `CARRIER_API_KEY`.