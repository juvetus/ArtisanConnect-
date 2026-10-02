import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import type { Listing, Review } from '@/lib/types';
import { formatXAF } from '@/lib/format';
import ListingDetailClient from './ListingDetailClient';

type PageProps = { params: Promise<{ id: string }> };

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artisanconnectcm.info';

export const dynamic = 'force-dynamic';

async function findListing(id: string): Promise<Listing | null> {
  try {
    return await api.listing(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await findListing(id);
  if (!listing) return { title: 'Annonce introuvable', robots: { index: false, follow: true } };

  const place = [listing.shop?.city, listing.shop?.neighborhood].filter(Boolean).join(', ');
  const title = `${listing.title} · ${formatXAF(listing.price)}${place ? ` à ${place}` : ''}`;
  const availability = listing.stock > 0 ? `${listing.stock} disponible(s)` : 'Rupture de stock';
  const description = `${listing.title} : ${formatXAF(listing.price)}, ${availability}.${place ? ` À ${place}.` : ''} ${listing.description}`.slice(0, 300);
  const image = listing.imageUrls?.[0] ?? listing.imageUrl;

  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/listings/${listing.id}` },
    ...(listing.isDemo ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: `${siteUrl}/listings/${listing.id}`, type: 'website', ...(image ? { images: [image] } : {}) },
  };
}

export default async function ListingPage({ params }: PageProps) {
  const { id } = await params;
  const listing = await findListing(id);
  if (!listing) return notFound();

  let rating: { average: number | null; count: number } = { average: null, count: 0 };
  let reviews: Review[] = [];
  if (listing.sellerId) {
    [rating, [reviews]] = await Promise.all([
      api.sellerRating(listing.sellerId).catch(() => ({ average: null, count: 0 })),
      api.sellerReviews(listing.sellerId).catch(() => [[], 0] as [Review[], number]),
    ]);
  }

  return <ListingDetailClient listing={listing} rating={rating} reviews={reviews} />;
}