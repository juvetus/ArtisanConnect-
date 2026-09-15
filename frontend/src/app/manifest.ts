import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ArtisanConnect',
    short_name: 'ArtisanConnect',
    description: 'Marketplace artisanale au Cameroun pour acheter des produits artisanaux et trouver des services d’artisans locaux.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fafaf9',
    theme_color: '#92400e',
    categories: ['shopping', 'business', 'lifestyle'],
    lang: 'fr-CM',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
