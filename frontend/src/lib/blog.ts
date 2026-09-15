export type BlogLanguage = 'fr' | 'en';

export type BlogSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BlogSource = {
  label: string;
  url: string;
};

export type BlogFeaturedLink = {
  label: { fr: string; en: string };
  url: string;
};

export type BlogArticle = {
  slug: string;
  category: { fr: string; en: string };
  title: { fr: string; en: string };
  excerpt: { fr: string; en: string };
  coverImage: string;
  coverAlt: { fr: string; en: string };
  sources: BlogSource[];
  featuredLink?: BlogFeaturedLink;
  author: string;
  publishedAt: string;
  readingTime: number;
  keywords: string[];
  sections: { fr: BlogSection[]; en: BlogSection[] };
};

export const blogArticles: BlogArticle[] = [
  {
    slug: 'acheter-artisanat-local-cameroun-guide',
    category: { fr: 'Consommer local', en: 'Local shopping' },
    title: {
      fr: "Acheter de l'artisanat local au Cameroun : le guide pratique",
      en: 'Buying local crafts in Cameroon: a practical guide',
    },
    excerpt: {
      fr: 'Comment trouver une création fiable, comparer les offres et commander sereinement auprès d’un artisan camerounais.',
      en: 'How to find a trustworthy creation, compare offers and order confidently from a Cameroonian artisan.',
    },
    coverImage: '/images/ChatGPT Image 15 sept. 2026, 15_48_43.png',
    coverAlt: { fr: 'Guide pour acheter de l’artisanat local au Cameroun', en: 'Guide to buying local crafts in Cameroon' },
    sources: [{ label: 'MINPMEESA - Ministère des PME, de l’Économie sociale et de l’Artisanat', url: 'https://www.minpmeesa.cm/' }],
    author: 'L’équipe ArtisanConnect',
    publishedAt: '2026-09-12',
    readingTime: 5,
    keywords: ['artisanat camerounais', 'acheter local Cameroun', 'créateurs camerounais'],
    sections: {
      fr: [
        {
          heading: 'Pourquoi acheter local ?',
          paragraphs: [
            'Acheter une création locale permet de soutenir directement un savoir-faire, un atelier et une économie de proximité. Au Cameroun, chaque région apporte ses matières, ses gestes et ses histoires : textile, vannerie, bois, bijoux, décoration ou alimentation transformée.',
            'Le bon achat ne se résume donc pas au prix. Il tient compte de la qualité, du délai, de l’origine des matières et des conditions de remise.',
          ],
        },
        {
          heading: 'Les cinq vérifications avant de commander',
          paragraphs: ['Prenez quelques minutes pour vérifier les éléments qui évitent les mauvaises surprises :'],
          bullets: [
            'la description et les dimensions exactes du produit ;',
            'les photos réelles de l’article ou de l’atelier ;',
            'le délai de préparation et le mode de livraison ;',
            'le profil de la boutique et les avis disponibles ;',
            'le montant total, y compris la livraison, avant confirmation.',
          ],
        },
        {
          heading: 'Commander avec ArtisanConnect',
          paragraphs: [
            'Utilisez les filtres par catégorie et par ville, puis échangez avec l’artisan si une mesure ou une finition doit être précisée. La commande est confirmée avec un mode de paiement et de remise clairs. Pour une pièce personnalisée, validez toujours le modèle et le délai dans la conversation.',
          ],
        },
      ],
      en: [
        {
          heading: 'Why shop locally?',
          paragraphs: [
            'Buying a local creation directly supports a craft, a workshop and the nearby economy. In Cameroon, each region brings its own materials, techniques and stories: textiles, basketry, wood, jewellery, home decor and processed food.',
            'The right purchase is not only about price. Quality, timing, materials and handover conditions matter too.',
          ],
        },
        {
          heading: 'Five checks before ordering',
          paragraphs: ['Take a few minutes to check the details that prevent surprises:'],
          bullets: ['the exact description and dimensions', 'real photos of the product or workshop', 'preparation time and delivery method', 'the shop profile and available reviews', 'the total price, including delivery, before confirming.'],
        },
        {
          heading: 'Ordering with ArtisanConnect',
          paragraphs: ['Use category and city filters, then message the artisan when a size or finish needs clarification. Confirm the order with a clear payment and handover method. For a custom piece, always approve the design and timeline in the conversation.'],
        },
      ],
    },
  },
  {
    slug: 'vendre-artisanat-en-ligne-cameroun',
    category: { fr: 'Conseils artisans', en: 'Craft business tips' },
    title: {
      fr: 'Vendre son artisanat en ligne au Cameroun : 7 étapes pour démarrer',
      en: 'Selling crafts online in Cameroon: 7 steps to get started',
    },
    excerpt: {
      fr: 'Une méthode simple pour présenter son atelier, publier ses premières annonces et gagner la confiance des clients.',
      en: 'A simple method to present your workshop, publish your first listings and earn customer trust.',
    },
    coverImage: '/images/Copilot_20260915_151619.png',
    coverAlt: { fr: 'Artisans camerounais présentant leurs créations et leur activité en ligne', en: 'Cameroonian artisans presenting their creations and online business' },
    sources: [{ label: 'MINPMEESA - site officiel', url: 'https://www.minpmeesa.cm/site/' }],
    author: 'L’équipe ArtisanConnect',
    publishedAt: '2026-09-12',
    readingTime: 6,
    keywords: ['vendre en ligne Cameroun', 'marketing artisan', 'boutique artisanale'],
    sections: {
      fr: [
        {
          heading: 'Commencer avec une offre lisible',
          paragraphs: ['Une boutique efficace ne montre pas tout à la fois. Commencez par cinq à dix produits représentatifs, avec un nom précis, une photo nette, un prix en FCFA et un délai réaliste.'],
          bullets: ['Choisissez une spécialité reconnaissable.', 'Expliquez l’usage et les dimensions.', 'Indiquez ce qui est personnalisable.', 'Répondez rapidement aux questions.'],
        },
        {
          heading: 'Les photos vendent votre savoir-faire',
          paragraphs: ['Photographiez près d’une fenêtre, sur un fond simple, puis ajoutez un détail de texture et une photo en situation. Une image de l’atelier ou du geste de fabrication donne aussi un visage à la marque.'],
        },
        {
          heading: 'Créer une relation durable',
          paragraphs: ['Annoncez clairement les délais et les options de remise à Douala, Yaoundé ou dans votre ville. Après la livraison, invitez le client à laisser un avis et utilisez ses questions pour améliorer vos prochaines fiches.'],
        },
      ],
      en: [
        {
          heading: 'Start with a clear offer',
          paragraphs: ['An effective shop does not show everything at once. Start with five to ten representative products, each with a precise name, a clear photo, a price in XAF and a realistic lead time.'],
          bullets: ['Choose a recognisable specialty.', 'Explain use and dimensions.', 'State what can be customised.', 'Reply quickly to questions.'],
        },
        {
          heading: 'Photos sell your craft',
          paragraphs: ['Shoot near a window on a simple background, then add a texture detail and an in-use photo. A workshop or making-process image also gives your brand a human face.'],
        },
        {
          heading: 'Build a lasting relationship',
          paragraphs: ['State delivery and handover options clearly in Douala, Yaoundé or your city. After delivery, invite the customer to leave a review and use their questions to improve future listings.'],
        },
      ],
    },
  },
  {
    slug: 'orange-money-commande-artisan-cameroun',
    category: { fr: 'Paiement & livraison', en: 'Payments & delivery' },
    title: {
      fr: 'Orange Money au Cameroun : payer une commande artisanale en toute confiance',
      en: 'Orange Money in Cameroon: paying for a craft order with confidence',
    },
    excerpt: {
      fr: 'Ce qu’il faut vérifier avant un paiement mobile et comment garder une trace claire de sa commande.',
      en: 'What to check before a mobile payment and how to keep a clear record of your order.',
    },
    coverImage: '/images/ChatGPT Image 15 sept. 2026, 15_28_19.png',
    coverAlt: { fr: 'Paiement Orange Money d’une commande artisanale au Cameroun', en: 'Orange Money payment for a handmade order in Cameroon' },
    sources: [{ label: 'Orange Cameroun', url: 'https://www.orange.cm/' }],
    author: 'L’équipe ArtisanConnect',
    publishedAt: '2026-09-12',
    readingTime: 4,
    keywords: ['Orange Money Cameroun', 'paiement mobile', 'commande artisanale'],
    sections: {
      fr: [
        { heading: 'Avant de payer', paragraphs: ['Vérifiez le nom de l’article, la quantité, le prix en FCFA, les frais de livraison et l’identité de la boutique. Ne validez jamais une demande dont le montant ne correspond pas au récapitulatif de la commande.'] },
        { heading: 'Gardez vos preuves', paragraphs: ['Conservez la référence de transaction, le récapitulatif et les échanges liés à la commande. Ces éléments facilitent le suivi lorsqu’un paiement est en cours de confirmation ou lorsqu’une livraison doit être reprogrammée.'] },
        { heading: 'Une règle simple de sécurité', paragraphs: ['ArtisanConnect ne vous demandera jamais votre code secret Orange Money. En cas de doute, arrêtez la transaction et contactez le support depuis la plateforme.'] },
      ],
      en: [
        { heading: 'Before paying', paragraphs: ['Check the item name, quantity, XAF price, delivery fee and shop identity. Never approve a request whose amount does not match the order summary.'] },
        { heading: 'Keep your records', paragraphs: ['Keep the transaction reference, order summary and related messages. They make it easier to track a pending payment or reschedule a delivery.'] },
        { heading: 'One simple safety rule', paragraphs: ['ArtisanConnect will never ask for your Orange Money secret code. When in doubt, stop the transaction and contact support from the platform.'] },
      ],
    },
  },
  {
    slug: 'formaliser-atelier-artisan-cameroun',
    category: { fr: 'Développement d’activité', en: 'Business development' },
    title: {
      fr: 'Comment formaliser son atelier artisanal au Cameroun : les premiers repères',
      en: 'How to formalise a craft workshop in Cameroon: first steps',
    },
    excerpt: {
      fr: 'Pourquoi la formalisation peut aider un artisan à accéder à des marchés, des programmes et de meilleurs outils de gestion.',
      en: 'Why formalisation can help artisans access markets, programmes and better business tools.',
    },
    coverImage: '/images/ChatGPT Image 15 sept. 2026, 15_30_10.png',
    coverAlt: { fr: 'Artisan camerounais préparant la formalisation de son atelier', en: 'Cameroonian artisan preparing to formalise a workshop' },
    sources: [{ label: 'OHADA - Organisation pour l’harmonisation en Afrique du droit des affaires', url: 'https://www.ohada.org/' }],
    author: 'L’équipe ArtisanConnect',
    publishedAt: '2026-09-12',
    readingTime: 6,
    keywords: ['formalisation artisan Cameroun', 'entreprise artisanale', 'appui artisans'],
    sections: {
      fr: [
        { heading: 'Formaliser, cela veut dire quoi ?', paragraphs: ['La formalisation consiste à donner un cadre reconnu à son activité et à mieux séparer les finances personnelles de celles de l’atelier. Le parcours dépend de la forme choisie et de la situation de l’entrepreneur.'] },
        { heading: 'Préparer son dossier', paragraphs: ['Commencez par rassembler vos informations d’identité, l’adresse de l’activité, une description de vos produits, vos contacts et les justificatifs demandés par l’organisme compétent. Gardez des copies à jour et demandez conseil avant de déposer un document incomplet.'] },
        { heading: 'Les bénéfices pour l’atelier', paragraphs: ['Une activité mieux structurée facilite le suivi des ventes, la réponse aux appels à projets et les échanges avec des partenaires. ArtisanConnect peut servir de vitrine commerciale pendant que vous consolidez votre organisation.'] },
      ],
      en: [
        { heading: 'What does formalisation mean?', paragraphs: ['Formalisation gives your activity a recognised framework and helps separate personal finances from workshop finances. The process depends on the chosen structure and the entrepreneur’s situation.'] },
        { heading: 'Prepare your file', paragraphs: ['Start by gathering identity details, business address, product description, contacts and the documents requested by the relevant organisation. Keep current copies and ask for guidance before submitting an incomplete file.'] },
        { heading: 'Benefits for the workshop', paragraphs: ['A more structured activity makes it easier to track sales, answer calls for projects and work with partners. ArtisanConnect can be your commercial showcase while you strengthen your organisation.'] },
      ],
    },
  },
  {
    slug: 'femmes-artisanes-cooperatives-cameroun',
    category: { fr: 'Impact & communautés', en: 'Impact & communities' },
    title: {
      fr: 'Femmes artisanes et coopératives au Cameroun : acheter pour soutenir un impact local',
      en: 'Women artisans and cooperatives in Cameroon: shopping for local impact',
    },
    excerpt: {
      fr: 'Comprendre la différence entre une créatrice individuelle et une coopérative, et choisir un achat qui correspond à son impact.',
      en: 'Understand the difference between an individual woman artisan and a cooperative, and choose an impact that fits your purchase.',
    },
    coverImage: '/images/ChatGPT Image 15 sept. 2026, 15_30_45.png',
    coverAlt: { fr: 'Femmes artisanes et coopératives au Cameroun', en: 'Women artisans and cooperatives in Cameroon' },
    sources: [{ label: 'ONU Femmes - Cameroun', url: 'https://africa.unwomen.org/fr/where-we-are/west-and-central-africa/cameroon' }],
    author: 'L’équipe ArtisanConnect',
    publishedAt: '2026-09-12',
    readingTime: 5,
    keywords: ['femmes artisanes Cameroun', 'coopérative artisanale', 'BuyFromWomen Cameroun'],
    sections: {
      fr: [
        { heading: 'Deux réalités complémentaires', paragraphs: ['Une créatrice individuelle porte directement son atelier et sa production. Une coopérative ou un GIC rassemble plusieurs personnes autour d’une organisation commune. Les deux modèles méritent d’être visibles, mais ils ne racontent pas le même impact.'] },
        { heading: 'Bien lire les badges', paragraphs: ['Sur ArtisanConnect, les informations de boutique aident à distinguer les ateliers dirigés par des femmes des structures coopératives. Cette transparence permet aux clients, institutions et partenaires de soutenir le bon type d’initiative.'] },
        { heading: 'Un achat qui va plus loin', paragraphs: ['Demandez d’où viennent les matières, qui participe à la production et comment la commande contribue à l’activité. Un avis honnête et une recommandation locale peuvent également aider une petite structure à se faire connaître.'] },
      ],
      en: [
        { heading: 'Two complementary realities', paragraphs: ['An individual woman artisan directly leads her workshop and production. A cooperative or GIC brings several people together around a shared organisation. Both deserve visibility, but they represent different kinds of impact.'] },
        { heading: 'Read the badges carefully', paragraphs: ['On ArtisanConnect, shop information helps distinguish women-led workshops from cooperative organisations. This transparency lets customers, institutions and partners support the right kind of initiative.'] },
        { heading: 'A purchase that goes further', paragraphs: ['Ask where materials come from, who takes part in production and how the order supports the activity. An honest review and a local recommendation can also help a small organisation be discovered.'] },
      ],
    },
  },
  {
    slug: 'fixer-prix-produit-artisanal-cameroun',
    category: { fr: 'Conseils artisans', en: 'Craft business tips' },
    title: {
      fr: 'Comment fixer le prix d’un produit artisanal au Cameroun ?',
      en: 'How to price a handmade product in Cameroon',
    },
    excerpt: {
      fr: 'Une méthode simple pour calculer ses coûts en FCFA, protéger sa marge et expliquer son prix au client.',
      en: 'A simple method to calculate costs in XAF, protect your margin and explain your price to customers.',
    },
    coverImage: '/images/ChatGPT Image 15 sept. 2026, 15_32_11.png',
    coverAlt: { fr: 'Artisane camerounaise calculant le prix d’un produit artisanal', en: 'Cameroonian artisan calculating the price of a handmade product' },
    sources: [{ label: 'MINPMEESA - Ministère des PME, de l’Économie sociale et de l’Artisanat', url: 'https://www.minpmeesa.cm/' }],
    author: 'L’équipe ArtisanConnect',
    publishedAt: '2026-09-12',
    readingTime: 5,
    keywords: ['prix artisanat Cameroun', 'calculer prix produit artisanal', 'marge artisan'],
    sections: {
      fr: [
        { heading: 'Commencer par le coût réel', paragraphs: ['Additionnez les matières, le temps de travail, l’emballage, le transport vers le point de remise et les frais de fonctionnement. Même lorsque l’atelier est familial, le temps consacré à la production doit être valorisé.'] },
        { heading: 'Ajouter une marge compréhensible', paragraphs: ['Une marge sert à renouveler les outils, absorber les imprévus et rémunérer le développement de l’activité. Présentez ce que le prix comprend : matière, fabrication, finition et emballage.'] },
        { heading: 'Tester sans se brader', paragraphs: ['Comparez des produits réellement comparables, observez les retours des clients et ajustez progressivement. Une promotion ponctuelle doit avoir une durée et un objectif précis, plutôt que devenir le prix permanent.'] },
      ],
      en: [
        { heading: 'Start with the real cost', paragraphs: ['Add materials, working time, packaging, transport to the handover point and operating costs. Even in a family workshop, production time should be valued.'] },
        { heading: 'Add a clear margin', paragraphs: ['A margin helps replace tools, absorb surprises and grow the activity. Explain what the price includes: material, making, finishing and packaging.'] },
        { heading: 'Test without underselling', paragraphs: ['Compare genuinely similar products, listen to customers and adjust gradually. A promotion should have a duration and a clear goal instead of becoming the permanent price.'] },
      ],
    },
  },
  {
    slug: 'photos-produits-artisanaux-whatsapp-cameroun',
    category: { fr: 'Communication digitale', en: 'Digital communication' },
    title: {
      fr: 'Photos de produits artisanaux : 6 astuces pour vendre sur WhatsApp au Cameroun',
      en: 'Handmade product photos: 6 tips for selling on WhatsApp in Cameroon',
    },
    excerpt: {
      fr: 'Améliorer ses images avec un téléphone, une lumière naturelle et une fiche produit claire.',
      en: 'Improve your images with a phone, natural light and a clear product description.',
    },
    coverImage: '/images/ChatGPT Image 15 sept. 2026, 15_33_18.png',
    coverAlt: { fr: 'Artisane camerounaise présentant ses produits artisanaux sur WhatsApp', en: 'Cameroonian artisan presenting handmade products on WhatsApp' },
    sources: [{ label: 'MINPMEESA - site officiel', url: 'https://www.minpmeesa.cm/site/' }],
    author: 'L’équipe ArtisanConnect',
    publishedAt: '2026-09-12',
    readingTime: 5,
    keywords: ['photos produits artisanaux', 'vendre sur WhatsApp Cameroun', 'marketing artisanat'],
    sections: {
      fr: [
        { heading: 'Une image, une information', paragraphs: ['La première photo doit montrer le produit entier. Ajoutez ensuite un gros plan de la matière, une photo avec une personne ou un objet de comparaison, puis une image de l’emballage si la commande est expédiée.'] },
        { heading: 'La lumière avant le matériel', paragraphs: ['Placez l’objet près d’une fenêtre, nettoyez l’objectif du téléphone et évitez le flash direct. Un fond uni aide le client à voir les couleurs et les détails sans distraction.'] },
        { heading: 'La légende qui convertit', paragraphs: ['Indiquez le nom, la matière, les dimensions, le prix en FCFA, le délai et la ville de remise. Terminez par une action simple : demander une variante, vérifier la disponibilité ou commander.'] },
      ],
      en: [
        { heading: 'One image, one piece of information', paragraphs: ['The first photo should show the whole product. Then add a material close-up, an in-use photo or a size reference, and a packaging photo when the order is shipped.'] },
        { heading: 'Light comes before equipment', paragraphs: ['Place the item near a window, clean the phone lens and avoid direct flash. A plain background helps customers see colours and details without distraction.'] },
        { heading: 'A caption that converts', paragraphs: ['State the name, material, dimensions, XAF price, lead time and handover city. End with one clear action: ask for a variation, check availability or order.'] },
      ],
    },
  },
  {
    slug: 'livrer-commandes-artisanales-douala-yaounde',
    category: { fr: 'Paiement & livraison', en: 'Payments & delivery' },
    title: {
      fr: 'Livrer des commandes artisanales à Douala et Yaoundé : organiser un parcours fiable',
      en: 'Delivering craft orders in Douala and Yaoundé: building a reliable process',
    },
    excerpt: {
      fr: 'Adresse, repères, emballage et confirmation : les étapes pour réduire les retards et les livraisons échouées.',
      en: 'Address, landmarks, packaging and confirmation: steps to reduce delays and failed deliveries.',
    },
    coverImage: '/images/ChatGPT Image 15 sept. 2026, 15_39_03.png',
    coverAlt: { fr: 'Livraison de commandes artisanales entre Douala et Yaoundé', en: 'Handmade order delivery between Douala and Yaoundé' },
    sources: [{ label: 'Orange Cameroun', url: 'https://www.orange.cm/' }],
    author: 'L’équipe ArtisanConnect',
    publishedAt: '2026-09-12',
    readingTime: 5,
    keywords: ['livraison artisanat Douala', 'livraison artisanat Yaoundé', 'emballage produit artisanal'],
    sections: {
      fr: [
        { heading: 'Une adresse doit aider un livreur', paragraphs: ['Demandez la ville, le quartier, un repère visible, un numéro joignable et une plage horaire. Une position sur carte complète l’adresse mais ne remplace pas les indications locales.'] },
        { heading: 'Protéger avant de déplacer', paragraphs: ['Adaptez l’emballage à la matière : protection contre les chocs pour la poterie, maintien des angles pour le bois, sachet propre pour le textile. Photographiez le colis avant remise au transporteur.'] },
        { heading: 'Confirmer les moments clés', paragraphs: ['Confirmez la disponibilité de l’article, le départ, l’arrivée du livreur et la remise au client. En cas d’imprévu, prévenez rapidement plutôt que de laisser la commande sans information.'] },
      ],
      en: [
        { heading: 'An address should help a courier', paragraphs: ['Ask for the city, neighbourhood, a visible landmark, a reachable phone number and a time window. A map pin complements an address but does not replace local directions.'] },
        { heading: 'Protect before moving', paragraphs: ['Match packaging to the material: shock protection for pottery, corner protection for wood and a clean bag for textiles. Photograph the parcel before handing it to the carrier.'] },
        { heading: 'Confirm the key moments', paragraphs: ['Confirm item availability, departure, courier arrival and handover. When something changes, inform the customer quickly instead of leaving the order without an update.'] },
      ],
    },
  },
  {
    slug: 'cooperative-artisanale-catalogue-numerique-cameroun',
    category: { fr: 'Impact & communautés', en: 'Impact & communities' },
    title: {
      fr: 'Coopérative artisanale au Cameroun : créer un catalogue numérique qui fonctionne',
      en: 'Craft cooperative in Cameroon: building a useful digital catalogue',
    },
    excerpt: {
      fr: 'Comment organiser les rôles, les stocks et les photos pour présenter collectivement le travail d’une coopérative.',
      en: 'How to organise roles, stock and photos to present a cooperative’s work collectively.',
    },
    coverImage: '/images/ChatGPT Image 15 sept. 2026, 15_40_28.png',
    coverAlt: { fr: 'Coopérative artisanale camerounaise présentant son catalogue numérique', en: 'Cameroonian craft cooperative presenting its digital catalogue' },
    sources: [{ label: 'ONU Femmes - Cameroun', url: 'https://africa.unwomen.org/fr/where-we-are/west-and-central-africa/cameroon' }, { label: 'OHADA', url: 'https://www.ohada.org/' }],
    author: 'L’équipe ArtisanConnect',
    publishedAt: '2026-09-12',
    readingTime: 6,
    keywords: ['coopérative artisanale Cameroun', 'catalogue numérique coopérative', 'GIC artisanat'],
    sections: {
      fr: [
        { heading: 'Commencer par une fiche commune', paragraphs: ['Définissez le nom, la zone d’activité, les matières utilisées, les personnes représentées et le contact de référence. La fiche doit expliquer l’organisation sans effacer les artisanes et artisans qui produisent réellement.'] },
        { heading: 'Répartir les responsabilités', paragraphs: ['Une personne peut tenir le catalogue, une autre vérifier les stocks et une autre suivre les commandes. Notez les décisions et les règles de partage avant que le volume de ventes augmente.'] },
        { heading: 'Mesurer un impact honnête', paragraphs: ['Suivez des indicateurs simples : nombre de membres actifs, commandes réalisées, produits fabriqués et revenus distribués. Ne publiez que des données que la coopérative peut expliquer et mettre à jour.'] },
      ],
      en: [
        { heading: 'Start with a shared profile', paragraphs: ['Define the name, activity area, materials, represented members and main contact. The profile should explain the organisation without hiding the women and men who actually make the products.'] },
        { heading: 'Share responsibilities', paragraphs: ['One person can manage the catalogue, another can check stock and another can follow orders. Record decisions and sharing rules before sales volume grows.'] },
        { heading: 'Measure impact honestly', paragraphs: ['Track simple indicators: active members, completed orders, products made and income distributed. Publish only data the cooperative can explain and update.'] },
      ],
    },
  },
  {
    slug: 'appels-projets-artisans-cameroun-preparer-dossier',
    category: { fr: 'Développement d’activité', en: 'Business development' },
    title: {
      fr: 'Appels à projets pour artisans au Cameroun : préparer un dossier convaincant',
      en: 'Calls for projects for Cameroonian artisans: preparing a strong application',
    },
    excerpt: {
      fr: 'Les éléments à réunir pour présenter clairement son activité, son besoin et les résultats attendus d’un accompagnement.',
      en: 'The elements needed to clearly present your activity, your needs and the expected results of support.',
    },
    coverImage: '/images/Copilot_20260915_152439.png',
    coverAlt: { fr: 'Artisan camerounais préparant un dossier de projet et développant son activité', en: 'Cameroonian artisan preparing a project proposal and growing a craft business' },
    sources: [{ label: 'MINPMEESA - Ministère des PME, de l’Économie sociale et de l’Artisanat', url: 'https://www.minpmeesa.cm/' }, { label: 'ONU Femmes - Cameroun', url: 'https://africa.unwomen.org/fr/where-we-are/west-and-central-africa/cameroon' }],
    author: 'L’équipe ArtisanConnect',
    publishedAt: '2026-09-12',
    readingTime: 6,
    keywords: ['appel à projets artisan Cameroun', 'financement artisan', 'dossier projet artisanat'],
    sections: {
      fr: [
        { heading: 'Décrire un besoin précis', paragraphs: ['Expliquez ce qui bloque aujourd’hui : équipement, matière première, formation, visibilité ou accès au marché. Un besoin précis est plus facile à relier à un budget et à un résultat.'] },
        { heading: 'Prouver son activité', paragraphs: ['Préparez des photos, une courte présentation, des exemples de commandes, les coordonnées de l’atelier et les documents demandés. Un historique simple des ventes peut être plus utile qu’une longue description générale.'] },
        { heading: 'Promettre des résultats mesurables', paragraphs: ['Indiquez ce qui changera après l’accompagnement : capacité de production, nouveaux produits, membres formés, commandes livrées ou nouveaux clients. Prévoyez une méthode de suivi réaliste.'] },
      ],
      en: [
        { heading: 'Describe a precise need', paragraphs: ['Explain what currently limits you: equipment, raw materials, training, visibility or market access. A precise need is easier to connect to a budget and an outcome.'] },
        { heading: 'Show your activity', paragraphs: ['Prepare photos, a short presentation, examples of orders, workshop contacts and requested documents. A simple sales history can be more useful than a long general description.'] },
        { heading: 'Promise measurable outcomes', paragraphs: ['State what will change after support: production capacity, new products, members trained, orders delivered or new customers. Choose a realistic way to track progress.'] },
      ],
    },
  },
  {
    slug: 'avantages-formalisation-artisan-cameroun',
    category: { fr: 'Développement d’activité', en: 'Business development' },
    title: {
      fr: 'Quels sont les avantages de la formalisation pour un artisan au Cameroun ?',
      en: 'What are the benefits of formalisation for an artisan in Cameroon?',
    },
    excerpt: {
      fr: 'Appuis, financement, formation, marchés et protection sociale : les principaux avantages et démarches pour devenir un artisan formalisé.',
      en: 'Support, funding, training, markets and social protection: the main benefits and steps to become a formalised artisan.',
    },
    coverImage: '/images/ChatGPT Image 15 sept. 2026, 15_41_40.png',
    coverAlt: { fr: 'Artisan camerounais formalisé présentant sa carte d’artisan', en: 'Formalised Cameroonian artisan presenting an artisan card' },
    sources: [
      { label: 'MINPMEESA - Ministère des PME, de l’Économie sociale et de l’Artisanat', url: 'https://www.minpmeesa.cm/' },
      { label: 'OHADA - Organisation pour l’harmonisation en Afrique du droit des affaires', url: 'https://www.ohada.org/' },
    ],
    author: 'L’équipe ArtisanConnect',
    publishedAt: '2026-09-12',
    readingTime: 7,
    keywords: ['formalisation artisan Cameroun', 'avantages artisan formalisé', 'MINPMEESA artisan', 'carte artisan Cameroun'],
    sections: {
      fr: [
        {
          heading: 'Pourquoi formaliser son activité artisanale ?',
          paragraphs: [
            'La formalisation donne à l’activité artisanale un cadre mieux identifié et facilite les échanges avec les administrations, les partenaires et les clients professionnels. Elle peut également aider l’artisan à organiser ses revenus, ses documents et le développement de son atelier.',
            'Un artisan formalisé peut notamment être éligible à différents appuis non financiers proposés par le MINPMEESA et d’autres structures partenaires, selon les conditions propres à chaque programme.',
          ],
          bullets: [
            'bénéficier d’une assistance commerciale, notamment pour participer à des foires nationales ou internationales et présenter ses produits en ligne ;',
            'accéder à des possibilités de financement selon les dispositifs et critères d’éligibilité ;',
            'accéder à des formations techniques pour renforcer ses compétences ;',
            'être éligible à certains marchés publics réservés aux artisans et aux petites et moyennes entreprises, selon les textes applicables ;',
            'pouvoir acquérir un espace d’exposition dans un village artisanal ;',
            'intégrer les chaînes de valeur de moyennes et grandes entreprises et faciliter la vente de ses produits.',
          ],
        },
        {
          heading: 'Comment devenir un artisan formalisé ?',
          paragraphs: ['Le parcours présenté par les services publics comprend plusieurs étapes. Les modalités peuvent dépendre de la commune, de la situation de l’activité et de l’évolution des textes :'],
          bullets: [
            's’inscrire auprès du bureau municipal de l’artisanat de sa commune ;',
            's’acquitter de l’impôt libératoire auprès de la recette municipale lorsque les conditions applicables sont réunies ; pour les activités dont le chiffre d’affaires annuel est inférieur à 10 000 000 FCFA, vérifier le régime applicable auprès de sa commune ;',
            'tenir à jour la comptabilité et les documents de suivi de l’activité ;',
            's’affilier à l’assurance volontaire auprès de l’agence compétente de la Caisse nationale de prévoyance sociale (CNPS).',
          ],
        },
        {
          heading: 'À quoi l’artisan peut-il avoir droit ?',
          paragraphs: ['Une fois les démarches réalisées et les conditions remplies, l’artisan peut notamment obtenir ou solliciter :'],
          bullets: [
            'un certificat d’immatriculation auprès du Registre du Commerce ;',
            'une carte d’artisan auprès du service départemental compétent du MINPMEESA ;',
            'un récépissé de paiement de l’impôt libératoire auprès de la recette municipale ;',
            'une pension de vieillesse si l’artisan a souscrit à l’assurance volontaire de la CNPS et reste à jour de ses cotisations.',
          ],
        },
        {
          heading: 'À vérifier avant de commencer',
          paragraphs: [
            'Les seuils, les pièces à fournir, les frais et les intitulés administratifs peuvent évoluer. Avant toute démarche, rapprochez-vous du bureau municipal de l’artisanat, de la recette municipale, du service départemental du MINPMEESA ou de la CNPS de votre localité. Cet article constitue un guide d’orientation et ne remplace pas une confirmation administrative.',
          ],
        },
      ],
      en: [
        {
          heading: 'Why formalise a craft activity?',
          paragraphs: [
            'Formalisation gives a craft activity a clearer framework and makes it easier to work with public services, partners and professional customers. It can also help artisans organise income, records and workshop growth.',
            'A formalised artisan may be eligible for non-financial support offered by MINPMEESA and partner organisations, subject to the conditions of each programme.',
          ],
          bullets: [
            'commercial support, including national or international fairs and online presentation of products;',
            'access to funding opportunities depending on the scheme and eligibility criteria;',
            'technical training to strengthen skills;',
            'eligibility for certain public contracts reserved for artisans and small and medium-sized businesses under applicable rules;',
            'the possibility of obtaining exhibition space in craft villages;',
            'integration into the value chains of medium-sized and large companies, supporting product sales.',
          ],
        },
        {
          heading: 'How to become a formalised artisan',
          paragraphs: ['The process presented by public services includes several steps. Requirements may depend on the municipality, the activity and changes in applicable rules:'],
          bullets: [
            'register with the municipal craft office in your municipality;',
            'pay the applicable local discharge tax at the municipal revenue office when the relevant conditions are met;',
            'keep accounting and business records up to date;',
            'join voluntary insurance through the relevant National Social Insurance Fund (CNPS) office.',
          ],
        },
        {
          heading: 'What can an artisan receive?',
          paragraphs: ['Once the steps have been completed and the conditions are met, an artisan may obtain or apply for:'],
          bullets: [
            'a registration certificate from the Trade and Personal Property Credit Register;',
            'an artisan card from the relevant MINPMEESA departmental service;',
            'a receipt for payment of the local discharge tax from the municipal revenue office;',
            'an old-age pension if the artisan has joined CNPS voluntary insurance and keeps contributions up to date.',
          ],
        },
        {
          heading: 'Check before starting',
          paragraphs: ['Thresholds, required documents, fees and administrative names may change. Before taking action, contact the municipal craft office, municipal revenue office, relevant MINPMEESA departmental service or CNPS office in your area. This article is an orientation guide and does not replace administrative confirmation.'],
        },
      ],
    },
  },
  {
    slug: 'participation-selection-recompenses-artisans-cameroun',
    category: { fr: 'Opportunités & événements', en: 'Opportunities & events' },
    title: {
      fr: 'Participation et récompenses des artisans au Cameroun : comment être sélectionné ?',
      en: 'Participation and awards for artisans in Cameroon: how are artisans selected?',
    },
    excerpt: {
      fr: 'Bureau communal artisanal, sélection départementale, régionale et nationale : comprendre le parcours de participation des artisans.',
      en: 'Municipal craft office, departmental, regional and national selection: understand the participation pathway for artisans.',
    },
    coverImage: '/images/ChatGPT Image 15 sept. 2026, 15_42_47.png',
    coverAlt: { fr: 'Artisane camerounaise participant à une sélection et recevant une récompense', en: 'Cameroonian artisan taking part in a selection and receiving an award' },
    sources: [
      { label: 'MINPMEESA - Participation des artisans', url: 'https://www.minpmeesa.cm/site' },
      { label: 'MINPMEESA - site officiel', url: 'https://www.minpmeesa.cm/' },
    ],
    author: 'L’équipe ArtisanConnect',
    publishedAt: '2026-09-12',
    readingTime: 6,
    keywords: ['prix artisans Cameroun', 'sélection artisan Cameroun', 'Bureau communal artisanal', 'artisanat d’art', 'artisanat de production'],
    sections: {
      fr: [
        {
          heading: 'Qui peut participer ?',
          paragraphs: [
            'Tout artisan éligible et inscrit au Bureau communal artisanal (BCA) de sa commune peut être concerné par les opportunités de participation. L’inscription permet notamment de renseigner l’identité de l’artisan ou de l’entreprise artisanale, le secteur concerné, la description de l’activité et la localisation de l’atelier.',
            'Pour préparer une candidature, vérifiez que ces informations sont exactes et à jour auprès du bureau compétent.',
          ],
        },
        {
          heading: 'Comment se déroule la sélection ?',
          paragraphs: [
            'D’après les informations du MINPMEESA, la sélection se fait conformément à la loi de 2007 régissant l’artisanat au Cameroun. Elle commence au niveau départemental, se poursuit au niveau régional et peut ensuite atteindre le niveau national.',
            'Chaque étape peut demander une présentation claire de l’activité, des produits ou des pièces réalisées. Les critères et documents précis peuvent dépendre de l’événement ou du programme concerné : il est donc important de consulter l’avis officiel avant de déposer un dossier.',
          ],
        },
        {
          heading: 'Existe-t-il des prix ou des récompenses ?',
          paragraphs: [
            'Oui. Les participations à des événements, expositions ou compétitions peuvent donner lieu à des prix et à des reconnaissances. Les exemples communiqués mentionnent notamment des distinctions obtenues dans le cadre de participations à l’étranger :',
          ],
          bullets: [
            'Nigeria : meilleur pays participant ;',
            'Nigeria : prix de conformité ;',
            'Ouagadougou : troisième meilleur stand national.',
          ],
        },
        {
          heading: 'Dans quels domaines ?',
          paragraphs: ['Les domaines mentionnés pour ces participations et distinctions comprennent notamment :'],
          bullets: [
            'l’artisanat d’art, qui valorise la création, l’esthétique, le design et le savoir-faire ;',
            'l’artisanat de production, qui concerne la fabrication de biens et d’objets utiles à partir de techniques et de matières adaptées.',
          ],
        },
        {
          heading: 'Comment se préparer ?',
          paragraphs: [
            'Présentez un atelier clairement identifié, des photos propres des produits, une description du savoir-faire, les matières utilisées et les coordonnées à jour. Préparez également une sélection de pièces représentatives, faciles à transporter et accompagnées d’informations sur leur fabrication.',
            'Les dates, critères, catégories et récompenses varient selon chaque événement. Utilisez les annonces du MINPMEESA et les informations de votre BCA comme référence avant toute inscription.',
          ],
        },
      ],
      en: [
        {
          heading: 'Who can participate?',
          paragraphs: [
            'Any eligible artisan registered with the Municipal Craft Office (BCA) in their municipality may be considered for participation opportunities. Registration records the identity of the artisan or craft business, the relevant craft sector, a description of the activity and the location of the workshop.',
            'Before applying, check that this information is accurate and up to date with the relevant office.',
          ],
        },
        {
          heading: 'How does selection work?',
          paragraphs: [
            'According to information from MINPMEESA, selection follows the 2007 law governing crafts in Cameroon. It starts at departmental level, continues at regional level and may then reach national level.',
            'Each stage may require a clear presentation of the activity, products or pieces made. Exact criteria and documents may depend on the event or programme, so consult the official notice before applying.',
          ],
        },
        {
          heading: 'Are there awards or prizes?',
          paragraphs: ['Yes. Participation in events, exhibitions or competitions may lead to prizes and recognition. The examples provided include distinctions received during international participation:'],
          bullets: ['Nigeria: best participating country;', 'Nigeria: compliance award;', 'Ouagadougou: third-best national stand.'],
        },
        {
          heading: 'Which fields are concerned?',
          paragraphs: ['The fields mentioned for these participations and distinctions include:'],
          bullets: ['craft art, which values creation, aesthetics, design and know-how;', 'production crafts, covering the manufacture of useful goods and objects using suitable techniques and materials.'],
        },
        {
          heading: 'How should artisans prepare?',
          paragraphs: ['Present a clearly identified workshop, clean product photos, a description of your know-how, materials and current contact details. Prepare representative pieces that are easy to transport and include information about how they were made.',
            'Dates, criteria, categories and prizes vary by event. Use MINPMEESA announcements and information from your BCA as the reference before registering.'],
        },
      ],
    },
  },
  {
    slug: 'codepa-artisanat-africain-papea-cameroun',
    category: { fr: 'Opportunités & événements', en: 'Opportunities & events' },
    title: {
      fr: 'CODEPA : comprendre le programme africain de développement et de promotion de l’artisanat',
      en: 'CODEPA: understanding Africa’s programme for craft development and promotion',
    },
    excerpt: {
      fr: 'Missions, organisation, Etats membres et projets du PAPEA : ce qu’un artisan camerounais doit savoir sur le CODEPA.',
      en: 'Mission, structure, member states and PAPEA projects: what Cameroonian artisans should know about CODEPA.',
    },
    coverImage: '/images/Copilot_20260915_151847.png',
    coverAlt: { fr: 'Partenaires et artisans réunis pour le développement artisanal au Cameroun', en: 'Partners and artisans working together for craft development in Cameroon' },
    sources: [
      { label: 'MINPMEESA - Artisanat et CODEPA', url: 'https://www.minpmeesa.cm/site/artisanat/' },
      { label: 'CODEPA - calendrier et informations officielles', url: 'https://www.minpmeesa.cm/site/artisanat/codepa/' },
    ],
    featuredLink: {
      label: { fr: 'Consulter le calendrier CODEPA - MINPMEESA', en: 'View the CODEPA calendar - MINPMEESA' },
      url: 'https://www.minpmeesa.cm/site/artisanat/codepa/',
    },
    author: 'L’équipe ArtisanConnect',
    publishedAt: '2026-09-12',
    readingTime: 7,
    keywords: ['CODEPA artisanat africain', 'PAPEA Cameroun', 'MINPMEESA CODEPA', 'promotion artisanat africain'],
    sections: {
      fr: [
        {
          heading: 'C’est quoi le CODEPA ?',
          paragraphs: [
            'Le CODEPA, ou Comité de Coordination pour le Développement et la Promotion de l’Artisanat Africain, est une organisation interafricaine dédiée au développement et à la promotion de l’artisanat africain.',
            'Il constitue un cadre continental de concertation, de réflexion et d’action pour coordonner les programmes en faveur de l’artisanat dans les Etats membres. Pour un artisan camerounais, il représente notamment une porte d’entrée vers des dynamiques de formation, de financement, de commerce et de mutualisation à l’échelle africaine.',
          ],
        },
        {
          heading: 'Une organisation présente dans quatre régions d’Afrique',
          paragraphs: ['Le CODEPA compte 26 Etats membres répartis dans quatre régions :'],
          bullets: [
            'Afrique Centrale, avec le Gabon comme délégué régional ;',
            'Afrique du Nord, avec l’Algérie comme délégué régional ;',
            'Afrique de l’Ouest, avec la Guinée Conakry comme délégué régional ;',
            'Afrique Australe et Orientale, avec Madagascar comme délégué régional.',
          ],
        },
        {
          heading: 'Quels sont les organes du CODEPA ?',
          paragraphs: ['Pour conduire ses actions, le CODEPA s’appuie sur trois organes complémentaires :'],
          bullets: [
            'la Conférence des Ministres, qui se réunit chaque année à tour de rôle et définit les orientations stratégiques ;',
            'le Secrétariat Général, dont le siège est basé à Ouagadougou, au Burkina Faso ;',
            'les quatre Délégués Régionaux, qui servent de relais entre la Conférence des Ministres, le Secrétariat Général et les Etats de leur région.',
          ],
        },
        {
          heading: 'Le PAPEA et ses quatre projets structurants',
          paragraphs: ['Sur la base des orientations de la Conférence des Ministres, le CODEPA a mis en place le Programme d’Appui aux Petites Entreprises et à l’Artisanat (PAPEA). Son objectif est de faciliter l’accès des artisans aux services d’appui financiers et non financiers à travers quatre axes :'],
          bullets: [
            'appuyer la formation professionnelle et l’apprentissage par alternance ;',
            'faciliter l’accès aux financements ;',
            'développer le commerce électronique des produits de l’artisanat ;',
            'créer des centres de ressources professionnelles pour mutualiser les compétences et les moyens de production.',
          ],
        },
        {
          heading: 'Pourquoi suivre le calendrier CODEPA ?',
          paragraphs: ['Le calendrier officiel peut aider les artisans, coopératives et structures d’accompagnement à repérer les réunions, événements, appels ou échéances liés aux programmes de l’artisanat. Consultez régulièrement la page CODEPA du MINPMEESA et vérifiez les conditions propres à chaque activité avant de vous inscrire.',
            'L’artisanat contribue à la création d’emplois, de richesse et à la lutte contre la pauvreté. Le développement du commerce électronique et l’accès aux compétences peuvent également aider les ateliers camerounais à atteindre de nouveaux clients.'],
        },
      ],
      en: [
        {
          heading: 'What is CODEPA?',
          paragraphs: [
            'CODEPA, the Coordination Committee for the Development and Promotion of African Crafts, is an inter-African organisation dedicated to developing and promoting African crafts.',
            'It provides a continental framework for consultation, reflection and action to coordinate craft programmes across member states. For a Cameroonian artisan, it can open access to wider training, financing, trade and shared-resource initiatives.',
          ],
        },
        {
          heading: 'An organisation covering four African regions',
          paragraphs: ['CODEPA has 26 member states across four regions:'],
          bullets: ['Central Africa, represented by Gabon;', 'North Africa, represented by Algeria;', 'West Africa, represented by Guinea-Conakry;', 'Southern and East Africa, represented by Madagascar.'],
        },
        {
          heading: 'What are CODEPA’s bodies?',
          paragraphs: ['CODEPA operates through three complementary bodies:'],
          bullets: ['the Conference of Ministers, which meets annually on a rotating basis and sets strategic directions;', 'the General Secretariat, headquartered in Ouagadougou, Burkina Faso;', 'four Regional Delegates, acting as links between the Conference, the General Secretariat and the states in their region.'],
        },
        {
          heading: 'PAPEA and its four structural projects',
          paragraphs: ['Following the Conference of Ministers’ guidance, CODEPA established the Support Programme for Small Businesses and Crafts (PAPEA). Its goal is to improve artisans’ access to financial and non-financial support through four areas:'],
          bullets: ['support for vocational training and work-study learning;', 'easier access to finance;', 'development of e-commerce for craft products;', 'professional resource centres to share skills and production resources.'],
        },
        {
          heading: 'Why follow the CODEPA calendar?',
          paragraphs: ['The official calendar can help artisans, cooperatives and support organisations identify meetings, events, calls or deadlines related to craft programmes. Check the CODEPA page on the MINPMEESA website regularly and review the conditions for each activity before registering.',
            'Crafts contribute to employment, wealth creation and poverty reduction. E-commerce and access to skills can also help Cameroonian workshops reach new customers.'],
        },
      ],
    },
  },
  {
    slug: 'types-foires-artisanales-cameroun-siarc',
    category: { fr: 'Opportunités & événements', en: 'Opportunities & events' },
    title: {
      fr: 'Types de foires artisanales au Cameroun : de la commune au SIARC',
      en: 'Types of craft fairs in Cameroon: from the municipality to SIARC',
    },
    excerpt: {
      fr: 'Salon communal, départemental, régional, SIARC et foires internationales : comprendre le parcours de sélection des artisans.',
      en: 'Municipal, departmental, regional fairs, SIARC and international events: understand the artisan selection pathway.',
    },
    coverImage: '/images/ChatGPT Image 15 sept. 2026, 15_44_07.png',
    coverAlt: { fr: 'Foires artisanales au Cameroun et salon SIARC', en: 'Craft fairs in Cameroon and the SIARC trade show' },
    sources: [
      { label: 'MINPMEESA - Types de foires artisanales', url: 'https://www.minpmeesa.cm/site/types-de-foires-2/' },
      { label: 'MINPMEESA - site officiel', url: 'https://www.minpmeesa.cm/site' },
    ],
    featuredLink: {
      label: { fr: 'Consulter le calendrier et les types de foires - MINPMEESA', en: 'View the calendar and types of fairs - MINPMEESA' },
      url: 'https://www.minpmeesa.cm/site/types-de-foires-2/',
    },
    author: 'L’équipe ArtisanConnect',
    publishedAt: '2026-09-12',
    readingTime: 8,
    keywords: ['foires artisanales Cameroun', 'SIARC Cameroun', 'salon artisanal communal', 'SIAO', 'INAC Abuja', 'MIVA', 'MIATO'],
    sections: {
      fr: [
        {
          heading: 'Un parcours de sélection en plusieurs niveaux',
          paragraphs: ['Les foires artisanales permettent de présenter les savoir-faire, de vendre des produits, de rencontrer des acheteurs et de sélectionner progressivement les lauréats. Le parcours commence au niveau communal et peut conduire jusqu’au Salon international de l’artisanat au Cameroun (SIARC), puis vers des foires internationales.'],
        },
        {
          heading: 'Le salon artisanal communal',
          paragraphs: ['Le salon artisanal communal est organisé par les maires des 360 communes et financé par le budget communal. Les lauréats de ce niveau peuvent être sélectionnés pour participer aux salons artisanaux départementaux.'],
        },
        {
          heading: 'Le salon artisanal départemental',
          paragraphs: ['Les salons départementaux sont organisés sous la supervision des préfets et coordonnés par les délégués départementaux du MINPMEESA. Ils sont financés par le budget du MINPMEESA. Les lauréats sont ensuite orientés vers les salons régionaux pour concourir avec ceux des autres départements.'],
        },
        {
          heading: 'Les salons artisanaux régionaux',
          paragraphs: ['Les salons régionaux sont placés sous la supervision des Gouverneurs et coordonnés par les délégués régionaux du MINPMEESA. Ils rassemblent les lauréats des départements de la région. Les meilleurs peuvent être sélectionnés pour participer au SIARC.'],
        },
        {
          heading: 'Le SIARC : le rendez-vous national',
          paragraphs: ['Le Salon international de l’artisanat au Cameroun, ou SIARC, est généralement placé sous le haut patronage du Président de la République et supervisé par le Ministre en charge de l’artisanat. Selon les informations du MINPMEESA, il réunit des lauréats représentant les 10 régions, les 58 départements et les 360 arrondissements. Les meilleurs artisans peuvent être récompensés par des prix dans différentes catégories.'],
        },
        {
          heading: 'Les salons artisanaux internationaux',
          paragraphs: ['La Direction de l’artisanat et des migrations du secteur informel (DAMSI) identifie, sélectionne et accompagne généralement les artisans dans les foires internationales. Ces événements permettent de se faire connaître, de commercialiser ses produits, de partager des expériences et d’accéder à des marchés internationaux. Les rendez-vous cités par le MINPMEESA comprennent :'],
          bullets: [
            'Nigeria International Arts and Craft Expo (INAC), à Abuja, au Nigeria ;',
            'Marché ivoirien de l’artisanat (MIVA), à Abidjan, en Côte d’Ivoire ;',
            'Salon international de l’artisanat de Ouagadougou (SIAO), au Burkina Faso ;',
            'Salon international de l’artisanat de Dakar (SIAD), au Sénégal ;',
            'Marché international de l’artisanat du Togo (MIATO), à Lomé.',
          ],
        },
        {
          heading: 'Comment se préparer à une foire ?',
          paragraphs: ['Préparez des produits représentatifs de votre savoir-faire, une présentation courte de l’atelier, des prix en FCFA et, si nécessaire, des informations sur les possibilités de commande et d’expédition. Conservez des photos de qualité, vos coordonnées et les documents demandés par l’organisateur.',
            'Les dates, critères et modalités de sélection peuvent changer selon le salon. Consultez le calendrier et les annonces officielles du MINPMEESA avant de vous inscrire ou de préparer un déplacement.'],
        },
      ],
      en: [
        {
          heading: 'A selection pathway with several levels',
          paragraphs: ['Craft fairs showcase know-how, create sales opportunities, connect artisans with buyers and progressively select award winners. The pathway begins at municipal level and can lead to the International Craft Fair of Cameroon (SIARC), followed by international fairs.'],
        },
        {
          heading: 'The municipal craft fair',
          paragraphs: ['The municipal craft fair is organised by the mayors of Cameroon’s 360 municipalities and financed through the municipal budget. Winners at this level may be selected for departmental craft fairs.'],
        },
        {
          heading: 'The departmental craft fair',
          paragraphs: ['Departmental fairs operate under the supervision of prefects and are coordinated by MINPMEESA departmental delegates. They are financed through the MINPMEESA budget. Winners may then move on to regional fairs and compete with artisans from other departments.'],
        },
        {
          heading: 'Regional craft fairs',
          paragraphs: ['Regional fairs operate under the supervision of Governors and are coordinated by MINPMEESA regional delegates. They bring together departmental winners from the region. The best participants may be selected for SIARC.'],
        },
        {
          heading: 'SIARC: the national event',
          paragraphs: ['The International Craft Fair of Cameroon, or SIARC, is generally held under the high patronage of the President of the Republic and supervised by the Minister responsible for crafts. According to MINPMEESA information, it brings together winners representing the 10 regions, 58 departments and 360 subdivisions. The best artisans may receive awards in different categories.'],
        },
        {
          heading: 'International craft fairs',
          paragraphs: ['The Directorate for Crafts and Informal Sector Migration (DAMSI) generally identifies, selects and supports artisans attending international fairs. These events help artisans gain visibility, sell products, share experience and access international markets. Events listed by MINPMEESA include:'],
          bullets: ['Nigeria International Arts and Craft Expo (INAC), Abuja, Nigeria;', 'Ivorian Craft Market (MIVA), Abidjan, Côte d’Ivoire;', 'International Arts and Crafts Fair of Ouagadougou (SIAO), Burkina Faso;', 'International Craft Fair of Dakar (SIAD), Senegal;', 'Togo International Handicraft Market (MIATO), Lomé.'],
        },
        {
          heading: 'How should artisans prepare?',
          paragraphs: ['Prepare representative products, a short workshop presentation, XAF prices and, when needed, information about ordering and shipping. Keep quality photos, current contact details and any documents requested by the organiser.',
            'Dates, criteria and selection rules may change by fair. Check MINPMEESA’s official calendar and announcements before registering or planning travel.'],
        },
      ],
    },
  },
];

export function getArticle(slug: string) {
  return blogArticles.find((article) => article.slug === slug);
}