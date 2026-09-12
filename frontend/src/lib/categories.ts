import type { ListingType } from './types';

export interface Category {
  value: string;
  label: string;
  icon: string;
  type: ListingType;
}

/** Métiers d'art et services artisanaux courants au Cameroun. */
export const CATEGORIES: Category[] = [
  // Artisanat d'art et produits
  { value: 'vannerie', label: 'Vannerie & nattes', icon: '🧺', type: 'product' },
  { value: 'sculpture', label: 'Sculpture sur bois', icon: '🗿', type: 'product' },
  { value: 'poterie', label: 'Poterie & terre cuite', icon: '🏺', type: 'product' },
  { value: 'tissage', label: 'Tissage & pagne (toghu, ndop)', icon: '🧵', type: 'product' },
  { value: 'perlerie', label: 'Perlerie & bijoux', icon: '📿', type: 'product' },
  { value: 'bronze', label: 'Bronze & dinanderie', icon: '🪔', type: 'product' },
  { value: 'maroquinerie', label: 'Maroquinerie & cuir', icon: '👜', type: 'product' },
  { value: 'mode', label: 'Mode & prêt-à-porter', icon: '👗', type: 'product' },
  { value: 'cosmetiques', label: 'Savons & huiles naturelles', icon: '🧼', type: 'product' },
  { value: 'agroalimentaire', label: 'Miel, épices & cacao', icon: '🍯', type: 'product' },
  { value: 'instruments', label: 'Instruments (balafon, tam-tam)', icon: '🥁', type: 'product' },
  { value: 'peinture', label: 'Peinture & arts plastiques', icon: '🎨', type: 'product' },
  { value: 'ameublement', label: 'Meubles & décoration', icon: '🪑', type: 'product' },

  // Services
  { value: 'couture', label: 'Couture sur mesure', icon: '✂️', type: 'service' },
  { value: 'coiffure', label: 'Coiffure & tresses', icon: '💇🏾', type: 'service' },
  { value: 'menuiserie', label: 'Menuiserie', icon: '🪚', type: 'service' },
  { value: 'maconnerie', label: 'Maçonnerie & carrelage', icon: '🧱', type: 'service' },
  { value: 'plomberie', label: 'Plomberie', icon: '🔧', type: 'service' },
  { value: 'electricite', label: 'Électricité bâtiment', icon: '💡', type: 'service' },
  { value: 'mecanique', label: 'Mécanique & moto', icon: '🛵', type: 'service' },
  { value: 'froid', label: 'Froid & climatisation', icon: '❄️', type: 'service' },
  { value: 'reparation', label: 'Réparation électronique', icon: '📱', type: 'service' },
  { value: 'traiteur', label: 'Traiteur & pâtisserie', icon: '🍲', type: 'service' },
  { value: 'photographie', label: 'Photo & vidéo', icon: '📷', type: 'service' },
  { value: 'soudure', label: 'Soudure & ferronnerie', icon: '⚙️', type: 'service' },
];

const BY_VALUE = new Map(CATEGORIES.map((c) => [c.value, c]));

export function categoryLabel(value: string) {
  return BY_VALUE.get(value)?.label ?? value;
}

export function categoryIcon(value: string, type: ListingType) {
  return BY_VALUE.get(value)?.icon ?? (type === 'service' ? '🛠️' : '🏺');
}

export const PRODUCT_CATEGORIES = CATEGORIES.filter((c) => c.type === 'product');
export const SERVICE_CATEGORIES = CATEGORIES.filter((c) => c.type === 'service');
