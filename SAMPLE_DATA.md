# 📝 Sample Data & Test Scripts - Phase 1

Quick reference for testing the API with sample data.

## Sample Users

### Artisan (Menuisier)
```json
{
  "email": "jean.dupont@menuiserie.fr",
  "password": "MdpSecure123!",
  "name": "Jean Dupont",
  "role": "artisan"
}
```

### Client (Acheteur)
```json
{
  "email": "marie.martin@example.com",
  "password": "MdpSecure123!",
  "name": "Marie Martin",
  "role": "client"
}
```

---

## Sample Listings (Products)

### Etagere en chene
```json
{
  "title": "Étagère murale en chêne massif - 120x80cm",
  "description": "Étagère sur mesure, confectionnée en chêne massif de qualité. Finition naturelle brillante. Support en métal noir. Peut supporter jusqu'à 30kg.",
  "category": "Menuiserie",
  "type": "product",
  "price": 250.00,
  "stock": 3,
  "sellerId": "[ARTISAN_ID]"
}
```

### Table basse
```json
{
  "title": "Table basse en bois massif - Style scandinave",
  "description": "Table basse design scandinave. Dimensions 100x50x40cm. Plateau en chêne, pieds en hêtre. Très stable et durable.",
  "category": "Menuiserie",
  "type": "product",
  "price": 350.00,
  "stock": 2,
  "sellerId": "[ARTISAN_ID]"
}
```

---

## Sample Listings (Services)

### Custom furniture design
```json
{
  "title": "Création de meubles sur mesure",
  "description": "Service de conception et fabrication de meubles personnalisés. Consultez-moi pour un devis. Délai: 2-4 semaines selon la complexité.",
  "category": "Menuiserie",
  "type": "service",
  "price": 75.00,
  "availability": "Lundi-Vendredi 9h-18h",
  "sellerId": "[ARTISAN_ID]"
}
```

### Furniture repair
```json
{
  "title": "Réparation et restauration de meubles",
  "description": "Spécialiste en restauration de meubles anciens. Bois, vernis, joints. Disponible pour devis sur site.",
  "category": "Menuiserie",
  "type": "service",
  "price": 50.00,
  "availability": "Sur rendez-vous",
  "sellerId": "[ARTISAN_ID]"
}
```

---

## Sample Orders

### Order with cash payment
```json
{
  "buyerId": "[CLIENT_ID]",
  "sellerId": "[ARTISAN_ID]",
  "listingId": "[LISTING_ID]",
  "quantity": 1,
  "totalPrice": 250.00,
  "platformFee": 25.00,
  "paymentMethod": "cash"
}
```

---

## Sample Reviews

### Positive review
```json
{
  "orderId": "[ORDER_ID]",
  "reviewerId": "[CLIENT_ID]",
  "recipientId": "[ARTISAN_ID]",
  "rating": 5,
  "comment": "Excellent travail! Menuisier très professionnel. L'étagère est superbe et bien ancrée. À recommander!"
}
```

### Average review
```json
{
  "orderId": "[ORDER_ID]",
  "reviewerId": "[CLIENT_ID]",
  "recipientId": "[ARTISAN_ID]",
  "rating": 3,
  "comment": "Bon travail mais un peu en retard sur la livraison. Qualité correcte."
}
```

---

## Quick Test Flow

### 1. Register Users
```bash
# Register artisan
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"jean.dupont@menuiserie.fr",
    "password":"MdpSecure123!",
    "name":"Jean Dupont",
    "role":"artisan"
  }'

# Copy artisan ID from response

# Register client
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"marie.martin@example.com",
    "password":"MdpSecure123!",
    "name":"Marie Martin",
    "role":"client"
  }'

# Copy client ID from response
```

### 2. Login Both Users
```bash
# Login artisan
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"jean.dupont@menuiserie.fr",
    "password":"MdpSecure123!"
  }'

# Save ARTISAN_TOKEN

# Login client
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"marie.martin@example.com",
    "password":"MdpSecure123!"
  }'

# Save CLIENT_TOKEN
```

### 3. Create Listings (As Artisan)
```bash
curl -X POST http://localhost:3001/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ARTISAN_TOKEN}" \
  -d '{
    "title":"Étagère murale en chêne massif",
    "description":"Étagère sur mesure de qualité",
    "category":"Menuiserie",
    "type":"product",
    "price":250.00,
    "stock":3,
    "sellerId":"[ARTISAN_ID]"
  }'

# Save LISTING_ID from response
```

### 4. Search Listings (As Client)
```bash
curl http://localhost:3001/listings?q=étagère \
  -H "Authorization: Bearer ${CLIENT_TOKEN}"
```

