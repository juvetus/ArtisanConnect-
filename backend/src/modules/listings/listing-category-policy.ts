/** Mirror of the frontend category values; keep synchronized with frontend/src/lib/categories.ts. */
const PRODUCT_CATEGORIES = new Set([
  'vannerie', 'sculpture', 'poterie', 'tissage', 'perlerie', 'bronze', 'maroquinerie', 'mode',
  'cosmetiques', 'agroalimentaire', 'instruments', 'peinture', 'ameublement', 'vannerie_artisanale',
  'bois_sculpte', 'textile_traditionnel', 'bijoux_artisanaux', 'cuir_artisanal', 'poterie_artisanale',
  'art_mural', 'instruments_traditionnels', 'alimentation_locale', 'plats_prepares', 'fruits_legumes',
  'epices_condiments', 'boissons_locales', 'vetements_seconde_main', 'chaussures_accessoires',
  'cosmetiques_beaute', 'telephones_accessoires', 'electronique_occasion', 'articles_maison',
  'materiaux_construction', 'fournitures_scolaires', 'jouets', 'accessoires_auto_moto', 'produits_importes', 'autres_produits',
]);

const SERVICE_CATEGORIES = new Set([
  'couture', 'coiffure', 'menuiserie', 'maconnerie', 'plomberie', 'electricite', 'mecanique', 'froid',
  'reparation', 'traiteur', 'photographie', 'soudure', 'developpement', 'infrastructure', 'support_it',
  'cybersecurite', 'agriculture', 'elevage', 'pisciculture', 'transformation_agro', 'travaux_agricoles',
  'nettoyage', 'blanchisserie', 'jardinage', 'securite', 'nuisibles', 'architecture', 'renovation',
  'aluminium_vitrerie', 'solaire', 'forage', 'livraison', 'transport', 'vulcanisation', 'graphisme',
  'marketing_digital', 'redaction_traduction', 'impression', 'formation', 'evenementiel', 'sonorisation',
  'maquillage', 'serrurerie', 'electromenager', 'depannage_informatique', 'installation_internet', 'videosurveillance',
  'demenagement', 'montage_meubles', 'cuisine_a_domicile', 'garde_enfants', 'aide_a_domicile', 'repassage',
  'maintenance_groupes_electrogenes', 'autres_services',
]);

export function isListingCategoryAllowed(type: unknown, category: unknown): boolean {
  if (typeof category !== 'string') return false;
  if (type === 'product') return PRODUCT_CATEGORIES.has(category);
  if (type === 'service') return SERVICE_CATEGORIES.has(category);
  return false;
}