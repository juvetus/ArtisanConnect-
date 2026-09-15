'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { BlogArticle } from '@/lib/blog';
import { useLanguage } from '@/lib/language-context';

export function BlogArticleContent({ article }: { article: BlogArticle }) {
  const { language } = useLanguage();
  const hasAiWatermark = article.coverImage.includes('/Copilot_');
  const sections = article.sections[language];
  const copy = language === 'en'
    ? {
        back: '<- Back to blog',
        reading: 'min read',
        sources: 'Sources and resources',
        official: 'Official resource',
        footer: 'Find local creations and services on',
        home: 'ArtisanConnect',
      }
    : {
        back: '<- Retour au blog',
        reading: 'min de lecture',
        sources: 'Sources et ressources',
        official: 'Ressource officielle',
        footer: 'Retrouvez des créations et des services locaux sur',
        home: 'ArtisanConnect',
      };

  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/blog" className="text-sm font-semibold text-amber-800 hover:text-amber-950">{copy.back}</Link>
      <div className="relative mt-8 aspect-[16/8] overflow-hidden bg-stone-200">
        <Image src={article.coverImage} alt={article.coverAlt[language]} fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
        {hasAiWatermark ? <span aria-hidden className="pointer-events-none absolute right-[1%] top-[1%] h-[8%] w-[17%] rounded-full bg-stone-900/95" /> : null}
      </div>
      <header className="mt-8 border-b border-stone-200 pb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">{article.category[language]}</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-stone-950">{article.title[language]}</h1>
        <p className="mt-5 text-xl leading-8 text-stone-600">{article.excerpt[language]}</p>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-500">
          <span>{article.author}</span>
          <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}</time>
          <span>{article.readingTime} {copy.reading}</span>
        </div>
      </header>
      <div className="prose mt-10 max-w-none text-stone-700">
        {sections.map((section) => (
          <section key={section.heading} className="mb-9">
            <h2 className="text-2xl font-semibold text-stone-950">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 text-base leading-8">{paragraph}</p>)}
            {section.bullets ? <ul className="mt-4 list-disc space-y-2 pl-6 leading-7">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
          </section>
        ))}
      </div>
      <section className="mt-10 border-t border-stone-200 pt-6" aria-labelledby="article-sources">
        <h2 id="article-sources" className="text-lg font-semibold text-stone-950">{copy.sources}</h2>
        <ul className="mt-3 space-y-2 text-sm text-stone-600">
          {article.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="text-amber-800 underline decoration-amber-300 underline-offset-2 hover:text-amber-950">{source.label}</a></li>)}
        </ul>
      </section>
      {article.featuredLink ? <aside className="mt-6 border border-amber-200 bg-amber-50 p-5" aria-label={copy.official}>
        <p className="text-sm font-semibold text-amber-950">{copy.official}</p>
        <a href={article.featuredLink.url} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-amber-800 underline decoration-amber-300 underline-offset-2 hover:text-amber-950">{article.featuredLink.label[language]} -&gt;</a>
      </aside> : null}
      <footer className="border-t border-stone-200 pt-6 text-sm text-stone-600">
        {copy.footer} <Link href="/" className="font-semibold text-amber-800 hover:text-amber-950">{copy.home}</Link>.
      </footer>
    </article>
  );
}
