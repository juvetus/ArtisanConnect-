# 🚀 ArtisanConnect - Phase 1 MVP Setup

Bienvenue ! Ce document vous guide pour démarrer l'application ArtisanConnect - Marketplace Artisanale.

## 📋 Prérequis

- Node.js 18+ 
- PostgreSQL 15+ OU Docker & Docker Compose
- npm ou yarn

## 🐳 Setup avec Docker (Recommandé)

### 1. Démarrer la base de données PostgreSQL

```bash
cd c:\POC\ArtisanConnect
docker-compose up -d
```

Cela démarre :
- **PostgreSQL** sur le port 5432
- **Adminer** (interface web DB) sur http://localhost:8080

### 2. Configurer le backend

```bash
cd backend
# Créer le fichier .env (il existe déjà)
# Vérifiez que DB_HOST=localhost et les autres paramètres

# Installer les dépendances (déjà faites)
npm install

# Démarrer le serveur en développement
npm run start:dev
```

L'API sera disponible sur `http://localhost:3001`

### 3. Configurer le frontend

```bash
cd ../frontend
npm run dev
```

Le frontend sera disponible sur `http://localhost:3000`

---

## 📚 Architecture du Projet

```
ArtisanConnect/
├── backend/              # API NestJS
│   ├── src/
│   │   ├── entities/     # Modèles de données (User, Listing, Order, etc.)
│   │   ├── modules/      # Modules métier
│   │   │   ├── auth/     # Authentification & Inscription
│   │   │   ├── users/    # Gestion des utilisateurs
│   │   │   ├── listings/ # Gestion des produits/services
│   │   │   ├── orders/   # Gestion des commandes
│   │   │   ├── payments/ # Gestion des paiements en espèces
│   │   │   ├── reviews/  # Système d'avis
│   │   │   └── messages/ # Messagerie simple
│   │   ├── database/     # Configuration TypeORM
│   │   └── app.module.ts # Racine de l'application
│   ├── .env              # Variables d'environnement
│   └── package.json
│
├── frontend/             # App Next.js
│   ├── src/
│   │   ├── app/          # Pages et routes
│   │   ├── components/   # Composants React
│   │   └── lib/          # Utilitaires
│   └── package.json
│
├── docker-compose.yml    # Configuration Docker
└── plan-mvp.md          # Plan détaillé
```

---

## 🔌 Endpoints API - Phase 1

### Authentification
```
POST   /auth/register     - Créer un compte
POST   /auth/login        - Se connecter
```

### Utilisateurs
```
GET    /users/:id         - Récupérer un profil
PATCH  /users/:id         - Mettre à jour le profil
```

### Listings (Produits/Services)
```
POST   /listings          - Créer une annonce
GET    /listings/:id      - Détails d'une annonce
GET    /listings?q=...    - Rechercher
GET    /listings?category=... - Par catégorie
GET    /listings/seller/:sellerId - Annonces d'un artisan
PATCH  /listings/:id      - Modifier
DELETE /listings/:id      - Supprimer
```

### Commandes
```
POST   /orders            - Créer une commande
GET    /orders/:id        - Détails d'une commande
GET    /orders/buyer/:buyerId - Mes achats
GET    /orders/seller/:sellerId - Mes ventes
PATCH  /orders/:id/status - Changer le statut
```

### Paiements (Espèces uniquement)
```
POST   /payments          - Créer un paiement
GET    /payments/:id      - Détails du paiement
POST   /payments/:id/confirm-cash - Confirmer le paiement espèces
```

### Avis
```
POST   /reviews           - Laisser un avis
GET    /reviews/recipient/:userId - Avis reçus
GET    /reviews/rating/:userId - Note moyenne
```

### Messages
```
POST   /messages          - Envoyer un message
GET    /messages/conversation/:user1/:user2 - Conversation
GET    /messages/order/:orderId - Messages d'une commande
GET    /messages/unread/:userId - Nombre non lus
```

---

## 🛠️ Workflows Principaux

### Workflow Acheteur
1. **S'inscrire** : POST `/auth/register` avec `role: "client"`
2. **Chercher** : GET `/listings?q=...` ou `/listings?category=...`
3. **Commander** : POST `/orders` avec `listing_id`, `quantity`, `payment_method: "cash"`
4. **Payer en espèces** : Artisan confirme via POST `/payments/:id/confirm-cash`
5. **Avis** : POST `/reviews` après réception

### Workflow Artisan
1. **S'inscrire** : POST `/auth/register` avec `role: "artisan"`
2. **Créer une annonce** : POST `/listings` avec titre, description, prix
3. **Voir les commandes** : GET `/orders/seller/:sellerId`
4. **Confirmer paiement** : POST `/payments/:id/confirm-cash`
5. **Répondre aux messages** : POST `/messages`

---

## 📞 Breve Guide des Commandes Utiles

### Backend
```bash
cd backend

# Développement
npm run start:dev

# Production
npm run build
npm run start

# Tests
npm run test
npm run test:e2e
```

### Frontend
```bash
cd frontend

# Développement
npm run dev

# Build
npm run build

# Production
npm run start
```

### Docker
```bash
# Démarrer les services
docker-compose up -d

# Arrêter
docker-compose down

# Logs
docker-compose logs postgres

# Accéder à la DB
docker-compose exec postgres psql -U artisan -d artisan_connect
```

---

## 🔐 Variables d'Environnement Backend (.env)

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=artisan
DB_PASSWORD=artisan_password_dev
DB_DATABASE=artisan_connect

# Server
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001

# JWT
JWT_SECRET=dev_secret_key
JWT_EXPIRATION=7d

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

## 🐛 Dépannage

### PostgreSQL ne démarre pas
```bash
docker-compose down -v  # Supprimer les volumes
docker-compose up -d     # Recommencer
```

### Port déjà en use
```bash
# Changez dans .env ou docker-compose.yml
# Backend: PORT=3002
# Frontend: utilise port 3000 par défaut
```

### Erreur de connexion DB
```bash
# Vérifiez que PostgreSQL fonctionne
docker ps

# Vérifiez le .env
cat backend/.env

# Testez la connexion avec Adminer
# http://localhost:8080
```

---

## 📝 Prochaines Étapes (Phase 2)

- ✅ Ajout de Stripe pour cartes bancaires
- ✅ Chat temps réel (WebSocket)
- ✅ Optimisation de la recherche (Meilisearch)
- ✅ App mobile (React Native/Flutter)
- ✅ Système de notifications avancées
- ✅ Dashboard admin complet

---

## 👥 Support

Pour des questions sur la Phase 1, consultez :
- [plan-mvp.md](./plan-mvp.md) - Spécifications complètes
- [plan.md](./plan.md) - Plan détaillé global

Bon développement ! 🚀

