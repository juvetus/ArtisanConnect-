# 🔌 ArtisanConnect API - Phase 1 Endpoints

Base URL: `http://localhost:3001`

## Authentication

### Register (Créer un compte)
```
POST /auth/register
Content-Type: application/json

{
  "email": "artisan@example.com",
  "password": "SecurePass123",
  "name": "Jean Dupont",
  "role": "artisan"  // or "client"
}

Response 201:
{
  "id": "uuid...",
  "email": "artisan@example.com",
  "name": "Jean Dupont",
  "role": "artisan"
}
```

### Login (Se connecter)
```
POST /auth/login
Content-Type: application/json

{
  "email": "artisan@example.com",
  "password": "SecurePass123"
}

Response 200:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid...",
    "email": "artisan@example.com",
    "name": "Jean Dupont",
    "role": "artisan"
  }
}
```

---

## Users (Utilisateurs)

### Get User Profile
```
GET /users/:userId
Authorization: Bearer {accessToken}

Response 200:
{
  "id": "uuid...",
  "email": "artisan@example.com",
  "name": "Jean Dupont",
  "role": "artisan",
  "bio": "Menuisier depuis 15 ans",
  "avatarUrl": null,
  "location": "Paris, France",
  "phone": "+33612345678",
  "verifiedEmail": true,
  "createdAt": "2026-09-05T..."
}
```

### Update User Profile
```
PATCH /users/:userId
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Jean Dupont",
  "bio": "Menuisier depuis 15 ans - Spécialiste en restauration",
  "location": "Paris 75001",
  "phone": "+33612345678"
}

Response 200: (updated user object)
```

---

## Listings (Annonces)

### Create Listing
```
POST /listings
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Étagère murale en chêne massif",
  "description": "Étagère sur mesure, dimensions 120x80cm",
  "category": "Menuiserie",
  "type": "product",          // or "service"
  "price": 250.00,
  "imageUrl": "https://...",  // Phase 2: will support upload
  "stock": 5,                  // For products
  "sellerId": "uuid..."       // From JWT token
}

Response 201: (listing object with id)
```

### Get Listing Details
```
GET /listings/:listingId

Response 200:
{
  "id": "uuid...",
  "title": "Étagère murale en chêne massif",
  "description": "...",
  "category": "Menuiserie",
  "type": "product",
  "price": 250.00,
  "imageUrl": "...",
  "status": "active",
  "stock": 5,
  "seller": {
    "id": "uuid...",
    "name": "Jean Dupont",
    "avatarUrl": null
  },
  "createdAt": "2026-09-05T..."
}
```

### Search Listings
```
GET /listings?q=étagère&skip=0&take=20

Response 200:
[
  { listing object },
  ...
]
```

### Filter by Category
```
GET /listings?category=Menuiserie&skip=0&take=20

Response 200: [listing objects]
```

### Filter by Type
```
GET /listings?type=product&skip=0&take=20
GET /listings?type=service&skip=0&take=20

Response 200: [listing objects]
```

### Get Seller's Listings
```
GET /listings/seller/:sellerId

Response 200: [listing objects]
```

### Update Listing
```
PATCH /listings/:listingId
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "New title",
  "price": 300.00,
  "status": "inactive"
}

Response 200: (updated listing)
```

### Delete Listing
```
DELETE /listings/:listingId
Authorization: Bearer {accessToken}

Response 200:
{
  "success": true
}
```

---

## Orders (Commandes)

### Create Order
```
POST /orders
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "buyerId": "uuid...",
  "sellerId": "uuid...",
  "listingId": "uuid...",
  "quantity": 1,
  "totalPrice": 250.00,
  "platformFee": 25.00,
  "paymentMethod": "cash"    // or "card" (Phase 2)
}

Response 201:
{
  "id": "uuid...",
  "status": "pending",
  "paymentMethod": "cash",
  "totalPrice": 250.00,
  "platformFee": 25.00,
  "createdAt": "2026-09-05T..."
}
```

### Get Order Details
```
GET /orders/:orderId
Authorization: Bearer {accessToken}

Response 200:
{
  "id": "uuid...",
  "buyer": { user object },
  "seller": { user object },
  "listing": { listing object },
  "status": "pending",
  "paymentMethod": "cash",
  "quantity": 1,
  "totalPrice": 250.00,
  "payment": { payment object },
  "createdAt": "2026-09-05T..."
}
```

### Get My Purchases (Buyer)
```
GET /orders/buyer/:buyerId?skip=0&take=20
Authorization: Bearer {accessToken}

Response 200:
[
  { order objects },
  ...
]
```

### Get My Sales (Seller)
```
GET /orders/seller/:sellerId?skip=0&take=20
Authorization: Bearer {accessToken}

Response 200:
[
  { order objects },
  ...
]
```

### Update Order Status
```
PATCH /orders/:orderId/status
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "confirmed"  // pending → confirmed → completed → cancelled
}

Response 200: (updated order)
```

---

## Payments (Paiements Espèces)

### Create Payment
```
POST /payments
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "orderId": "uuid...",
  "amount": 250.00,
  "method": "cash",
  "status": "pending"
}

Response 201:
{
  "id": "uuid...",
  "orderId": "uuid...",
  "amount": 250.00,
  "method": "cash",
  "status": "pending",
  "createdAt": "2026-09-05T..."
}
```

### Get Payment
```
GET /payments/:paymentId
Authorization: Bearer {accessToken}

Response 200: (payment object)
```