### 5. Create Order (As Client)
```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CLIENT_TOKEN}" \
  -d '{
    "buyerId":"[CLIENT_ID]",
    "sellerId":"[ARTISAN_ID]",
    "listingId":"[LISTING_ID]",
    "quantity":1,
    "totalPrice":250.00,
    "platformFee":25.00,
    "paymentMethod":"cash"
  }'

# Save ORDER_ID from response
```

### 6. Get Order Payment
```bash
curl http://localhost:3001/payments/order/[ORDER_ID] \
  -H "Authorization: Bearer ${ARTISAN_TOKEN}"

# Save PAYMENT_ID from response
```

### 7. Confirm Cash Payment (As Artisan)
```bash
curl -X POST http://localhost:3001/payments/[PAYMENT_ID]/confirm-cash \
  -H "Authorization: Bearer ${ARTISAN_TOKEN}"
```

### 8. Update Order Status (As Artisan)
```bash
curl -X PATCH http://localhost:3001/orders/[ORDER_ID]/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ARTISAN_TOKEN}" \
  -d '{"status":"completed"}'
```

### 9. Leave Review (As Client)
```bash
curl -X POST http://localhost:3001/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CLIENT_TOKEN}" \
  -d '{
    "orderId":"[ORDER_ID]",
    "reviewerId":"[CLIENT_ID]",
    "recipientId":"[ARTISAN_ID]",
    "rating":5,
    "comment":"Excellent travail!"
  }'
```

### 10. Get Artisan Rating
```bash
curl http://localhost:3001/reviews/rating/[ARTISAN_ID]
```

---

## Message Flow Example

### Client messages artisan
```bash
curl -X POST http://localhost:3001/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CLIENT_TOKEN}" \
  -d '{
    "senderId":"[CLIENT_ID]",
    "recipientId":"[ARTISAN_ID]",
    "orderId":"[ORDER_ID]",
    "content":"Quand pouvez-vous livrer?"
  }'
```

### Get conversation
```bash
curl http://localhost:3001/messages/conversation/[CLIENT_ID]/[ARTISAN_ID] \
  -H "Authorization: Bearer ${CLIENT_TOKEN}"
```

### Get unread count
```bash
curl http://localhost:3001/messages/unread/[ARTISAN_ID] \
  -H "Authorization: Bearer ${ARTISAN_TOKEN}"
```

---

## Database Verification

### Check all users
```bash
docker-compose exec postgres psql -U artisan -d artisan_connect -c "SELECT id, email, role, name FROM users;"
```

### Check all listings
```bash
docker-compose exec postgres psql -U artisan -d artisan_connect -c "SELECT id, title, type, price, status FROM listings;"
```

### Check all orders
```bash
docker-compose exec postgres psql -U artisan -d artisan_connect -c "SELECT id, status, \"paymentMethod\", \"totalPrice\" FROM orders;"
```

### Check payments
```bash
docker-compose exec postgres psql -U artisan -d artisan_connect -c "SELECT id, \"orderId\", method, status FROM payments;"
```

### Check reviews
```bash
docker-compose exec postgres psql -U artisan -d artisan_connect -c "SELECT id, rating, comment FROM reviews;"
```

---

## Useful Queries for Testing

### Get artisan's listings count
```sql
SELECT COUNT(*) FROM listings WHERE seller_id = '[ARTISAN_ID]';
```

### Get all orders for a seller
```sql
SELECT id, buyer_id, status, total_price FROM orders WHERE seller_id = '[ARTISAN_ID]';
```

### Get average rating for user
```sql
SELECT AVG(rating) FROM reviews WHERE recipient_id = '[ARTISAN_ID]';
```

### Get unread messages count
```sql
SELECT COUNT(*) FROM messages WHERE recipient_id = '[USER_ID]' AND read = false;
```

---

## Performance Testing

### Create 100 listings
```bash
for i in {1..100}; do
  curl -X POST http://localhost:3001/listings \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ARTISAN_TOKEN}" \
    -d "{
      \"title\":\"Listing $i\",
      \"description\":\"Test listing $i\",
      \"category\":\"Category $((i % 5))\",
      \"type\":\"product\",
      \"price\":$((100 + i)),
      \"stock\":$((1 + i % 10)),
      \"sellerId\":\"[ARTISAN_ID]\"
    }"
  sleep 0.1
done
```

### Search performance
```bash
time curl "http://localhost:3001/listings?q=listing&skip=0&take=50"
```

---

## Troubleshooting Tips

- Always save IDs from responses to use in subsequent requests
- Use `Authorization: Bearer {TOKEN}` for protected endpoints
- For POST/PATCH requests, always set `Content-Type: application/json`
- Check JWT token expiration (7 days in dev)
- If token expires, re-login to get a new one

---

Last updated: 2026-09-05
