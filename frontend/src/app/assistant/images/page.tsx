'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { api, ApiError } from '@/lib/api';

const STYLES = [
  { value: 'studio', fr: 'Studio', en: 'Studio' },
  { value: 'catalogue', fr: 'Catalogue', en: 'Catalogue' },
  { value: 'lifestyle', fr: 'Mise en scène lifestyle', en: 'Lifestyle scene' },
  { value: 'marketing', fr: 'Marketing', en: 'Marketing' },
  { value: 'detail', fr: 'Détail / texture', en: 'Detail / texture' },
];

export default function AssistantImagesPage() {
  const { user, ready } = useAuth();
  const { language } = useLanguage();
  const english = language === 'en';
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('studio');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    if (prompt.trim().length < 20) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.assistantGenerateImage({ prompt, style, language });
      setImages((current) => [...current, result.imageUrl].slice(-3));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (english ? 'Image generation failed.' : 'La génération de l’image a échoué.'));
    } finally {
      setLoading(false);
    }
  };

  if (!ready || !user) return <p className="text-stone-600">{english ? 'Loading...' : 'Chargement...'}</p>;
  if (user.role !== 'artisan') return <p className="text-stone-600">{english ? 'This studio is reserved for artisans.' : 'Ce studio est réservé aux artisans.'}</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{english ? 'AI IMAGE STUDIO' : 'STUDIO IMAGES IA'}</p>
        <h1 className="mt-1 text-3xl font-semibold">{english ? 'Create a product staging image' : 'Créer une image de mise en scène produit'}</h1>
        <p className="mt-2 text-stone-600">{english ? 'Describe a product you can really make, then choose a visual style.' : 'Décrivez un produit que vous pouvez réellement fabriquer, puis choisissez un style visuel.'}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-6">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>{english ? 'Important:' : 'Important :'}</strong>{' '}
            {english ? 'AI images are inspiration or staging only. They are not proof of a completed artisan work. Use real photos for your portfolio.' : 'Les images IA servent uniquement à présenter une idée ou une mise en scène. Elles ne prouvent pas une réalisation. Utilisez des photos réelles pour votre portfolio.'}
          </div>
          <label className="block text-sm font-medium text-stone-700">
            {english ? 'Describe the product' : 'Décrivez le produit'}
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={7} placeholder={english ? 'Example: handwoven raffia basket, natural colours, round shape...' : 'Exemple : panier rond en raphia tressé à la main, couleurs naturelles...'} className="field mt-1 w-full" />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            {english ? 'Visual style' : 'Style visuel'}
            <select value={style} onChange={(event) => setStyle(event.target.value)} className="field mt-1 w-full">
              {STYLES.map((item) => <option key={item.value} value={item.value}>{english ? item.en : item.fr}</option>)}
            </select>
          </label>
          {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <button type="button" disabled={loading || prompt.trim().length < 20 || images.length >= 3} onClick={() => void generate()} className="rounded-md bg-amber-700 px-5 py-3 font-medium text-white disabled:opacity-60">
            {loading ? (english ? 'Generating...' : 'Génération...') : (english ? 'Generate image' : 'Générer une image')}
          </button>
          <p className="text-xs text-stone-500">{english ? 'Up to 3 images per session. A real product photo is required before final publication.' : 'Jusqu’à 3 images par session. Une photo réelle du produit est requise avant publication finale.'}</p>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-semibold">{english ? 'Generated images' : 'Images générées'}</h2>
          {images.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2">{images.map((url, index) => <figure key={`${url}-${index}`} className="overflow-hidden rounded-md border border-amber-200"><img src={url} alt={english ? `AI staging image ${index + 1}` : `Image IA de mise en scène ${index + 1}`} className="aspect-square w-full object-cover" /><figcaption className="flex items-center justify-between gap-2 p-2 text-xs text-amber-800"><span>Image IA</span><a href={url} target="_blank" rel="noreferrer" className="underline">{english ? 'Open' : 'Ouvrir'}</a></figcaption></figure>)}</div> : <p className="mt-4 rounded-md bg-stone-50 p-6 text-sm text-stone-600">{english ? 'Your generated images will appear here.' : 'Vos images générées apparaîtront ici.'}</p>}
          <Link href="/assistant" className="mt-6 inline-block text-sm font-medium text-amber-800 underline">{english ? 'Back to text assistant' : 'Retour à l’assistant texte'}</Link>
        </section>
      </div>
    </div>
  );
}
