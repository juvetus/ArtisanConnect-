import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getArticle, blogArticles } from '@/lib/blog';

export function generateStaticParams() {
  return blogArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = getArticle((await params).slug);
  if (!article) return {};
  return {
    title: `${article.title.fr} | ArtisanConnect`,
    description: article.excerpt.fr,
    keywords: article.keywords,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      title: article.title.fr,
      description: article.excerpt.fr,
      type: 'article',
      images: [{ url: article.coverImage, alt: article.coverAlt.fr }],
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = getArticle((await params).slug);
  if (!article) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/blog" className="text-sm font-semibold text-amber-800 hover:text-amber-950">← Retour au blog</Link>
      <div className="relative mt-8 aspect-[16/8] overflow-hidden bg-stone-200">
        <Image
          src={article.coverImage}
          alt={article.coverAlt.fr}
          fill
          priority
          sizes="(min-width: 768px) 768px, 100vw"
          className="object-cover"
        />
      </div>
      <header className="mt-8 border-b border-stone-200 pb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">{article.category.fr}</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-stone-950">{article.title.fr}</h1>
        <p className="mt-5 text-xl leading-8 text-stone-600">{article.excerpt.fr}</p>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-500">
          <span>{article.author}</span>
          <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleDateString('fr-FR')}</time>
          <span>{article.readingTime} min de lecture</span>
        </div>
      </header>
      <div className="prose mt-10 max-w-none text-stone-700">
        {article.sections.fr.map((section) => (
          <section key={section.heading} className="mb-9">
            <h2 className="text-2xl font-semibold text-stone-950">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 text-base leading-8">{paragraph}</p>)}
            {section.bullets ? <ul className="mt-4 list-disc space-y-2 pl-6 leading-7">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
          </section>
        ))}
      </div>
      <section className="mt-10 border-t border-stone-200 pt-6" aria-labelledby="article-sources">
        <h2 id="article-sources" className="text-lg font-semibold text-stone-950">Sources et ressources</h2>
        <ul className="mt-3 space-y-2 text-sm text-stone-600">
          {article.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer" className="text-amber-800 underline decoration-amber-300 underline-offset-2 hover:text-amber-950">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
      {article.featuredLink ? (
        <aside className="mt-6 border border-amber-200 bg-amber-50 p-5" aria-label="Ressource principale">
          <p className="text-sm font-semibold text-amber-950">Ressource officielle</p>
          <a href={article.featuredLink.url} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-amber-800 underline decoration-amber-300 underline-offset-2 hover:text-amber-950">
            {article.featuredLink.label.fr} →
          </a>
        </aside>
      ) : null}
      <footer className="border-t border-stone-200 pt-6 text-sm text-stone-600">
        Retrouvez des créations et des services locaux sur <Link href="/" className="font-semibold text-amber-800 hover:text-amber-950">ArtisanConnect</Link>.
      </footer>
    </article>
  );
}