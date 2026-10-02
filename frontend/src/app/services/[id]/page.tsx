import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import type { Service, ServiceReview } from '@/lib/types';
import { formatXAF } from '@/lib/format';
import ServiceDetailClient from './ServiceDetailClient';

type PageProps = { params: Promise<{ id: string }> };

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artisanconnectcm.info';

export const dynamic = 'force-dynamic';

async function findService(id: string): Promise<Service | null> {
  try {
    return await api.getService(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const service = await findService(id);
  if (!service) return { title: 'Service introuvable | ArtisanConnect', robots: { index: false, follow: true } };

  const location = service.artisan?.location;
  const title = `${service.title}${location ? ` à ${location}` : ''} | ArtisanConnect`;
  const price = service.price
    ? formatXAF(service.price)
    : service.priceMin && service.priceMax
      ? `${formatXAF(service.priceMin)} – ${formatXAF(service.priceMax)}`
      : 'Sur devis';
  const description = `${service.title}${location ? ` à ${location}` : ''} : ${price}. ${service.description}`.slice(0, 300);

  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/services/${service.id}` },
    ...(service.isDemo ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, url: `${siteUrl}/services/${service.id}`, type: 'website', ...(service.fileUrls?.[0] ? { images: [service.fileUrls[0]] } : {}) },
  };
}

export default async function ServiceOrderPage({ params }: PageProps) {
  const { id } = await params;
  const service = await findService(id);
  if (!service) return notFound();

  let reviews: ServiceReview[] = [];
  try {
    [reviews] = await api.serviceReviews(service.id);
  } catch {
    reviews = [];
  }

  return <ServiceDetailClient service={service} reviews={reviews} />;
}