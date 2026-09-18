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

/** Quartiers de Yaoundé les plus recherchés (pilote). */
export const NEIGHBORHOODS: Record<string, string[]> = {
  yaounde: [
    'Bastos',
    'Mvan',
    'Mokolo',
    'Nlongkak',
    'Essos',
    'Mvog-Mbi',
    'Biyem-Assi',
    'Nsam',
    'Emana',
    'Odza',
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
