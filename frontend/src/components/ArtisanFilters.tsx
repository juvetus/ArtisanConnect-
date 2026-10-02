'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { SERVICE_CATEGORIES, PRODUCT_CATEGORIES, categoryGroups, categoryLabel } from '@/lib/categories';
import { CITIES, NEIGHBORHOODS, slugify } from '@/lib/locations';
import { useLanguage } from '@/lib/language-context';

export function ArtisanFilters({
  category,
  city,
  neighborhood,
  verified,
  minRating,
  availability,
  maxPrice,
  maxResponseMinutes,
  distanceKm,
  latitude,
  longitude,
  query,
}: {
  category?: string;
  city?: string;
  neighborhood?: string;
  verified: boolean;
  minRating: number;
  availability?: 'available' | 'busy' | 'unavailable';
  maxPrice?: number;
  maxResponseMinutes?: number;
  distanceKm?: number;
  latitude?: number;
  longitude?: number;
  query?: string;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const english = language === 'en';
  const [draftQuery, setDraftQuery] = useState(query ?? '');
  const [locationError, setLocationError] = useState('');
  // Les villes proposées viennent des boutiques réelles ; la liste statique sert de repli.
  const { data: locations } = useSWR('public-locations', api.publicLocations);

  const navigate = (next: {
    category?: string;
    city?: string;
    neighborhood?: string;
    verified?: boolean;
    minRating?: number;
    availability?: 'available' | 'busy' | 'unavailable' | '';
    maxPrice?: number;
    maxResponseMinutes?: number;
    latitude?: number;
    longitude?: number;
    distanceKm?: number;
    q?: string;
  }) => {
    const nextCategory = next.category ?? category;
    const nextCity = next.city ?? city;
    const nextNeighborhood = next.neighborhood ?? neighborhood;
    const segments = [nextCategory, nextCity && slugify(nextCity)].filter(Boolean);

    const params = new URLSearchParams();
    if (nextNeighborhood) params.set('quartier', slugify(nextNeighborhood));
    if (next.verified ?? verified) params.set('verifie', '1');
    const rating = next.minRating ?? minRating;
    if (rating) params.set('note', String(rating));
    const search = next.q ?? query;
    if (search) params.set('q', search);
    const selectedAvailability = next.availability ?? availability;
    if (selectedAvailability) params.set('disponibilite', selectedAvailability);
    const selectedMaxPrice = next.maxPrice ?? maxPrice;
    if (selectedMaxPrice) params.set('prixMax', String(selectedMaxPrice));
    const selectedMaxResponse = next.maxResponseMinutes ?? maxResponseMinutes;
    if (selectedMaxResponse) params.set('reponseMax', String(selectedMaxResponse));
    const selectedDistance = next.distanceKm ?? distanceKm;
    if (selectedDistance) {
      params.set('distanceKm', String(selectedDistance));
      const selectedLatitude = next.latitude ?? latitude;
      const selectedLongitude = next.longitude ?? longitude;
      if (selectedLatitude !== undefined && selectedLongitude !== undefined) {
        params.set('lat', String(selectedLatitude));
        params.set('lon', String(selectedLongitude));
      }
    }

    const suffix = params.toString();
    router.push(`/trouver-un-artisan${segments.length ? `/${segments.join('/')}` : ''}${suffix ? `?${suffix}` : ''}`);
  };

  const selectDistance = (value: string) => {
    const radius = Number(value);
    if (!radius) {
      navigate({ distanceKm: 0 });
      return;
    }
    if (!navigator.geolocation) {
      setLocationError(english ? 'Your browser does not support location access.' : 'Votre navigateur ne permet pas la géolocalisation.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationError('');
        navigate({
          distanceKm: radius,
          latitude: Math.round(position.coords.latitude * 100) / 100,
          longitude: Math.round(position.coords.longitude * 100) / 100,
        });
      },
      () => setLocationError(english ? 'Location access is needed to filter by distance.' : 'La géolocalisation est nécessaire pour filtrer par distance.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const availableCities = locations?.length ? locations.map((item) => item.label) : CITIES;
  const cityKey = city ? slugify(city) : '';
  const matchedCity = locations?.find((item) => slugify(item.label) === cityKey);
  const availableNeighborhoods = matchedCity?.neighborhoods.length
    ? matchedCity.neighborhoods.map((item) => item.label)
    : NEIGHBORHOODS[cityKey] ?? [];

  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          navigate({ q: draftQuery });
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
          aria-label={english ? 'Search for an artisan, trade or neighborhood' : 'Rechercher un artisan, un métier ou un quartier'}
          placeholder={english ? 'Plumber in Bastos, carpenter, tailoring...' : 'Plombier à Bastos, menuisier, couture…'}
          className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
        />
        <button type="submit" className="rounded-md bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-800">
          {english ? 'Search' : 'Rechercher'}
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium text-stone-700">
          {english ? 'Trade' : 'Métier'}
          <select
            value={category ?? ''}
            onChange={(event) => navigate({ category: event.target.value })}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
          >
            <option value="">{english ? 'All trades' : 'Tous les métiers'}</option>
            {[...categoryGroups(SERVICE_CATEGORIES), ...categoryGroups(PRODUCT_CATEGORIES)].map((group) => (
              <optgroup key={group.key} label={english ? group.labelEn : group.labelFr}>
                {group.categories.map((item) => (
                  <option key={item.value} value={item.value}>{categoryLabel(item.value, language)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-stone-700">
          {english ? 'City' : 'Ville'}
          <select
            value={city ?? ''}
            onChange={(event) => navigate({ city: event.target.value, neighborhood: '' })}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
          >
            <option value="">{english ? 'All cities' : 'Toutes les villes'}</option>
            {availableCities.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-stone-700">
          {english ? 'Neighborhood' : 'Quartier'}
          <select
            value={neighborhood ?? ''}
            onChange={(event) => navigate({ neighborhood: event.target.value })}
            disabled={!availableNeighborhoods.length}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600 disabled:bg-stone-100"
          >
            <option value="">{english ? 'All neighborhoods' : 'Tous les quartiers'}</option>
            {availableNeighborhoods.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-stone-700">
          {english ? 'Minimum rating' : 'Note minimale'}
          <select
            value={String(minRating)}
            onChange={(event) => navigate({ minRating: Number(event.target.value) })}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
          >
            <option value="0">{english ? 'All ratings' : 'Toutes les notes'}</option>
            <option value="3">{english ? '3 ★ and above' : '3 ★ et plus'}</option>
            <option value="4">{english ? '4 ★ and above' : '4 ★ et plus'}</option>
            <option value="4.5">{english ? '4.5 ★ and above' : '4,5 ★ et plus'}</option>
          </select>
        </label>

        <label className="text-sm font-medium text-stone-700">
          {english ? 'Availability' : 'Disponibilité'}
          <select
            value={availability ?? ''}
            onChange={(event) => navigate({ availability: event.target.value as 'available' | 'busy' | 'unavailable' | '' })}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
          >
            <option value="">{english ? 'Any availability' : 'Toutes disponibilités'}</option>
            <option value="available">{english ? 'Available' : 'Disponible'}</option>
            <option value="busy">{english ? 'Busy' : 'Occupé'}</option>
            <option value="unavailable">{english ? 'Unavailable' : 'Indisponible'}</option>
          </select>
        </label>

        <label className="text-sm font-medium text-stone-700">
          {english ? 'Indicative price' : 'Prix indicatif'}
          <select
            value={String(maxPrice ?? '')}
            onChange={(event) => navigate({ maxPrice: Number(event.target.value) || 0 })}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
          >
            <option value="">{english ? 'Any price' : 'Tous les tarifs'}</option>
            {[10000, 25000, 50000, 100000].map((price) => <option key={price} value={price}>{english ? 'Up to' : 'Jusqu’à'} {price.toLocaleString(english ? 'en-CM' : 'fr-CM')} FCFA</option>)}
          </select>
        </label>

        <label className="text-sm font-medium text-stone-700">
          {english ? 'Response time' : 'Temps de réponse'}
          <select
            value={String(maxResponseMinutes ?? '')}
            onChange={(event) => navigate({ maxResponseMinutes: Number(event.target.value) || 0 })}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
          >
            <option value="">{english ? 'Any response time' : 'Tous les délais'}</option>
            <option value="60">{english ? 'Within 1 hour' : 'En moins d’une heure'}</option>
            <option value="360">{english ? 'Within 6 hours' : 'En moins de 6 heures'}</option>
            <option value="1440">{english ? 'Within 24 hours' : 'En moins de 24 heures'}</option>
          </select>
        </label>

        <label className="text-sm font-medium text-stone-700">
          {english ? 'Distance from me' : 'Distance autour de moi'}
          <select
            value={String(distanceKm ?? '')}
            onChange={(event) => selectDistance(event.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
          >
            <option value="">{english ? 'Any distance' : 'Toutes distances'}</option>
            {[5, 10, 25, 50].map((distance) => <option key={distance} value={distance}>{english ? `Within ${distance} km` : `À moins de ${distance} km`}</option>)}
          </select>
        </label>

        {locationError ? <p role="status" className="text-sm text-amber-800">{locationError}</p> : null}

        <label className="flex items-end gap-2 text-sm font-medium text-stone-700">
          <input
            type="checkbox"
            checked={verified}
            onChange={(event) => navigate({ verified: event.target.checked })}
            className="mb-2.5 h-4 w-4 rounded border-stone-300 accent-amber-700"
          />
          <span className="mb-2">{english ? 'Verified profiles only' : 'Profil contrôlé uniquement'}</span>
        </label>
      </div>
    </div>
  );
}

export function ArtisanBadgeLegend() {
  const { t } = useLanguage();

  return (
    <div aria-label={t('artisan_badges_legend')} className="flex flex-wrap gap-x-6 gap-y-2 border-b border-stone-200 pb-4 text-xs text-stone-600">
      <p><span className="mr-1 rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-900">Premium</span>{t('artisan_badge_legend_premium')}</p>
      <p><span className="mr-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">✓ {t('artisan_card_kyc')}</span>{t('artisan_badge_legend_verified')}</p>
      <p><span className="mr-1 rounded-full bg-emerald-700 px-2 py-0.5 font-medium text-white">★ {t('verif_recommended')}</span>{t('artisan_badge_legend_recommended')}</p>
    </div>
  );
}
