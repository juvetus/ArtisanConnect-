'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { blogArticles } from '@/lib/blog';
import { useLanguage } from '@/lib/language-context';

type BlogAudience = 'clients' | 'artisans' | 'crafts';

const CLIENT_ARTICLES = new Set([
  'acheter-artisanat-local-cameroun-guide',
  'orange-money-commande-artisan-cameroun',
  'femmes-artisanes-cooperatives-cameroun',
  'livrer-commandes-artisanales-douala-yaounde',
]);

const ARTISAN_ARTICLES = new Set([
  'vendre-artisanat-en-ligne-cameroun',
  'fixer-prix-produit-artisanal-cameroun',
  'photos-produits-artisanaux-whatsapp-cameroun',
  'formaliser-atelier-artisan-cameroun',
  'cooperative-artisanale-catalogue-numerique-cameroun',
  'appels-projets-artisans-cameroun-preparer-dossier',
  'avantages-formalisation-artisan-cameroun',
  'kribi-formation-teinture-artisanale-couturieres-tailleurs',
  'participation-selection-recompenses-artisans-cameroun',
]);

function audienceForArticle(slug: string): BlogAudience {
  if (CLIENT_ARTICLES.has(slug)) return 'clients';
  if (ARTISAN_ARTICLES.has(slug)) return 'artisans';
  return 'crafts';
}

export function BlogIndexContent() {
  const { language } = useLanguage();
  const [audience, setAudience] = useState<BlogAudience>('clients');
  const copy = language === 'en'
    ? {
        eyebrow: 'The ArtisanConnect journal',
        title: 'Find the right artisan. Grow your craft business.',
        description: 'Practical guides for customers, artisans and everyone curious about Cameroonian crafts.',
        aria: 'Blog articles',
        read: 'Read article ->',
        audiences: [
          { id: 'clients' as const, label: 'For customers', description: 'Find artisans, compare offers and buy local.' },
          { id: 'artisans' as const, label: 'For artisans', description: 'Attract customers and grow your activity.' },
          { id: 'crafts' as const, label: 'Cameroonian crafts', description: 'Discover skills, communities and craft events.' },
        ],
        ctas: {
          clients: { label: 'Find an artisan', href: '/trouver-un-artisan' },
          artisans: { label: 'Explore the artisan space', href: '/artisans' },
          crafts: { label: 'Explore local creations', href: '/annonces' },
        },
        empty: 'New guides are on the way.',
      }
    : {
        eyebrow: 'Le journal ArtisanConnect',
        title: 'Trouvez le bon artisan. Faites grandir votre activité.',
        description: 'Des guides pratiques pour les clients, les artisans et tous ceux qui s’intéressent à l’artisanat camerounais.',
        aria: 'Articles du blog',
        read: 'Lire l’article ->',
        audiences: [
          { id: 'clients' as const, label: 'Pour les clients', description: 'Trouver un artisan, comparer et acheter local.' },
          { id: 'artisans' as const, label: 'Pour les artisans', description: 'Attirer des clients et développer son activité.' },
          { id: 'crafts' as const, label: 'Artisanat camerounais', description: 'Découvrir les savoir-faire, communautés et événements.' },
        ],
        ctas: {
          clients: { label: 'Trouver un artisan', href: '/trouver-un-artisan' },
          artisans: { label: 'Découvrir l’espace artisan', href: '/artisans' },
          crafts: { label: 'Explorer les créations locales', href: '/annonces' },
        },
        empty: 'De nouveaux guides arrivent bientôt.',
      };

  const visibleArticles = blogArticles.filter((article) => audienceForArticle(article.slug) === audience);
  const audienceCta = copy.ctas[audience];

  return (
    <div className="space-y-10">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">{copy.eyebrow}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">{copy.title}</h1>
        <p className="mt-4 text-lg leading-8 text-stone-600">{copy.description}</p>
      </header>

      <nav aria-label={language === 'en' ? 'Blog topics' : 'Thèmes du blog'} className="grid gap-2 border-y border-stone-200 py-3 sm:grid-cols-3">
        {copy.audiences.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={audience === item.id}
            onClick={() => setAudience(item.id)}
            className={`min-h-16 rounded-md px-4 py-3 text-left transition ${audience === item.id ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'}`}
          >
            <span className="block font-semibold">{item.label}</span>
            <span className={`mt-1 block text-sm ${audience === item.id ? 'text-stone-200' : 'text-stone-500'}`}>{item.description}</span>
          </button>
        ))}
      </nav>

      <div className="flex justify-end">
        <Link href={audienceCta.href} className="rounded-md bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800">
          {audienceCta.label} →
        </Link>
      </div>

      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label={copy.aria}>
        {visibleArticles.length ? visibleArticles.map((article, index) => (
          <article key={article.slug} className={`flex flex-col border border-stone-200 bg-white p-6 ${index === 0 ? 'md:col-span-2 lg:col-span-2' : ''}`}>
            <Link href={`/blog/${article.slug}`} className="group relative -mx-6 -mt-6 mb-6 block aspect-[16/9] overflow-hidden bg-stone-200">
              <Image src={article.coverImage} alt={article.coverAlt[language]} fill priority={index === 0} sizes={index === 0 ? '(min-width: 1024px) 66vw, (min-width: 768px) 66vw, 100vw' : '(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw'} className="object-cover transition duration-500 group-hover:scale-105" />
              {article.coverImage.includes('/Copilot_') ? <span aria-hidden className="pointer-events-none absolute right-[1%] top-[1%] h-[8%] w-[17%] rounded-full bg-stone-900/95" /> : null}
            </Link>
            <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-amber-700">
              <span>{article.category[language]}</span>
              <span className="text-stone-400">{article.readingTime} min</span>
            </div>
            <h2 className="mt-5 text-2xl font-semibold leading-tight text-stone-950">{article.title[language]}</h2>
            <p className="mt-3 flex-1 leading-7 text-stone-600">{article.excerpt[language]}</p>
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-stone-100 pt-4 text-sm">
              <time dateTime={article.publishedAt} className="text-stone-500">{new Date(article.publishedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}</time>
              <Link href={`/blog/${article.slug}`} className="font-semibold text-amber-800 hover:text-amber-950">{copy.read}</Link>
            </div>
          </article>
        )) : <p className="text-sm text-stone-600">{copy.empty}</p>}
      </section>
    </div>
  );
}
