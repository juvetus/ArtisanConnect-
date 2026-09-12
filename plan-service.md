# Plan des 12 fonctionnalités pour la création d'une commande de service avec validation admin

## 🎯 Vue d'ensemble du workflow
```
Client → Formulaire → Admin → Validation → Artisan → Devis/Acceptation → Client → Paiement → Exécution
```

---

## 1️⃣ Formulaire de création de service (côté artisan)
**Qui** : Artisan
**Données requises** :
- Titre du service (ex : Création site Web)
- Description détaillée
- Délai estimé (en jours)
- Prix ou fourchette de prix
- Options / modules (ex : site vitrine, e‑commerce, application mobile…)
- Upload de fichiers (maquettes, cahier des charges)
- Catégorie du service
- Tags (technologies, spécialités)

**Sortie** : Statut = "Brouillon"
**🎯 Objectif** : permettre à l'artisan de proposer un service complet et structuré

---

## 2️⃣ Statuts de service (workflow complet)
**Cycles** :
```
Artisan :
  Brouillon → En attente de validation

Admin :
  En attente de validation → Validé / Refusé / Modification demandée

Commande :
  Créée par client → En attente validation admin → Transmise à artisan 
  → Devis en attente → Acceptée par artisan → En cours → Livrée → Complétée
  → Disputée / Annulée
```

**Détail des statuts** :
| Statut | Qui voit | Action possible |
|--------|----------|-----------------|
| **Brouillon** | Artisan | Modifier / Publier |
| **En attente validation** | Admin | Valider / Refuser / Demander modification |
| **Modification demandée** | Artisan | Répondre dans 48h ou statut → Refusé |
| **Validé/Publié** | Client | Voir dans recherche / Commander |
| **Refusé** | Artisan | Voir raison / Corriger / Revalider |
| **Commande créée** | Client, Admin | Suivi en temps réel |
| **Devis en attente** | Client, Artisan | Client : accepter/refuser. Artisan : en attente réponse |
| **En cours** | Client, Artisan | Messagerie + suivi |
| **Livrée** | Client | Accepter / Demander correction |
| **Complétée** | Client, Artisan | Laisser avis |
| **Disputée** | Admin | Arbitrage |
| **Annulée** | Système | Remboursement (si paiement effectué) |

**🎯 Objectif** : contrôle qualité + éviter les services incomplets + clarté du processus

---

## 3️⃣ Interface admin de validation des services
**Qui** : Admin
**Fonctionnalités** :
- Liste des services en attente (avec filtres : date, artisan, catégorie)
- Aperçu complet du service (détails + fichiers)
- Boutons d'action : **Valider** / **Refuser** / **Demander modification**
- Champs de feedback : "Raison du refus" ou "Modifications à apporter"
- Historique des validations (qui, quand, pourquoi)
- Durée moyenne de validation (dashboard)

**Feedback types** :
```
"La description est trop courte (minimum 200 caractères)"
"Ajoute les technologies utilisées"
"Le prix manque"
"Ajoute un exemple de projet antérieur"
```

**🎯 Objectif** : workflow clair + amélioration continue des services

---

## 4️⃣ Système de révision itérative
**Workflow** :
```
Admin → Demande modification (email + notification)
Artisan → Voir les modifications dans son dashboard
Artisan → Avoir 48h pour répondre
Artisan → Envoyer service modifié
Admin → Revoir et valider ou redemander modification
Si dépassement 48h → Statut "Refusé" automatique
```

**Notification à l'artisan** :
- Email avec détails des modifications demandées
- Lien direct pour modifier le service
- Délai clairement indiqué (48h)

**🎯 Objectif** : améliorer la qualité sans frustration

---

## 5️⃣ Formulaire de demande de service (côté client)
**Qui** : Client
**Le client clique sur** : "Commander ce service"

**Section 1 - Informations client** :
- Nom complet (requis)
- Email (requis)
- Téléphone (requis)
- Ville / Quartier (optionnel)

**Section 2 - Besoin détaillé** :
- Objectif du projet (champ libre 500 char min)
- Fonctionnalités souhaitées (checkboxes ou textarea)
- Exemples / inspirations (upload ou liens)
- Budget estimé (slider : min/max du service)
- Délai souhaité (datepicker)
- Upload de fichiers (cahier des charges, logo, maquette…)