### Get Payment by Order
```
GET /payments/order/:orderId
Authorization: Bearer {accessToken}

Response 200: (payment object)
```

### Confirm Cash Payment
```
POST /payments/:paymentId/confirm-cash
Authorization: Bearer {accessToken}

Response 200:
{
  "id": "uuid...",
  "status": "confirmed",
  "cashConfirmedAt": "2026-09-05T...",
  ...
}
```

### Update Payment Status
```
PATCH /payments/:paymentId/status
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "captured"  // pending → confirmed → captured → refunded
}

Response 200: (updated payment)
```

---

## Reviews (Avis)

### Create Review
```
POST /reviews
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "orderId": "uuid...",
  "reviewerId": "uuid...",
  "recipientId": "uuid...",
  "rating": 5,
  "comment": "Excellent travail, très professionnel!"
}

Response 201:
{
  "id": "uuid...",
  "rating": 5,
  "comment": "Excellent travail...",
  "verified": true,
  "createdAt": "2026-09-05T..."
}
```

### Get Reviews for User
```
GET /reviews/recipient/:userId?skip=0&take=20

Response 200:
{
  "reviews": [
    {
      "id": "uuid...",
      "rating": 5,
      "comment": "...",
      "reviewer": { user object },
      "createdAt": "2026-09-05T..."
    },
    ...
  ]
}
```

### Get Average Rating
```
GET /reviews/rating/:userId

Response 200:
{
  "userId": "uuid...",
  "averageRating": 4.8
}
```

---

## Messages (Messages)

### Send Message
```
POST /messages
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "senderId": "uuid...",
  "recipientId": "uuid...",
  "orderId": "uuid...",  // Optional, context of the message
  "content": "Quand pouvez-vous livrer?"
}

Response 201:
{
  "id": "uuid...",
  "senderId": "uuid...",
  "recipientId": "uuid...",
  "content": "Quand pouvez-vous livrer?",
  "read": false,
  "createdAt": "2026-09-05T..."
}
```

### Get Conversation
```
GET /messages/conversation/:user1Id/:user2Id?skip=0&take=50
Authorization: Bearer {accessToken}

Response 200:
[
  {
    "id": "uuid...",
    "sender": { user object },
    "recipient": { user object },
    "content": "...",
    "read": false,
    "createdAt": "2026-09-05T..."
  },
  ...
]
```

### Get Messages for Order
```
GET /messages/order/:orderId
Authorization: Bearer {accessToken}

Response 200:
[
  { message objects },
  ...
]
```

### Get Unread Count
```
GET /messages/unread/:userId
Authorization: Bearer {accessToken}

Response 200:
{
  "userId": "uuid...",
  "unreadCount": 3
}
```

### Mark Message as Read
```
PATCH /messages/:messageId/read
Authorization: Bearer {accessToken}

Response 200: (updated message)
```

---

## Error Responses

All endpoints return standardized error responses:

```
400 Bad Request:
{
  "statusCode": 400,
  "message": "Invalid input",
  "error": "Bad Request"
}

401 Unauthorized:
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}

404 Not Found:
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}

500 Internal Server Error:
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Authentication Header

All protected endpoints (marked with `Authorization: Bearer {accessToken}`) require the JWT token from login:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Rate Limiting (Phase 2)

Currently no rate limiting implemented. Will be added in Phase 2.

---

## Pagination

Endpoints that return lists support pagination:

```
GET /listings?skip=0&take=20
- skip: Number of items to skip (default: 0)
- take: Number of items to return (default: 20)

Response 200:
[
  [...items...],
  totalCount: 150  // Total items available
]
```

---

## Testing with cURL

```bash
# Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"test123",
    "name":"Test User",
    "role":"client"
  }'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"test123"
  }'

# Get user (replace TOKEN with actual token)
curl http://localhost:3001/users/{userId} \
  -H "Authorization: Bearer {TOKEN}"

# Create listing
curl -X POST http://localhost:3001/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "title":"Test Listing",
    "description":"Test description",
    "category":"Test",
    "type":"product",
    "price":100,
    "stock":5,
    "sellerId":"{SELLER_ID}"
  }'
```

---

## Institutions et accompagnement

Le rôle `institution` peut publier des ressources et des programmes, suivre les artisans et examiner leurs dossiers de formalisation.

```
GET  /institutions/resources                  Ressources publiées
GET  /institutions/programs                   Programmes actifs
POST /institutions/resources                  Institution : publier formation/guide/modèle
POST /institutions/programs                   Institution : publier accompagnement/financement/subvention
GET  /institutions/dashboard                  Institution : indicateurs sectoriels
GET  /institutions/formalizations             Institution : dossiers à examiner
PATCH /institutions/formalizations/:id/status Institution : approuver ou demander correction
GET  /institutions/report.csv                 Institution : exporter le rapport
GET  /institutions/formalizations/me          Artisan : consulter sa progression
POST /institutions/formalizations              Artisan : soumettre son dossier
```

Les endpoints de pilotage et de revue sont réservés aux institutions authentifiées. Les ressources et programmes publiés sont consultables par les utilisateurs connectés.

---

## Next Phases

**Phase 2 Additions:**
- Stripe payment integration
- Real-time WebSocket chat
- Image upload to S3
- Advanced search with Meilisearch
- Email notifications
- SMS notifications
- Admin dashboard
- Analytics

---

Last updated: 2026-09-06
API Version: 1.1.0 (MVP + institutions)
