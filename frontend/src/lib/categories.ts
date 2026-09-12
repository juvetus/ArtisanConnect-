import type { ListingType } from './types';
import type { Language } from './i18n';

export interface Category {
  value: string;
  labelFr: string;
  labelEn: string;
  label?: string;
  icon: string;
  type: ListingType;
}

/** Métiers d'art et services artisanaux courants au Cameroun (bilingue FR / EN). */
export const CATEGORIES: Category[] = [
  // Artisanat d'art et produits
  { value: 'vannerie', labelFr: 'Vannerie & nattes', labelEn: 'Basketry & mats', icon: '🧺', type: 'product' },
  { value: 'sculpture', labelFr: 'Sculpture sur bois', labelEn: 'Wood carving', icon: '🗿', type: 'product' },
  { value: 'poterie', labelFr: 'Poterie & terre cuite', labelEn: 'Pottery & ceramics', icon: '🏺', type: 'product' },
  { value: 'tissage', labelFr: 'Tissage & pagne (toghu, ndop)', labelEn: 'Weaving & traditional cloth (toghu, ndop)', icon: '🧵', type: 'product' },
  { value: 'perlerie', labelFr: 'Perlerie & bijoux', labelEn: 'Beadwork & jewelry', icon: '📿', type: 'product' },
  { value: 'bronze', labelFr: 'Bronze & dinanderie', labelEn: 'Bronze & metalwork', icon: '🪔', type: 'product' },
  { value: 'maroquinerie', labelFr: 'Maroquinerie & cuir', labelEn: 'Leather goods', icon: '👜', type: 'product' },
  { value: 'mode', labelFr: 'Mode & prêt-à-porter', labelEn: 'Fashion & apparel', icon: '👗', type: 'product' },
  { value: 'cosmetiques', labelFr: 'Savons & huiles naturelles', labelEn: 'Natural soaps & oils', icon: '🧼', type: 'product' },
  { value: 'agroalimentaire', labelFr: 'Miel, épices & cacao', labelEn: 'Honey, spices & cocoa', icon: '🍯', type: 'product' },
  { value: 'instruments', labelFr: 'Instruments (balafon, tam-tam)', labelEn: 'Musical instruments (balafon, drum)', icon: '🥁', type: 'product' },
  { value: 'peinture', labelFr: 'Peinture & arts plastiques', labelEn: 'Painting & visual arts', icon: '🎨', type: 'product' },
  { value: 'ameublement', labelFr: 'Meubles & décoration', labelEn: 'Furniture & home decor', icon: '🪑', type: 'product' },
  { value: 'vannerie_artisanale', labelFr: 'Paniers & objets en fibres', labelEn: 'Woven baskets & fiber crafts', icon: '🧺', type: 'product' },
  { value: 'bois_sculpte', labelFr: 'Objets en bois sculpté', labelEn: 'Carved wooden artifacts', icon: '🪵', type: 'product' },
  { value: 'textile_traditionnel', labelFr: 'Textile traditionnel & broderie', labelEn: 'Traditional textiles & embroidery', icon: '🧶', type: 'product' },
  { value: 'bijoux_artisanaux', labelFr: 'Bijoux artisanaux', labelEn: 'Handmade jewelry', icon: '💍', type: 'product' },
  { value: 'cuir_artisanal', labelFr: 'Sacs, chaussures & cuir', labelEn: 'Handmade leather shoes & bags', icon: '👞', type: 'product' },
  { value: 'poterie_artisanale', labelFr: 'Poterie artisanale', labelEn: 'Artisanal pottery', icon: '🏺', type: 'product' },
  { value: 'art_mural', labelFr: 'Art mural & décoration', labelEn: 'Wall art & decor', icon: '🖼️', type: 'product' },
  { value: 'instruments_traditionnels', labelFr: 'Instruments traditionnels', labelEn: 'Traditional instruments', icon: '🥁', type: 'product' },
  { value: 'alimentation_locale', labelFr: 'Produits alimentaires locaux', labelEn: 'Local food & agricultural produce', icon: '🍠', type: 'product' },
  { value: 'plats_prepares', labelFr: 'Plats préparés & street food', labelEn: 'Prepared meals & street food', icon: '🍛', type: 'product' },
  { value: 'fruits_legumes', labelFr: 'Fruits & légumes', labelEn: 'Fresh fruits & vegetables', icon: '🍅', type: 'product' },
  { value: 'epices_condiments', labelFr: 'Épices & condiments', labelEn: 'Spices & seasonings', icon: '🌶️', type: 'product' },
  { value: 'boissons_locales', labelFr: 'Boissons locales', labelEn: 'Local juices & drinks', icon: '🧃', type: 'product' },
  { value: 'vetements_seconde_main', labelFr: 'Vêtements & friperie', labelEn: 'Apparel & thrift clothing', icon: '👚', type: 'product' },
  { value: 'chaussures_accessoires', labelFr: 'Chaussures & accessoires', labelEn: 'Shoes & accessories', icon: '👜', type: 'product' },
  { value: 'cosmetiques_beaute', labelFr: 'Cosmétiques & produits de beauté', labelEn: 'Beauty & cosmetics', icon: '🧴', type: 'product' },
  { value: 'telephones_accessoires', labelFr: 'Téléphones & accessoires', labelEn: 'Phones & accessories', icon: '📱', type: 'product' },
  { value: 'electronique_occasion', labelFr: 'Électronique & appareils d’occasion', labelEn: 'Electronics & appliances', icon: '🔌', type: 'product' },
  { value: 'articles_maison', labelFr: 'Articles ménagers', labelEn: 'Household goods', icon: '🏠', type: 'product' },
  { value: 'materiaux_construction', labelFr: 'Matériaux de construction', labelEn: 'Building materials', icon: '🧱', type: 'product' },
  { value: 'fournitures_scolaires', labelFr: 'Fournitures scolaires & bureau', labelEn: 'School & office supplies', icon: '📚', type: 'product' },
  { value: 'jouets', labelFr: 'Jouets & articles enfants', labelEn: 'Toys & kids items', icon: '🧸', type: 'product' },
  { value: 'accessoires_auto_moto', labelFr: 'Accessoires auto & moto', labelEn: 'Auto & motorbike accessories', icon: '🛞', type: 'product' },
  { value: 'produits_importes', labelFr: 'Produits importés & divers', labelEn: 'Imported products & sundry', icon: '🛍️', type: 'product' },

  // Services
  { value: 'couture', labelFr: 'Couture sur mesure', labelEn: 'Custom tailoring & sewing', icon: '✂️', type: 'service' },
  { value: 'coiffure', labelFr: 'Coiffure & tresses', labelEn: 'Hair styling & braiding', icon: '💇🏾', type: 'service' },
  { value: 'menuiserie', labelFr: 'Menuiserie', labelEn: 'Carpentry & woodwork', icon: '🪚', type: 'service' },
  { value: 'maconnerie', labelFr: 'Maçonnerie & carrelage', labelEn: 'Masonry & tiling', icon: '🧱', type: 'service' },
  { value: 'plomberie', labelFr: 'Plomberie', labelEn: 'Plumbing', icon: '🔧', type: 'service' },
  { value: 'electricite', labelFr: 'Électricité bâtiment', labelEn: 'Electrical installation', icon: '💡', type: 'service' },
  { value: 'mecanique', labelFr: 'Mécanique & moto', labelEn: 'Auto & motorbike repair', icon: '🛵', type: 'service' },
  { value: 'froid', labelFr: 'Froid & climatisation', labelEn: 'HVAC & refrigeration', icon: '❄️', type: 'service' },
  { value: 'reparation', labelFr: 'Réparation électronique', labelEn: 'Electronics repair', icon: '📱', type: 'service' },
  { value: 'traiteur', labelFr: 'Traiteur & pâtisserie', labelEn: 'Catering & bakery', icon: '🍲', type: 'service' },
  { value: 'photographie', labelFr: 'Photo & vidéo', labelEn: 'Photo & video coverage', icon: '📷', type: 'service' },
  { value: 'soudure', labelFr: 'Soudure & ferronnerie', labelEn: 'Welding & metal craft', icon: '⚙️', type: 'service' },
  { value: 'developpement', labelFr: 'Développement web & mobile', labelEn: 'Web & mobile development', icon: '💻', type: 'service' },
  { value: 'infrastructure', labelFr: 'Infrastructure & réseaux', labelEn: 'IT networks & infrastructure', icon: '🖧', type: 'service' },
  { value: 'support_it', labelFr: 'Support informatique', labelEn: 'IT support & troubleshooting', icon: '🛠️', type: 'service' },
  { value: 'cybersecurite', labelFr: 'Cybersécurité', labelEn: 'Cybersecurity', icon: '🔐', type: 'service' },
  { value: 'agriculture', labelFr: 'Agriculture & maraîchage', labelEn: 'Farming & gardening', icon: '🌱', type: 'service' },
  { value: 'elevage', labelFr: 'Élevage', labelEn: 'Livestock & poultry', icon: '🐔', type: 'service' },
  { value: 'pisciculture', labelFr: 'Pisciculture', labelEn: 'Fish farming', icon: '🐟', type: 'service' },
  { value: 'transformation_agro', labelFr: 'Transformation agroalimentaire', labelEn: 'Food processing', icon: '🌾', type: 'service' },
  { value: 'travaux_agricoles', labelFr: 'Travaux agricoles & matériel', labelEn: 'Agricultural machinery & work', icon: '🚜', type: 'service' },
  { value: 'nettoyage', labelFr: 'Nettoyage & entretien', labelEn: 'Cleaning & maintenance', icon: '🧹', type: 'service' },
  { value: 'blanchisserie', labelFr: 'Blanchisserie & pressing', labelEn: 'Laundry & dry cleaning', icon: '🧺', type: 'service' },
  { value: 'jardinage', labelFr: 'Jardinage & espaces verts', labelEn: 'Landscaping & gardening', icon: '🌳', type: 'service' },
  { value: 'securite', labelFr: 'Gardiennage & sécurité', labelEn: 'Security & guarding', icon: '🛡️', type: 'service' },
  { value: 'nuisibles', labelFr: 'Désinfection & nuisibles', labelEn: 'Pest control & sanitation', icon: '🧴', type: 'service' },
  { value: 'architecture', labelFr: 'Architecture & plans', labelEn: 'Architecture & drafting', icon: '📐', type: 'service' },
  { value: 'renovation', labelFr: 'Rénovation bâtiment', labelEn: 'Building renovation', icon: '🏗️', type: 'service' },
  { value: 'aluminium_vitrerie', labelFr: 'Aluminium & vitrerie', labelEn: 'Aluminium & glazing', icon: '🪟', type: 'service' },
  { value: 'solaire', labelFr: 'Énergie solaire', labelEn: 'Solar energy installation', icon: '☀️', type: 'service' },
  { value: 'forage', labelFr: 'Forage & adduction d’eau', labelEn: 'Borehole & water supply', icon: '🚰', type: 'service' },
  { value: 'livraison', labelFr: 'Livraison à moto', labelEn: 'Motorbike delivery', icon: '📦', type: 'service' },
  { value: 'transport', labelFr: 'Transport de personnes & marchandises', labelEn: 'Passenger & cargo transport', icon: '🚚', type: 'service' },
  { value: 'vulcanisation', labelFr: 'Pneus & vulcanisation', labelEn: 'Tire repair & vulcanization', icon: '🛞', type: 'service' },
  { value: 'graphisme', labelFr: 'Graphisme & identité visuelle', labelEn: 'Graphic design & branding', icon: '🎨', type: 'service' },
  { value: 'marketing_digital', labelFr: 'Marketing digital', labelEn: 'Digital marketing', icon: '📣', type: 'service' },
  { value: 'redaction_traduction', labelFr: 'Rédaction & traduction', labelEn: 'Copywriting & translation', icon: '✍️', type: 'service' },
  { value: 'impression', labelFr: 'Impression & sérigraphie', labelEn: 'Printing & silkscreen', icon: '🖨️', type: 'service' },
  { value: 'formation', labelFr: 'Formation & cours particuliers', labelEn: 'Tutoring & vocational training', icon: '🎓', type: 'service' },
  { value: 'evenementiel', labelFr: 'Organisation d’événements', labelEn: 'Event planning & logistics', icon: '🎉', type: 'service' },
  { value: 'sonorisation', labelFr: 'Animation & sonorisation', labelEn: 'Sound & audio animation', icon: '🎤', type: 'service' },
  { value: 'maquillage', labelFr: 'Maquillage professionnel', labelEn: 'Professional makeup artistry', icon: '💄', type: 'service' },
];

const BY_VALUE = new Map(CATEGORIES.map((c) => [c.value, c]));

export function categoryLabel(value: string, lang: Language = 'fr') {
  const cat = BY_VALUE.get(value);
  if (!cat) return value;
  return lang === 'en' ? cat.labelEn : cat.labelFr;
}

export function categoryIcon(value: string, type: ListingType) {
  return BY_VALUE.get(value)?.icon ?? (type === 'service' ? '🛠️' : '🏺');
}

export const PRODUCT_CATEGORIES = CATEGORIES.filter((c) => c.type === 'product');
export const SERVICE_CATEGORIES = CATEGORIES.filter((c) => c.type === 'service');

