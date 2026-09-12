import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { blogArticles } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog | ArtisanConnect',
  description: 'Conseils, histoires et ressources pour les artisans, clients et coopératives du Cameroun.',
};

export default function BlogPage() {
  return (
    <div className="space-y-10">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">Le journal ArtisanConnect</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">Mieux acheter, mieux vendre, mieux transmettre</h1>
        <p className="mt-4 text-lg leading-8 text-stone-600">Des conseils concrets pour faire grandir l’artisanat local au Cameroun, en français et en anglais.</p>
      </header>

      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="Articles du blog">
        {blogArticles.map((article, index) => (
          <article key={article.slug} className={`flex flex-col border border-stone-200 bg-white p-6 ${index === 0 ? 'md:col-span-2 lg:col-span-2' : ''}`}>
            <Link href={`/blog/${article.slug}`} className="group relative -mx-6 -mt-6 mb-6 block aspect-[16/9] overflow-hidden bg-stone-200">
              <Image
                src={article.coverImage}
                alt={article.coverAlt.fr}
                fill
                priority={index === 0}
                sizes={index === 0 ? '(min-width: 1024px) 66vw, (min-width: 768px) 66vw, 100vw' : '(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw'}
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            </Link>
            <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-amber-700">
              <span>{article.category.fr}</span>
              <span className="text-stone-400">{article.readingTime} min</span>
            </div>
            <h2 className="mt-5 text-2xl font-semibold leading-tight text-stone-950">{article.title.fr}</h2>
            <p className="mt-3 flex-1 leading-7 text-stone-600">{article.excerpt.fr}</p>
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-stone-100 pt-4 text-sm">
              <time dateTime={article.publishedAt} className="text-stone-500">{new Date(article.publishedAt).toLocaleDateString('fr-FR')}</time>
              <Link href={`/blog/${article.slug}`} className="font-semibold text-amber-800 hover:text-amber-950">Lire l’article →</Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}