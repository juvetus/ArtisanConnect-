# 🚀 Plan MVP - ArtisanConnect
## Version Réduite & Réalisable (4-5 mois)

---

## 📌 Objectif MVP
Lancer une marketplace artisanale **minimale mais fonctionnelle** avec :
- ✅ Authentification simple (email/password)
- ✅ Listings produits/services de base
- ✅ Paiement (Stripe + Espèces)
- ✅ Commandes et suivi
- ✅ Avis simples
- ✅ Admin basique
- ✅ Espace institutionnel initial : statistiques, ressources, formalisation et programmes d’accompagnement

---

## 🧱 Architecture MVP (Simplifié)

### 1️⃣ Frontend Web
**Stack** : Next.js 14 + TypeScript
- Pages : Accueil, Recherche, Détail produit, Panier, Commande, Mon compte
- **Pas d'app mobile V1**
- Design simple + responsive (Tailwind CSS)

### 2️⃣ Backend API
**Stack** : NestJS + TypeScript (ou FastAPI)
- REST API uniquement (pas de GraphQL)
- Endpoints essentiels : auth, listings, commandes, paiements, avis
- **Pas de WebSockets** (messages async simples)

### 3️⃣ Base de données
**PostgreSQL** (avec PostGIS optionnel Phase 2)
- Tables simples : users, listings, orders, payments, reviews

### 4️⃣ Infrastructure
- Docker local + Docker Hub
- **Pas de Kubernetes** (overengineering pour MVP)
- AWS S3 pour les images
- Serveur simple (DigitalOcean, Hetzner, Linode)

### 5️⃣ Intégrations
- Espèces uniquement (confirmation manuelle)
- Email simple (SendGrid ou Brevo)
- Pas de Stripe V1 (Phase 2+)
- Pas de Twilio/SMS V1

---

## 📊 Modèle de données MVP

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  role ENUM('artisan', 'client') NOT NULL,
  name VARCHAR,
  bio TEXT,
  avatar_url VARCHAR,
  location VARCHAR,
  phone VARCHAR,
  verified_email BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Listings
