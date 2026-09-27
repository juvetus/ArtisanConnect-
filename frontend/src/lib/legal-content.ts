import type { Language } from '@/lib/i18n';

export type LegalDocumentId = 'legal-notice' | 'privacy' | 'terms';

export type LegalSection = {
  title: string;
  paragraphs: string[];
  items?: string[];
};

type LegalDocumentText = {
  title: string;
  intro: string;
  sections: LegalSection[];
};

export const LEGAL_DRAFT_NOTICE: Record<Language, string> = {
  fr: 'Brouillon de travail — ces informations doivent être complétées et validées par l’entité exploitante et un conseil compétent avant l’ouverture publique. Les champs entre crochets ne sont pas des informations publiables.',
  en: 'Working draft — this information must be completed and reviewed by the operating entity and qualified counsel before public launch. Bracketed fields are not publishable information.',
};

export const LEGAL_DOCUMENTS: Record<LegalDocumentId, Record<Language, LegalDocumentText>> = {
  'legal-notice': {
    fr: {
      title: 'Mentions légales',
      intro: 'Informations relatives à l’éditeur et à l’hébergement du service ArtisanConnect.',
      sections: [
        {
          title: 'Éditeur du service',
          paragraphs: ['Nom commercial prévu : ArtisanConnect. Entité exploitante prévue : Tekou Digital. La forme juridique envisagée est une SARL ou une SAS, à confirmer lors de la création prévue le 15 octobre 2026. Immatriculation, identifiant fiscal et adresse officielle : [À COMPLÉTER APRÈS CRÉATION].', 'Responsable de publication : [NOM ET FONCTION]. Contact juridique officiel : [ADRESSE E-MAIL À CONFIRMER].'],
        },
        {
          title: 'Hébergement et prestataires techniques',
          paragraphs: ['Application et base de données : Render, région configurée Frankfurt (à confirmer pour chaque service et chaque environnement).', 'Stockage des médias : Cloudinary lorsqu’il est configuré. E-mails transactionnels : service SMTP Brevo lorsqu’il est activé. Les moyens de paiement et de livraison réellement disponibles sont précisés dans le parcours concerné.'],
        },
        {
          title: 'Propriété intellectuelle et contact',
          paragraphs: ['Les droits relatifs aux contenus, marques, photographies et éléments de la plateforme doivent être précisés par l’exploitant avant publication. Pour une question ou un signalement, utilisez le formulaire de contact d’ArtisanConnect.'],
        },
      ],
    },
    en: {
      title: 'Legal notice',
      intro: 'Information about the publisher and hosting of the ArtisanConnect service.',
      sections: [
        {
          title: 'Service operator',
          paragraphs: ['Planned trade name: ArtisanConnect. Planned operating entity: Tekou Digital. The intended legal form is SARL or SAS, to be confirmed when the company is created on October 15, 2026. Registration, tax identification and official address: [TO BE COMPLETED AFTER CREATION].', 'Publication director: [NAME AND ROLE]. Official legal contact: [EMAIL ADDRESS TO CONFIRM].'],
        },
        {
          title: 'Hosting and technical providers',
          paragraphs: ['Application and database: Render, configured in the Frankfurt region (to be confirmed for each service and environment).', 'Media storage: Cloudinary when configured. Transactional email: Brevo SMTP when enabled. Payment and delivery methods actually available are stated in the relevant workflow.'],
        },
        {
          title: 'Intellectual property and contact',
          paragraphs: ['Rights relating to content, trademarks, photographs and platform assets must be confirmed by the operator before publication. For questions or reports, use the ArtisanConnect contact form.'],
        },
      ],
    },
  },
  privacy: {
    fr: {
      title: 'Confidentialité et données personnelles',
      intro: 'Cette page décrit les traitements constatés dans le produit. Les finalités juridiques, durées de conservation, droits applicables et coordonnées du responsable restent à confirmer avant publication.',
      sections: [
        {
          title: 'Responsable du traitement',
          paragraphs: ['Responsable projet annoncé : Tekou Digital, nom commercial ArtisanConnect. La forme juridique et l’adresse de l’exploitant seront confirmées après la création prévue le 15 octobre 2026. Contact pour les questions relatives aux données : [E-MAIL DÉDIÉ À COMPLÉTER].'],
        },
        {
          title: 'Données traitées',
          paragraphs: ['Selon les fonctionnalités utilisées, ArtisanConnect peut traiter :'],
          items: ['Compte : nom, adresse e-mail, mot de passe stocké sous forme de hachage, téléphone, numéro WhatsApp, rôle, langue, ville et informations de profil.', 'Boutique et offres : nom, description, spécialité, localisation, disponibilité, prix, photos, vidéos, coordonnées de paiement mobile déclarées et justificatifs KYC transmis.', 'Échanges et demandes : messages, pièces jointes, demandes de devis, budget, échéance souhaitée et préférence de contact; le numéro de contact peut être transmis aux artisans sélectionnés selon le choix du client.', 'Commandes et paiements : articles, parties à la transaction, montants, méthode et état du paiement, livraison, suivi, annulation et demandes de remboursement.', 'Mesure d’usage : événements de recherche et de consultation, clics de contact, identifiant aléatoire de session conservé dans le stockage local du navigateur, identifiant de compte lorsqu’il est connecté, cible et ville si disponibles. Cet identifiant est pseudonyme et ne doit pas être présenté comme une anonymisation complète.'],
        },
        {
          title: 'Pourquoi ces données sont utilisées',
          paragraphs: ['Les traitements servent à créer et sécuriser les comptes, afficher boutiques et offres, mettre en relation clients et artisans, gérer messages, commandes, paiements et livraisons, fournir le support, prévenir les abus et mesurer le fonctionnement du service.', 'La base juridique applicable à chaque finalité (contrat, mesures précontractuelles, obligation légale, intérêt légitime ou consentement lorsque requis) doit être déterminée et validée par l’exploitant avec un conseil compétent avant publication.'],
        },
        {
          title: 'Destinataires et prestataires',
          paragraphs: ['Les informations nécessaires sont accessibles aux personnes concernées par une transaction ou une demande, ainsi qu’aux membres autorisés de l’équipe qui assurent validation, support, sécurité ou modération. Les pièces KYC ne sont pas destinées à être affichées publiquement; les documents privés peuvent être servis par lien temporaire signé.', 'Les prestataires techniques actuellement identifiés dans la configuration sont Render (hébergement/base de données), Cloudinary (médias lorsqu’activé) et Brevo via SMTP (e-mails lorsqu’activé). Les opérateurs Mobile Money ou transporteurs ne reçoivent des données que pour les fonctions effectivement activées. Les contrats, sous-traitants, régions de traitement et éventuels transferts hors du pays doivent être confirmés avant mise en production.'],
        },
        {
          title: 'Durées de conservation',
          paragraphs: ['Les durées précises ne sont pas définies dans le produit. À valider et publier par catégorie : comptes, justificatifs KYC, messages et pièces jointes, données de commande/comptabilité, journaux de sécurité, événements analytiques et sauvegardes. Indiquer également les critères de suppression ou d’archivage et les exceptions légales applicables.'],
        },
        {
          title: 'Sécurité et choix de contact',
          paragraphs: ['ArtisanConnect met en œuvre des contrôles d’accès et des protections techniques, dont le hachage des mots de passe et des liens temporaires pour certains documents privés. Aucun service ne peut garantir une sécurité absolue; les procédures internes de gestion des incidents restent à documenter.', 'Pour une demande de devis, le client choisit le canal de contact. Le numéro WhatsApp saisi est communiqué aux artisans sélectionnés uniquement selon cette préférence.'],
        },
        {
          title: 'Vos demandes et vos droits',
          paragraphs: ['Vous pouvez contacter l’exploitant pour demander l’accès, la rectification ou la suppression de données, ou poser une question sur leur utilisation. Les droits, exceptions, justificatifs éventuels, délais de réponse et autorité de recours applicables doivent être confirmés selon le droit effectivement applicable.', 'Contact : [E-MAIL OU ADRESSE DE CONFIDENTIALITÉ À COMPLÉTER].'],
        },
        {
          title: 'Stockage local et traceurs',
          paragraphs: ['Le navigateur conserve des éléments nécessaires au fonctionnement, notamment la session de connexion et la préférence de langue. Un identifiant aléatoire est également utilisé pour distinguer les sessions analytiques. L’inventaire complet des cookies, stockages locaux, outils tiers et règles de consentement doit être vérifié avant publication.'],
        },
        {
          title: 'Mise à jour',
          paragraphs: ['Version de travail datée du 27 septembre 2026. Avant mise en ligne, remplacer tous les champs à compléter, confirmer les prestataires et durées réels, faire valider le texte, puis indiquer la date d’entrée en vigueur et conserver l’historique des versions.'],
        },
      ],
    },
    en: {
      title: 'Privacy and personal data',
      intro: 'This page describes processing observed in the product. Legal purposes, retention periods, applicable rights and the controller’s contact details must be confirmed before publication.',
      sections: [
        {
          title: 'Data controller',
          paragraphs: ['Planned project operator: Tekou Digital, trading as ArtisanConnect. The legal form and operator address will be confirmed after the planned company creation on October 15, 2026. Contact for data questions: [DEDICATED EMAIL TO BE COMPLETED].'],
        },
        {
          title: 'Data processed',
          paragraphs: ['Depending on the features used, ArtisanConnect may process:'],
          items: ['Account: name, email address, password stored as a hash, phone, WhatsApp number, role, language, city and profile details.', 'Shop and offers: name, description, trade, location, availability, prices, photos, videos, declared mobile payment details and submitted KYC documents.', 'Communications and requests: messages, attachments, quote requests, budget, requested deadline and contact preference; a contact number may be shared with selected artisans according to the client’s choice.', 'Orders and payments: items, transaction parties, amounts, method and payment status, delivery, tracking, cancellation and refund requests.', 'Usage measurement: search and view events, contact clicks, a random session identifier stored in browser storage, account identifier when signed in, target and city where available. This identifier is pseudonymous and should not be described as fully anonymous.'],
        },
        {
          title: 'Why data is used',
          paragraphs: ['Processing supports account creation and security, display of shops and offers, matching clients and artisans, communications, orders, payments and delivery, support, abuse prevention and measurement of service performance.', 'The legal basis for each purpose (contract, pre-contract steps, legal obligation, legitimate interest or consent where required) must be determined and reviewed by the operator and qualified counsel before publication.'],
        },
        {
          title: 'Recipients and providers',
          paragraphs: ['Information necessary for a transaction or request is available to the involved parties and authorized team members responsible for validation, support, security or moderation. KYC documents are not intended for public display; private documents may be served through a temporary signed link.', 'Technical providers currently identified in configuration are Render (hosting/database), Cloudinary (media when enabled) and Brevo via SMTP (email when enabled). Mobile Money operators or carriers receive data only for features actually enabled. Provider agreements, subprocessors, processing regions and potential cross-border transfers must be confirmed before production.'],
        },
        {
          title: 'Retention periods',
          paragraphs: ['Exact retention periods are not defined in the product. They must be set and published by category: accounts, KYC documents, messages and attachments, order/accounting records, security logs, analytics events and backups. Also state deletion or archiving criteria and applicable legal exceptions.'],
        },
        {
          title: 'Security and contact preferences',
          paragraphs: ['ArtisanConnect uses access controls and technical safeguards, including password hashing and temporary links for some private documents. No service can guarantee absolute security; internal incident-handling procedures remain to be documented.', 'For a quote request, the client chooses a contact channel. A supplied WhatsApp number is shared with selected artisans only according to that preference.'],
        },
        {
          title: 'Requests and rights',
          paragraphs: ['You may contact the operator to request access to, correction or deletion of data, or to ask how it is used. Applicable rights, exceptions, identity checks, response times and supervisory authority must be confirmed under the law that applies.', 'Contact: [PRIVACY EMAIL OR ADDRESS TO BE COMPLETED].'],
        },
        {
          title: 'Local storage and trackers',
          paragraphs: ['The browser stores items needed for operation, including the sign-in session and language preference. A random identifier is also used to distinguish analytics sessions. The full inventory of cookies, local storage, third-party tools and consent rules must be checked before publication.'],
        },
        {
          title: 'Updates',
          paragraphs: ['Working version dated September 27, 2026. Before publication, replace all placeholders, confirm actual providers and retention periods, obtain review, state the effective date and keep a version history.'],
        },
      ],
    },
  },
  terms: {
    fr: {
      title: 'Conditions d’utilisation et de vente',
      intro: 'Brouillon décrivant les principaux parcours du produit. Les règles commerciales et responsabilités ci-dessous doivent être confirmées par l’exploitant et validées par un conseil avant publication.',
      sections: [
        {
          title: 'Service proposé',
          paragraphs: ['ArtisanConnect fournit des outils de présentation d’offres, de recherche, de mise en relation, de demande de devis, de communication et de suivi de certaines commandes. Le rôle juridique exact de la plateforme dans chaque transaction (intermédiaire, vendeur, mandataire ou autre) doit être déterminé avant publication.'],
        },
        {
          title: 'Compte et comportement',
          paragraphs: ['Les utilisateurs doivent fournir des informations exactes, protéger leurs identifiants et maintenir leurs coordonnées à jour. Les offres, photos, prix, disponibilités et délais doivent être sincères et autorisés. Les règles de contenu interdit, signalement, modération, suspension et recours doivent être complétées avec les procédures de l’exploitant.'],
        },
        {
          title: 'Offres, commandes et devis',
          paragraphs: ['Les détails d’une offre, sa disponibilité, son prix, son délai et les options de remise doivent être confirmés avant engagement. Pour une prestation sur devis, le périmètre, les livrables, le prix, les échéances et les conditions d’acceptation doivent être consignés clairement entre les parties.', 'Les annonces de démonstration ne sont pas des offres réelles et ne peuvent pas être commandées. Les retours à un état réel de la plateforme ne rendent pas rétroactivement réelles les anciennes données de démonstration.'],
        },
        {
          title: 'Paiement, frais et abonnements',
          paragraphs: ['Les moyens de paiement réellement disponibles sont ceux indiqués au moment du parcours. MoMo ou Orange Money peuvent rester en sandbox/mock; une simulation ne constitue pas un paiement réel. Pendant le pilote, les transactions réelles peuvent être convenues en espèces à la remise, selon les indications affichées.', 'Les frais de plateforme, commissions, prix d’abonnement, durée, renouvellement et règles de sponsoring applicables doivent être affichés avant achat et confirmés dans le plan commercial en vigueur. Aucune promesse de ventes, de visibilité ou de résultats n’est garantie.'],
        },
        {
          title: 'Livraison, annulation et remboursement',
          paragraphs: ['Avant chaque commande, les parties doivent convenir du lieu et du mode de remise, du coût, du délai et de la personne responsable. L’exploitant doit définir les procédures applicables en cas de retard, perte, dommage, indisponibilité, annulation, litige ou remboursement.', 'À compléter avant toute transaction réelle : qui encaisse et rembourse, délais et preuves exigées, transporteurs réellement couverts, traitement des réclamations, escalade et éventuels frais non remboursables.'],
        },
        {
          title: 'Avis, contenus et propriété intellectuelle',
          paragraphs: ['Les avis doivent refléter une expérience réelle et respecter les règles de publication. Chaque utilisateur reste responsable des contenus qu’il transmet et doit disposer des droits nécessaires sur les photos et documents. Les licences accordées à la plateforme, durées d’affichage, retrait de contenu et règles de réutilisation doivent être précisés avant publication.'],
        },
        {
          title: 'Disponibilité, responsabilité et droit applicable',
          paragraphs: ['La disponibilité du service, la maintenance, les limites de responsabilité, les événements hors contrôle, la procédure de réclamation, le droit applicable et la juridiction compétente doivent être rédigés et validés en fonction de l’entité exploitante et de son activité réelle.'],
        },
        {
          title: 'Contact et entrée en vigueur',
          paragraphs: ['Contact support : formulaire disponible sur ArtisanConnect. Date d’entrée en vigueur : [À COMPLÉTER APRÈS VALIDATION]. Version de travail datée du 27 septembre 2026; ne pas considérer cette version comme définitive.'],
        },
      ],
    },
    en: {
      title: 'Terms of use and sale',
      intro: 'Draft describing the product’s main workflows. The commercial rules and responsibilities below must be confirmed by the operator and reviewed by counsel before publication.',
      sections: [
        {
          title: 'Service provided',
          paragraphs: ['ArtisanConnect provides tools to present offers, search, connect, request quotes, communicate and track some orders. The platform’s exact legal role in each transaction (intermediary, seller, agent or other) must be determined before publication.'],
        },
        {
          title: 'Account and conduct',
          paragraphs: ['Users must provide accurate information, protect their credentials and keep contact details current. Offers, photos, prices, availability and timelines must be truthful and authorized. Rules for prohibited content, reporting, moderation, suspension and appeals must be completed to match the operator’s procedures.'],
        },
        {
          title: 'Offers, orders and quotes',
          paragraphs: ['Offer details, availability, price, timeline and handover options must be confirmed before commitment. For a quoted service, scope, deliverables, price, milestones and acceptance terms should be clearly recorded between the parties.', 'Demo listings are not real offers and cannot be ordered. Returning the platform to live mode does not retroactively turn old demo data into real offers.'],
        },
        {
          title: 'Payment, fees and subscriptions',
          paragraphs: ['Available payment methods are those shown during the relevant workflow. MoMo or Orange Money may remain in sandbox/mock; a simulation is not a real payment. During the pilot, real transactions may be agreed in cash at handover as indicated in the interface.', 'Applicable platform fees, commissions, subscription prices and duration, renewal and sponsorship rules must be shown before purchase and confirmed in the current commercial plan. No sales, visibility or outcome is guaranteed.'],
        },
        {
          title: 'Delivery, cancellation and refunds',
          paragraphs: ['Before each order, the parties should agree on handover location and method, cost, timing and responsible party. The operator must define procedures for delay, loss, damage, unavailability, cancellation, disputes and refunds.', 'Complete before any real transaction: who collects and refunds payment, deadlines and evidence required, carriers actually covered, complaint handling, escalation and any non-refundable fees.'],
        },
        {
          title: 'Reviews, content and intellectual property',
          paragraphs: ['Reviews must reflect a real experience and comply with publication rules. Each user is responsible for submitted content and must hold the necessary rights to photos and documents. Licences granted to the platform, display periods, content removal and reuse rules must be specified before publication.'],
        },
        {
          title: 'Availability, liability and applicable law',
          paragraphs: ['Service availability, maintenance, liability limits, events beyond control, complaint process, applicable law and competent jurisdiction must be drafted and reviewed based on the actual operating entity and activity.'],
        },
        {
          title: 'Contact and effective date',
          paragraphs: ['Support contact: the form available on ArtisanConnect. Effective date: [TO BE COMPLETED AFTER REVIEW]. Working version dated September 27, 2026; this version is not final.'],
        },
      ],
    },
  },
};
