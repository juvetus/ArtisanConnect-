1. Présentation produit
Commande	Fonction
/showcase	Image studio, fond neutre, lumière douce
/lifestyle	Mise en scène dans une maison ou atelier
/detail	Zoom sur les finitions, textures, matériaux
/concept	Design moderne ou traditionnel, inspiration
/marketing	Visuel pour réseaux sociaux ou affiches
/catalogue	Image format e‑commerce, fond blanc
/artisan	Portrait professionnel de l’artisan au travail


🧠 2. Création de contenu IA (texte)
Commande	Fonction
/description	Génère une description professionnelle du produit
/fiche	Crée une fiche produit complète (titre, dimensions, matériaux, prix)
/devis	Rédige un devis simple et clair
/reponse	Génère une réponse client polie et professionnelle
/bio	Rédige une courte biographie artisan
/traduire	Traduit le texte FR ↔ EN
/corriger	Corrige les fautes et reformule proprement


🎨 3. Inspiration et design
Commande	Fonction
/inspire	Génère des idées de design ou de style
/modern	Style contemporain, minimaliste
/classic	Style traditionnel, bois massif
/african	Style artisanal africain, motifs culturels
/rustic	Style rustique, naturel
/luxury	Style haut de gamme, finitions premium


📸 4. Mise en valeur visuelle
Commande	Fonction
/beforeafter	Crée une comparaison avant/après
/ambient	Image avec lumière naturelle, ambiance douce
/studio	Image nette, fond neutre, éclairage pro
/texture	Zoom sur le grain du bois ou la matière
/color	Variation de couleurs ou finitions


💬 5. Communication client
Commande	Fonction
/message	Message WhatsApp professionnel
/followup	Relance client polie
/thankyou	Message de remerciement après commande
/promo	Message promotionnel ou annonce spéciale
/faq	Réponses automatiques aux questions fréquentes


⚙️ 6. Gestion artisan
Commande	Fonction
/profil	Génère ou améliore le profil artisan
/portfolio	Crée une présentation de ses travaux
/avis	Rédige une réponse à un avis client
/update	Met à jour une fiche produit existante
/export	Prépare le contenu pour publication externe


🧩 7. Création avancée (optionnelle)
Commande	Fonction
/aiimage	Génère une image IA à partir d’un texte
/combine	Fusionne texte + image pour une fiche complète
/suggest	Propose des idées de produits à créer
/trend	Montre les tendances du moment
/optimize	Optimise le texte pour le SEO interne


💡 Astuce UX
Tu peux afficher ces commandes dans ton interface sous forme de boutons rapides ou suggestions contextuelles :

“Essayez /showcase pour une image studio”
“Tapez /description pour générer un texte professionnel”

1. Interdiction de générer des “fausses réalisations”
Règle :

L’image IA ne doit jamais être présentée comme un travail réellement réalisé par l’artisan.

Pourquoi :

Risque de tromperie

Perte de confiance client

Problème légal si un client se sent trompé

Solution :  
Tu affiches automatiquement un label :

Image IA — mise en scène / inspiration  
et tu demandes obligatoirement une photo réelle juste après.

🛑 2. Obligation d’ajouter une image réelle
Règle :

Toute image IA doit être accompagnée d’une photo originale du produit ou du travail réel.

Pourquoi :

Transparence

Preuve du travail

Confiance client

Évite les dérives marketing

Solution :  
Tu bloques la publication si l’image réelle n’est pas ajoutée.

🛑 3. Interdiction de générer des personnes réelles
Règle :

Pas de génération IA de l’artisan lui-même ou d’une personne identifiable.

Pourquoi :

Risque de deepfake

Problème d’identité

Risque légal

Solution :  
Tu limites les prompts à des objets, meubles, scènes, ambiances.

🛑 4. Interdiction de simuler un atelier réel
Règle :

Pas d’images IA qui prétendent représenter l’atelier réel de l’artisan.

Pourquoi :

Risque de tromperie

Incohérence avec la réalité

Problème de confiance

Solution :  
Tu labels automatiquement :

Image IA — mise en scène fictive

🛑 5. Interdiction de générer des logos ou marques
Règle :

Pas de logos, marques, ou éléments protégés.

Pourquoi :

Risque légal

Propriété intellectuelle

Solution :  
Tu filtres les prompts contenant :
“logo”, “marque”, “brand”, “Nike”, “Gucci”, etc.

🛑 6. Interdiction de générer des objets dangereux
Règle :

Pas d’armes, objets dangereux, ou contenus sensibles.

Pourquoi :

Risque légal

Politique de sécurité

Image de la plateforme

🛑 7. Interdiction de générer des images trop réalistes pour tromper
Règle :

Les images IA doivent rester dans un style “mise en scène”, pas photoréaliste au point de tromper.

Pourquoi :

Éthique

Transparence

Confiance client

Solution :  
Tu limites les styles à :

studio

lifestyle

concept

marketing

détail
Pas de “hyper-realistic artisan work”.

🛑 8. Interdiction de générer des images pour remplacer les photos de portfolio
Règle :

Le portfolio doit contenir uniquement des photos réelles.

Pourquoi :

Preuve du travail

Confiance

Authenticité

Solution :  
Tu autorises les images IA uniquement dans :

fiches produits

inspiration

marketing

mise en scène

🛑 9. Interdiction de générer des images IA pour des produits inexistants
Règle :

L’image IA doit correspondre à un produit que l’artisan peut réellement fabriquer.

Pourquoi :

Éviter les promesses impossibles

Éviter les litiges

Solution :  
Tu ajoutes un message :

“Assurez-vous que ce design correspond à un produit que vous pouvez fabriquer.”

🛑 10. Interdiction de générer des images IA sans texte descriptif
Règle :

L’artisan doit décrire ce qu’il veut générer.

Pourquoi :

Éviter les images hors sujet

Éviter les dérives

Améliorer la qualité

✅ Synthèse : les contraintes essentielles
Voici les contraintes obligatoires que tu dois intégrer :

✔ Image IA = inspiration / mise en scène

✔ Image réelle obligatoire juste après

## Implémentation pilote

Les images générées depuis le formulaire de création d’annonce sont stockées séparément des photos réelles dans `aiImageUrls`.

- Chaque image est automatiquement affichée comme : `Image IA — mise en scène / inspiration`.
- Une annonce contenant une image IA doit aussi contenir au moins une photo réelle avant publication.
- Les images IA sont limitées à trois par annonce.
- Les prompts refusent les logos, marques, personnes identifiables et objets dangereux.
- Le modèle d’image se configure avec `AI_IMAGE_MODEL` et utilise `AI_API_KEY` / `AI_BASE_URL`.
- Le portfolio et les photos de réalisations restent réservés aux images réelles.

✔ Pas de fausses réalisations

✔ Pas de personnes réelles

✔ Pas d’atelier réel simulé

✔ Pas de logos / marques

✔ Pas d’armes / contenus sensibles

✔ Pas d’hyper-réalisme trompeur

✔ Portfolio = photos réelles uniquement

✔ Image IA = produit que l’artisan peut fabriquer

✔ Prompt descriptif obligatoire

👉 Avec ces règles, tu crées un outil puissant, éthique, sécurisé, qui améliore la qualité visuelle sans jamais tromper le client.