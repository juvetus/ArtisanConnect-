'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { PRODUCT_CATEGORIES, categoryLabel } from '@/lib/categories';
import { SHOP_OPTIONAL_DOCS, SHOP_REQUIRED_DOCS, type KycDocument, type ShopType } from '@/lib/types';
const LocationPicker = dynamic(() => import('@/components/LocationPicker').then((module) => module.LocationPicker), { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-md bg-stone-100" /> });

const SHOP_TYPES: { value: ShopType; title: string; description: string }[] = [
  {
    value: 'artisan',
    title: 'Boutique Artisan',
    description: "Atelier réel, production propre. Validation manuelle par l'équipe.",
  },
  {
    value: 'reseller',
    title: 'Boutique Revendeur',
    description: 'Stock réel sans atelier. Validation automatique si preuves OK.',
  },
  {
    value: 'individual',
    title: 'Vendeur Individuel',
    description: 'Affaires personnelles. Validation automatique si preuves OK.',
  },
];

export default function CreateShopPage() {
  const { user, ready } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<ShopType>('artisan');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [market, setMarket] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [category, setCategory] = useState('vannerie');
  const [isWomenLed, setIsWomenLed] = useState(false);
  const [isCooperative, setIsCooperative] = useState(false);
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'workshop' | 'home'>('workshop');
  const [docs, setDocs] = useState<KycDocument[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && !user) router.push('/login');
    if (user?.gender === 'female') {
      setIsWomenLed(true);
    }
    if (user?.gender === 'cooperative') {
      setIsCooperative(true);
    }
  }, [ready, user, router]);

  const requiredDocs = SHOP_REQUIRED_DOCS[type];

  const uploadDoc = async (label: string, file: File) => {
    setUploading(label);
    setError('');
    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Le fichier dépasse la limite de 10 Mo.');
      }
      const uploaded = await api.uploadKycDocument(file);
      setDocs((prev) => [...prev.filter((doc) => doc.label !== label), { label, ...uploaded }]);
    } catch (error) {
      setError(error instanceof ApiError || error instanceof Error
        ? error.message
        : 'Le téléversement a échoué. Vérifiez le format, la taille et la configuration Cloudinary.');
    } finally {
      setUploading(null);
    }
  };

  const allDocsProvided = requiredDocs.every((req) =>
    docs.some((doc) => doc.label === req.label),
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.createShop({
        type,
        name,
        description,
        city: city || undefined,
        neighborhood: neighborhood || undefined,
        market: market || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        category,
        mobileMoneyNumber,
        deliveryMode,
        kycDocuments: docs,
        isWomenLed,
        isCooperative,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La création de la boutique a échoué.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready || !user) return <p className="text-stone-600">{t('action_loading')}</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('create_shop_badge')}</p>
        <h1 className="text-2xl font-semibold">{t('create_shop_title')}</h1>
        {/* Indicateur d'étapes */}
        <ol className="mt-4 flex gap-2 text-sm">
          {[t('create_shop_step1'), t('create_shop_step2'), t('create_shop_step3')].map((label, index) => (
            <li
              key={label}
              className={`flex-1 rounded-md border px-3 py-2 text-center ${step === index + 1
                  ? 'border-amber-700 bg-amber-50 font-medium text-amber-800'
                  : 'border-stone-200 text-stone-500'
                }`}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>
      </div>

      {step === 1 && (
        <section className="space-y-3">
          {SHOP_TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setType(option.value)}
              className={`w-full rounded-lg border p-4 text-left transition ${type === option.value
                  ? 'border-amber-700 bg-amber-50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
            >
              <p className="font-medium">{option.title}</p>
              <p className="mt-1 text-sm text-stone-600">{option.description}</p>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full rounded-md bg-amber-700 py-2 font-medium text-white hover:bg-amber-800"
          >
            Continuer
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-600">
            Fournissez toutes les preuves exigées : sans elles, la boutique ne peut pas être activée.
          </p>
          {requiredDocs.map((req) => {
            const doc = docs.find((d) => d.label === req.label);
            return (
              <div key={req.label}>
                <label htmlFor={`doc-${req.label}`} className="block text-sm font-medium">
                  {req.labelFr} {doc && <span className="text-green-700">✓ fourni</span>}
                </label>
                <input
                  id={`doc-${req.label}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadDoc(req.label, file);
                  }}
                  className="mt-1 w-full rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-amber-700 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-amber-800"
                />
                {uploading === req.label && <p className="mt-1 text-sm text-stone-500">Téléversement…</p>}
              </div>
            );
          })}
          {SHOP_OPTIONAL_DOCS[type].map((req) => {
            const doc = docs.find((item) => item.label === req.label);
            return (
              <div key={req.label}>
                <label htmlFor={`optional-doc-${req.label}`} className="block text-sm font-medium">
                  {req.labelFr} {doc && <span className="text-green-700">✓ fourni</span>}
                </label>
                <input
                  id={`optional-doc-${req.label}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadDoc(req.label, file);
                  }}
                  className="mt-1 w-full rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-amber-700 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-amber-800"
                />
              </div>
            );
          })}
          <div>
            <label htmlFor="momophone" className="block text-sm font-medium">
              Numéro Mobile Money (vérifié)
            </label>
            <input
              id="momophone"
              type="tel"
              required
              placeholder="+237 6XX XXX XXX"
              value={mobileMoneyNumber}
              onChange={(e) => setMobileMoneyNumber(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm"
            >
              {t('action_back')}
            </button>
            <button
              type="button"
              disabled={!allDocsProvided || mobileMoneyNumber.trim().length < 9 || uploading !== null}
              onClick={() => setStep(3)}
              className="flex-1 rounded-md bg-amber-700 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {t('create_shop_continue')}
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-6">
          <div>
            <label htmlFor="shop-name" className="block text-sm font-medium">
              {t('create_shop_name')}
            </label>
            <input
              id="shop-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label htmlFor="shop-city" className="block text-sm font-medium">{t('create_shop_city')}</label><input id="shop-city" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Douala, Yaoundé..." className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" /></div>
            <div><label htmlFor="shop-neighborhood" className="block text-sm font-medium">{t('create_shop_neighborhood')}</label><input id="shop-neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Bonamoussadi..." className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" /></div>
            <div><label htmlFor="shop-market" className="block text-sm font-medium">{t('create_shop_market')}</label><input id="shop-market" value={market} onChange={(e) => setMarket(e.target.value)} placeholder="Marché central..." className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" /></div>
          </div>
          <div><p className="mb-2 text-sm font-medium">{t('create_shop_position')}</p><LocationPicker latitude={latitude} longitude={longitude} onChange={([lat, lng]) => { setLatitude(lat); setLongitude(lng); }} /></div>
          <div>
            <label htmlFor="shop-description" className="block text-sm font-medium">
              {t('create_shop_desc')}
            </label>
            <textarea
              id="shop-description"
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="shop-category" className="block text-sm font-medium">
                {t('create_shop_category')}
              </label>
              <select
                id="shop-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {categoryLabel(c.value)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="shop-delivery" className="block text-sm font-medium">
                {t('create_shop_delivery')}
              </label>
              <select
                id="shop-delivery"
                value={deliveryMode}
                onChange={(e) => setDeliveryMode(e.target.value as 'workshop' | 'home')}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
              >
                <option value="workshop">{t('create_shop_workshop')}</option>
                <option value="home">{t('create_shop_home')}</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWomenLed}
                  onChange={(e) => setIsWomenLed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-sm font-semibold text-rose-950">🌸 Entrepreneuriat Féminin (BuyFromWomen)</span>
                  <p className="text-xs text-rose-800">Structure dirigée par une femme artisane. Badge « Créatrice locale » attribué à vos annonces.</p>
                </div>
              </label>
            </div>

            <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCooperative}
                  onChange={(e) => setIsCooperative(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-semibold text-indigo-950">🤝 Coopérative / Groupement d’Artisans (GIC)</span>
                  <p className="text-xs text-indigo-800">Structure collective regroupant plusieurs artisans. Badge « Coopérative / GIC » attribué.</p>
                </div>
              </label>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm"
            >
              Retour
            </button>
            <button
              type="button"
              disabled={!name || !description || submitting}
              onClick={handleSubmit}
              className="flex-1 rounded-md bg-amber-700 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {submitting ? 'Création…' : 'Créer la boutique'}
            </button>
          </div>
          <p className="text-xs text-stone-500">
            {type === 'artisan'
              ? "Boutique Artisan : votre demande passera en « En attente de validation » jusqu'à la vérification manuelle."
              : 'Validation automatique : votre boutique sera active immédiatement si les preuves sont complètes.'}
          </p>
        </section>
      )}
    </div>
  );
}
