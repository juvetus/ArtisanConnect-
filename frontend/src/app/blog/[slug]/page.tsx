import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getArticle, blogArticles } from '@/lib/blog';
import { BlogArticleContent } from '@/components/BlogArticleContent';

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

  return <BlogArticleContent article={article} />;
}