**Section 3 - Options dynamiques** (selon type de service) :

*Exemple : Création site Web*
- Type de site : [ ] Vitrine [ ] E‑commerce [ ] Blog [ ] Application web
- Nombre de pages : 1-5 / 5-10 / 10+
- [ ] Besoin de design graphique
- [ ] Besoin de maintenance/support après

*Exemple : Application mobile*
- Plateforme : [ ] Android [ ] iOS [ ] Les deux
- Fonctionnalités clés (checkboxes)
- [ ] Besoin d'API / Backend

*Exemple : Design UI/UX*
- Nombre d'écrans : ___
- [ ] Wireframes fournis
- [ ] Besoin de prototype interactif

**Section 4 - Confirmation** :
- [ ] Je confirme ma demande
- [ ] J'ai lu les conditions d'exécution
- Bouton : **Envoyer la demande**

**Sortie** : Statut commande = "En attente de validation admin"

**🎯 Objectif** : transformer le besoin en commande exploitable

---

## 6️⃣ Validation admin des commandes
**Qui** : Admin
**Étapes** :
1. **Réception** : Commande client arrive dans le back-office
2. **Vérification** : Admin vérifie la pertinence (client sérieux, demande claire)
3. **Actions possibles** :
   - ✅ **Valider** → Statut "Transmise à l'artisan"
   - ❌ **Refuser** (client demande impossible, budget 0, etc.)
   - 💬 **Demander précisions** (client → 48h pour répondre)
   - ✏️ **Modifier la demande** avant envoi (corriger budget, délai)

**Dashboard admin** :
- Commandes en attente de validation
- Nombre de jours depuis création
- Rapport client/service/artisan

**Notifications** :
- ✉️ Email au client si besoin de précisions
- ✉️ Email à l'artisan si validée et transmise

**🎯 Objectif** : éviter les demandes floues ou impossibles + protection artisan

---

## 7️⃣ Transmission à l'artisan & système de devis
**Qui** : Artisan
**L'artisan reçoit** :
- Notification (email + dashboard)
- Détail complet de la demande
- Fichiers uploadés par client
- Budget estimé client
- Délai souhaité

**Actions de l'artisan** :
```
[ ] Accepter la commande → Statut "Acceptée"
[ ] Proposer un devis ajusté → Statut "Devis en attente"
[ ] Refuser → Statut "Refusée par artisan"
```

**Si devis proposé** :
- Artisan indique : prix final, délai révisé, détail des phases
- Notification au client : "Devis reçu, consultez-le"
- Client a **5 jours** pour accepter/refuser
- Si refus → Retour à artisan ou fin de commande

**Délai d'action artisan** : **48h** pour répondre (sinon rappel auto)

**🎯 Objectif** : négociation transparente + clarté budgétaire

---

## 8️⃣ Communication centralisée (Messagerie)
**Qui** : Client & Artisan
**Fonctionnalités** :
- Chat intégré par commande
- Historique messages (consultable à tout moment)
- Notifications en temps réel (notification système + email)
- Parties prenantes : Client, Artisan, Admin (peut intervenir si litige)
- Partage de fichiers via messagerie

**Exemples de messages** :
- Client : "J'ai besoin d'une colonne de plus"
- Artisan : "Ok, délai +2 jours, prix +500 CFA"
- Client : "D'accord"
- Système : "Commande mise à jour"

**Admin peut** :
- Voir tous les messages (transparence)
- Intervenir si litige
- Envoyer alertes de deadline

**🎯 Objectif** : réduire les malentendus + traceback complet

### Infrastructure notifications e-mail
Cette infrastructure est un prérequis pour les notifications de validation, les demandes de
révision et les alertes de délai. Les notifications internes restent la source de vérité dans
l'application ; l'e-mail sert de relais et ne doit pas bloquer une transition métier.

**Tâches** :
- Choisir un fournisseur SMTP ou transactionnel (par exemple Brevo, Mailgun, Resend ou Amazon SES)
- Créer un module d'envoi d'e-mails côté backend avec une interface indépendante du fournisseur
- Ajouter les variables d'environnement : `MAIL_PROVIDER`, `MAIL_FROM`, `MAIL_HOST`, `MAIL_PORT`,
  `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_API_KEY`
