/** Villes et quartiers utilisés pour la recherche locale et les URLs indexables. */
export const CITIES = [
  'Yaoundé',
  'Douala',
  'Bafoussam',
  'Bamenda',
  'Garoua',
  'Kribi',
  'Dschang',
  'Buea',
  'Maroua',
  'Ngaoundéré',
];

/** Quartiers courants proposés dans les filtres. La saisie artisan reste libre pour les autres quartiers. */
export const NEIGHBORHOODS: Record<string, string[]> = {
  yaounde: [
    'Anguissa',
    'Bastos',
    'Bata-Nlongkak',
    'Biyem-Assi',
    'Briqueterie',
    'Carrière',
    'Camp SIC Hippodrome',
    'Camp-Sonel',
    'Cité Verte',
    'Damas',
    'Ekounou',
    'Elig Edzoa',
    'Elig Essono',
    'Eleveur',
    'Emana',
    'Etoa-Meki',
    'Etoudi',
    'Etoug-Ebe',
    'Essos',
    'Kondengui',
    'Madagascar',
    'Mbankolo',
    'Mballa 2',
    'Melen',
    'Mendong',
    'Mimboman',
    'Mini-Ferme',
    'Mokolo',
    'Mvan',
    'Mvog Ada',
    'Mvog-Betsi',
    'Mvog-Mbi',
    'Mvolye',
    'Nkolbisson',
    'Nkol-Ewoue',
    'Nkol-Ndongo',
    'Nkom Kana',
    'Nkomo',
    'Nlongkak',
    'Ngoa-Ekele',
    'Ngousso',
    'Nsam',
    'Nyom',
    'Obili',
    'Obobogo',
    'Odza',
    'Olembé',
    'Olezoa',
    'Omnisports',
    'Oyom-Abang',
    'Santa Barbara',
    'Simbock',
    'Tam-Tam Weekend',
    'Tongolo',
    'Tsinga',
  ],
  douala: ['Akwa', 'Bonabéri', 'Deïdo', 'Bonamoussadi', 'New Bell', 'Makepe'],
};

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Retrouve le libellé accentué d'une ville ou d'un quartier à partir de son slug. */
export function labelFromSlug(slug: string): string {
  const known = [...CITIES, ...Object.values(NEIGHBORHOODS).flat()].find((value) => slugify(value) === slug);
  return known ?? slug.replace(/-/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}