CREATE TABLE listings (
  id UUID PRIMARY KEY,
  seller_id UUID REFERENCES users(id),
  title VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR,
  type ENUM('product', 'service'),
  price DECIMAL,
  image_url VARCHAR,
  status ENUM('active', 'inactive') DEFAULT 'active',
  stock INT (pour produits),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  buyer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  listing_id UUID REFERENCES listings(id),
  quantity INT,
  total_price DECIMAL,
  platform_fee DECIMAL (5-10%),
  status ENUM('pending', 'confirmed', 'completed', 'cancelled'),
  payment_method ENUM('card', 'cash'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  amount DECIMAL,
  method ENUM('stripe', 'cash'),
  status ENUM('pending', 'confirmed', 'captured', 'refunded'),
  stripe_payment_intent_id VARCHAR (optionnel),
  cash_confirmed_at TIMESTAMP (si cash),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  reviewer_id UUID REFERENCES users(id),
  rating INT (1-5),
  comment TEXT,
  created_at TIMESTAMP
);

-- Messages (simples, async)
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  sender_id UUID REFERENCES users(id),
  recipient_id UUID REFERENCES users(id),
  order_id UUID REFERENCES orders(id), -- contexte
  content TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP
);
```

---

## 🔐 Modules Fonctionnels MVP

### A. Pour les Artisans
1. **Inscription + Profil**
   - Email/mot de passe
   - Info de base (nom, bio, localisation)
   - Photo de profil

2. **Gestion des Listings**
   - Créer produit/service
   - Upload 1-5 images (S3)
   - Prix + Stock (produits) ou Disponibilité (services)
   - Éditer/Supprimer

3. **Tableau de Bord Simple**
   - Commandes en attente
   - Revenus totaux (lecture seule V1)
   - Avis reçus

4. **Messagerie Async**
   - Réception/envoi de messages par commande
   - Notification email nouvelle commande

### B. Pour les Clients
1. **Inscription + Profil**
   - Même login que artisans
   - Adresse de livraison

2. **Recherche & Filtres**
   - Recherche simple par titre (LIKE/ILIKE)
   - Filtres : catégorie, prix min/max, type (produit/service)
   - **Pas de recherche géo V1**

3. **Fiche Produit**
   - Images, description, prix
   - Avis + note moyenne
   - "Ajouter au panier" ou "Commander"

4. **Panier Léger**
   - Stockage localStorage (pas de DB)
   - Modification quantités
   - Checkout rapide

5. **Commande**
   - Choix paiement : Carte (Stripe) ou Espèces
   - Confirmation adresse
   - Validation

6. **Suivi Commande**
   - Statut en temps réel (pending → confirmed → completed)
   - Messagerie avec artisan
   - Avis après livraison

### C. Pour l'Admin
1. **Dashboard Minimal**
   - Stats : nb users, commandes, revenus
   - Listing des dernières commandes

2. **Modération**
   - Voir/bloquer listings suspects
   - Voir/bannir users

3. **Gestion des Paiements**
   - Voir paiements en attente
   - Marquer cash comme reçu

---

## 💳 Système de Paiement MVP

### Paiement en Espèces Uniquement (Phase 1)
```
Client choisit "Espèces" → Commande = "pending"
↓
Artisan confirme réception cash dans l'app
↓
Client peut confirmer aussi (optionnel)
↓
Quand 2/2 ou artisan seul confirme → "confirmed"
↓
Plateforme note : "cash collected" (règlement après)
```

**Modèle UI simple** :
- Choix à la commande : "Paiement en espèces"
- Popup : "Paiement en espèces - Confirmez avec l'artisan"
- Artisan reçoit notif : "Paiement espèces en attente - Confirmez"
- Admin peut voir liste des "cash pending" pour règlement

### 💳 Stripe + Cartes Bancaires (Phase 2 - Croissance)
Ajout dans la phase suivante :
```
Client → Paie Stripe → Argent en attente
↓
Livraison confirmée
↓
Paiement → 90% Artisan + 10% Plateforme
```

---

## 🎯 Features Optionnelles (Phase 2+)
- ❌ Paiement par carte (Stripe)
- ❌ Chat temps réel (WebSocket)
- ❌ Recherche géo avancée (Postgis)
- ❌ ElasticSearch / Meilisearch / OpenAI
- ❌ Modération IA
- ❌ App mobile native
- ❌ Devis / Négociation de prix
- ❌ Notations détaillées
- ❌ Système de portefeuille

---

## 📅 Timeline MVP (4-5 mois)

| Phase | Durée | Tâches |
|-------|-------|--------|
| **1. Setup** | 1 sem | Repo, DB setup, auth basique |
| **2. Core Artisan** | 2 sem | Listings, édition, dashboard |
| **3. Core Client** | 2 sem | Recherche, panier, checkout |
| **4. Paiement Espèces** | 1 sem | Confirmation cash, admin panel |
| **5. Admin** | 1 sem | Modération, dashboard |
| **6. Polish** | 1 sem | Avis, notifications, bug fixes |
| **7. Deploy** | 1 sem | Serveur, DNS, tests |
| **Buffer** | 1 sem | Imprévu |

**Total : 4-5 mois avec 2 devs full-time**

---

## 🚀 Commandes de Lancement

```bash
# Frontend
next new artisan-connect-web --typescript --tailwind
cd artisan-connect-web
npm install next-auth next-image-export-optimizer

# Backend
nest new artisan-connect-api --package-manager npm
cd artisan-connect-api
npm install @nestjs/typeorm typeorm pg @nestjs/jwt bcrypt

# DB
docker run -d -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:15

# S3 / Storage
# Créer bucket AWS S3 et générer keys
```

---

## ⚠️ Hypothèses & Risques MVP

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| Paiement cash non tracé | Comptabilité complexe | Audit logs + confirmation obligatoire |
| Fraude acheteur/vendeur | Litiges non gérés | Admin panel de modération |
| Images non optimisées | Lenteur | Compression + CDN Cloudinary (Phase 2) |
| Pas de recherche géo | UX pauvre | Filtrer par localisation (texte) V1 |
| Performance DB | Requêtes lentes | Index sur listings, orders |

---

## 💡 Conseil Clé
**Lancez avec le MVP, collectez des retours, puis itérez.**
Ne construisez PAS la "parfaite architecture" d'emblée.

Phase 1 (MVP) → Validez marché
Phase 2 (Croissance) → Optimisez recherche, chat, mobile
Phase 3 (Scale) → Kubernetes, Elasticsearch, notifications avancées