- Ne jamais stocker les identifiants dans le dépôt ; documenter les valeurs attendues dans `.env.example`
- Créer les templates e-mail : service approuvé, service refusé, modification demandée, échéance dépassée,
  nouvelle commande, devis reçu et livraison disponible
- Ajouter un lien d'action vers la page concernée et une version texte de secours
- Enregistrer les erreurs d'envoi et prévoir une nouvelle tentative sans faire échouer la requête principale
- Tester en développement avec une boîte de test ou un serveur SMTP local
- Vérifier en production : domaine d'envoi, SPF, DKIM, DMARC, limites et suivi des erreurs

**Sortie** : un service d'e-mail configurable par environnement, testé et prêt à être utilisé
par les notifications de la Phase 2.

---

## 9️⃣ Système de paiement
**Modèles possibles** :

### Option A : Acompte + Solde
```
Client paye acompte (30% ou montant fixe) → Artisan démarre
Reste à payer (70%) → À la livraison
```

### Option B : Paiement complet avant démarrage
```
Client paye 100% → Commande démarre
À utiliser si commande < 100 000 CFA
```

### Option C : Paiement après livraison
```
Artisan livre → Client paye → Travail clôturé
Risque : artisan attend le paiement
```

**Recommandation** : Option A (30% acompte)

**Intégration** :
- Lien de paiement sécurisé (Stripe / Orange Money / MTN Money)
- Reçu automatique par email
- Statut commande : "Paiement en attente" → "Paiement reçu"
- Remboursement auto si commande annulée avant démarrage

**🎯 Objectif** : sécuriser les transactions + réduire les fraudes

---

## 🔟 Statuts de livraison & acceptation finale
**Workflow final** :
```
Artisan → "Livrer le travail" (upload fichiers)
Client → Reçoit notification
Client → [ ] Accepter / [ ] Demander correction
Si correction → Messagerie pour ajustements
Si acceptation → Paiement solde (si acompte) + Statut "Complétée"
```

**Délais** :
- Client a **5 jours** pour accepter/rejeter
- Après 5 jours sans action → Considéré comme accepté
- Si rejet → Artisan a **3 jours** pour corriger

**🎯 Objectif** : clôture claire + éviter les litiges

---

## 1️⃣1️⃣ Système de notation & avis
**Après complétude de la commande** :

**Client note l'artisan** :

**Artisan note le client** :

**Visibilité** :

 ✅ Système de notation et avis vérifiés pour les commandes de service
 ✅ Note client/artisan de 1 à 5, commentaire conditionnel et avis unique par commande
 ✅ Moyenne et nombre d'avis affichés sur les services et le profil public artisan
 ✅ Choix de livraison : domicile, retrait à l'atelier ou transporteur

---

## 1️⃣2️⃣ Dashboard admin & Reporting
**Métriques principales** :
- Nombre de services en attente de validation
- Nombre de commandes en cours
- Temps moyen de validation admin
- Services refusés (raisons)
- Commandes complétées / disputées
- Revenue total (si paiement intégré)
- Top artisans par nombre de commandes

**Exports** :
- [ ] CSV : Liste commandes avec statuts
- [ ] PDF : Rapport mensuel
- [ ] Graphiques : Tendances (services populaires, délais moyens)

**Filtres** :
- Par date, catégorie, statut, artisan, client
- Recherche full-text

**Alertes automatiques** :
- ⚠️ Commande non traitée depuis 48h
- ⚠️ Artisan ne répond pas
- ⚠️ Litige détecté

**🎯 Objectif** : gestion proactive + data-driven decisions

---

## 📊 Résumé par rôle

| Rôle | Actions clés | Responsabilités |
|------|-------------|-----------------|
| **Artisan** | Créer service, répondre demandes, livrer travail | Qualité, délais |
| **Client** | Chercher service, passer commande, valider livraison | Paiement, feedback |
| **Admin** | Valider services, valider commandes, arbitrer litiges | Qualité globale, SLA |

---

## 🚀 Phases de développement

