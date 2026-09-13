import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ArtisanConnect',
    short_name: 'ArtisanConnect',
    description: 'La place de marche des artisans, createurs et prestataires locaux au Cameroun.',
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
