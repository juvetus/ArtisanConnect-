# Documentation Technique & Métier : Module Livraison & Transporteurs (Gozem)

## 1. Vue d'ensemble du système de livraison

Le système de livraison d'ArtisanConnect gère trois modes d'acheminement des commandes (produits ou prestations sur mesure) :

| Mode | Identifiant | Description |
| :--- | :--- | :--- |
| **Retrait à l'atelier** | `workshop` | Le client vient récupérer sa commande directement chez l'artisan. |
| **Livraison à domicile** | `home` | L'artisan ou un coursier de quartier livre le client à l'adresse indiquée. |
| **Transporteur / Coursier API** | `carrier` | Intégration automatisée avec un service tiers (ex. Gozem, Yango Delivery). |

---

## 2. Données collectées pour la course

Pour chaque commande, la plateforme collecte les informations nécessaires au transporteur :

1. **Point de collecte (Pickup - Artisan)** :
   - Nom et prénom de l'artisan ;
   - Numéro de téléphone de contact ;
   - Nom de l'atelier / boutique, ville, quartier, repère ;
   - Coordonnées GPS précises (`latitude`, `longitude`).

2. **Point de livraison (Dropoff - Client)** :
   - Nom et prénom du destinataire ;
   - Numéro de téléphone ;
   - Ville, quartier, repère de livraison ;
   - Coordonnées GPS précises issues du sélecteur de carte Leaflet (`latitude`, `longitude`).

3. **Détails du colis** :
   - Référence de commande (`orderId`) ;
   - Type de commande (`product` ou `service`) ;
   - Instructions de livraison (accès, consignes particulières).

---

## 3. Architecture du Service Backend

Le service `DeliveryCarrierService` est situé dans :
- Service : `backend/src/modules/delivery/delivery-carrier.service.ts`
- Module : `backend/src/modules/delivery/delivery.module.ts`

### Variables d'environnement requises (`backend/.env`)

```env
# Configuration Transporteur (ex: Gozem)
CARRIER_PROVIDER=Gozem
CARRIER_API_URL=https://api.gozem.co/v1
CARRIER_API_KEY=votre_cle_api_partenaire
```

---

## 4. Méthodes & Cycle de vie

### A. Estimation de la course (`estimateDelivery`)
- **Objectif** : Fournir une estimation de coût et de délai au client avant validation de la commande.
- **Fonctionnement** :
  - Calcule la distance orthodromique (formule de Haversine) entre les coordonnées GPS de l'atelier et du client ;
  - Calcule le tarif estimé en Francs CFA (XAF) et le délai estimé en minutes ;
  - En mode simulation (sans clé API), génère une estimation dynamique fiable basée sur la distance.

### B. Création de la course (`createDeliveryRide`)
- **Objectif** : Déclencher la recherche et l'assignation d'un livreur lorsque la commande est prête à être expédiée.
- **Retourne** :
  - `trackingId` : Identifiant unique de suivi de la course ;
  - `status` : Statut (`pending`, `assigned`, `picking_up`, `in_transit`, `delivered`) ;
  - `driver` : Informations du chauffeur (nom, téléphone, plaque d'immatriculation, position GPS) ;
  - `trackingUrl` : Lien de suivi en direct pour le client.

### C. Suivi de livraison (`getDeliveryStatus`)
- **Objectif** : Interroger l'état d'avancement d'une course en cours à partir de son `trackingId`.

### D. Webhooks de notification (`handleWebhook`)
- **Objectif** : Endpoint de réception des mises à jour automatiques émises par le transporteur (ex. changement d'état vers *Livré*).

---

## 5. Procédure pour brancher l'API Gozem réelle

Dès réception des identifiants et de la documentation officielle Gozem :

1. **Renseigner les variables d'environnement** :
   - Ajouter `CARRIER_API_KEY=...` dans le fichier `.env` du backend.
2. **Décommenter les appels HTTP** :
   - Dans `backend/src/modules/delivery/delivery-carrier.service.ts`, activer les blocs `fetch(...)` pour les endpoints `/deliveries/estimate` et `/deliveries/create`.
3. **Brancher le Webhook partenaire** :
   - Déclarer la route POST `/delivery/webhook` auprès de la console partenaire Gozem pour écouter les statuts en temps réel.