### **Phase 1 (MVP - 2 semaines)**
- ✅ Formulaire client pour commander un service
- ✅ Admin valide la commande (oui/non)
- ✅ Notification artisan
- ✅ Artisan accepte/refuse
- ✅ Statuts basiques (En attente → Acceptée → En cours → Livrée)
- ✅ Messagerie simple

### **Phase 2 (3 semaines)**
- ✅ Validation admin des **services** (avant publication)
- ✅ Système de révision (admin demande modification)
- ✅ Dashboard admin de validation
- ✅ Gestion catégories & tags
- ✅ Choix de Brevo comme fournisseur SMTP transactionnel
- ✅ Module d'e-mails SMTP Brevo configurable, avec mode désactivé par défaut
- ✅ Notification e-mail lors d'une demande de révision, d'un refus ou d'une approbation
- ✅ Auto-refus après 48h avec notification interne et e-mail
- ✅ Gestion des erreurs et documentation `.env.example`
- ✅ Test réel d'envoi SMTP Brevo réussi (`MessageId` reçu)

### **Phase 3 (2 semaines)**
- ✅ Workflow paiement des commandes de service : acompte 30 % et solde 70 %
- ⏸️ **Reporté** : branchement d'un opérateur réel (Orange Money Web Payment ou Stripe)
- ⏸️ **Reporté** : webhooks, confirmation automatique et remboursements réels
- ✅ Messagerie liée aux commandes de service et historique client/artisan
- ✅ Partage sécurisé de fichiers dans la messagerie : cahier des charges, maquettes et livrables
- ✅ Système de notation et avis pour les commandes de service
- ✅ Export PDF des commandes, devis, reçus de paiement et rapports admin
- ✅ Export CSV des services de validation
- ✅ Relances automatiques : validation admin, réponse artisan, expiration devis et livraison à valider
- ✅ Devis avec négociation : prix final, délai, phases, acceptation ou refus client
- ✅ Notification interne et e-mail aux admins lors d'une nouvelle demande de service
- ✅ Modération admin : désactivation/réactivation des boutiques, utilisateurs et annonces
- ✅ Suppression admin protégée des boutiques, utilisateurs et annonces

### **Phase 4 (En continu)**
- ✅ Gestion des litiges
- ✅ Analytics avancée
- ✅ Automatisations (relances SMS, webhooks)

---

## ❓ Questions avant de coder

1. **Paiement** : Acompte 30% ou 100% avant démarrage ?
2. **Remboursement** : Politique complète en cas d'annulation par client/artisan ?
3. **SLA** : Délai max entre chaque étape ? (ex : Admin valide en 24h ? Artisan répond en 48h ?)
4. **Support** : Équipe pour arbitrer les litiges ? Escalade nécessaire ?
5. **Frais** : Commission sur chaque commande ? Comment ?
6. **Taxes** : TVA / impôts à intégrer au calcul prix final ?
7. **Multidevise** : Supporter plusieurs devises ou juste XOF ?
8. **Contrat** : Générer automatiquement un contrat PDF artisan ↔ client ?

---

## 📝 Modèles de données (simplifié)

```typescript
// Service (artisan crée)
Service {
  id, artisanId, title, description, price, estimatedDays,
  category, tags, files, status, createdAt, validatedBy?, validatedAt?
}

// Commande (client crée)
Commande {
  id, clientId, serviceId, artisanId,
  details, budget, requestedDate, files,
  status, messages[], payment, createdAt, updatedAt
}

// Devis (artisan propose)
Devis {
  id, commandeId, artisanId,
  proposedPrice, proposedDays, details,
  status, clientResponse, createdAt, respondedAt?
}

// Paiement
Paiement {
  id, commandeId, amount, type (acompte|solde),
  status, provider, transactionId, createdAt, paidAt?
}

// Message
Message {
  id, commandeId, fromId, toId, content, files[],
  createdAt, readAt?
}
```

---

## 🎯 Verdict final
✅ Plan complet et prêt à développer
✅ Toutes les étapes couvertes (service → commande → livraison)
✅ Sécurité, qualité et transparence maximisées

**État actuel** : le workflow service, les notifications, la messagerie, les avis, les catégories, la modération et les exports sont implémentés.

Le paiement réel Orange Money ou Stripe reste reporté. Les secrets SMTP restent uniquement
dans `.env` et ne doivent jamais être ajoutés à ce document.



