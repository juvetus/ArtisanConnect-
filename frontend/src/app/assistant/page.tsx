'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { api, ApiError } from '@/lib/api';

type Task = 'atelier' | 'presentation' | 'produit' | 'reponse' | 'devis' | 'whatsapp' | 'bio' | 'siarc' | 'correction' | 'traduction';

const TASKS: { value: Task; fr: string; en: string; placeholder: string }[] = [
  { value: 'atelier', fr: 'Description atelier', en: 'Workshop description', placeholder: 'Métier, ville, matières, savoir-faire...' },
  { value: 'presentation', fr: 'Présentation professionnelle', en: 'Professional presentation', placeholder: 'Nom, métier, expérience, spécialités...' },
  { value: 'produit', fr: 'Fiche produit', en: 'Product sheet', placeholder: 'Produit, matières, dimensions, usage, prix...' },
  { value: 'reponse', fr: 'Réponse client', en: 'Client reply', placeholder: 'Copiez le message du client et indiquez votre réponse...' },
  { value: 'devis', fr: 'Devis simple', en: 'Simple quote', placeholder: 'Prestation, quantité, prix ou informations à préciser...' },
  { value: 'whatsapp', fr: 'Message WhatsApp', en: 'WhatsApp message', placeholder: 'Objectif du message, client, produit ou service...' },
  { value: 'bio', fr: 'Bio artisan', en: 'Artisan bio', placeholder: 'Métier, ville, spécialité et contact...' },
  { value: 'siarc', fr: 'Texte pour SIARC', en: 'SIARC presentation', placeholder: 'Votre savoir-faire, produit et histoire...' },
  { value: 'correction', fr: 'Correction orthographique', en: 'Proofreading', placeholder: 'Collez votre texte ici...' },
  { value: 'traduction', fr: 'Traduction FR ↔ EN', en: 'FR ↔ EN translation', placeholder: 'Collez le texte à traduire...' },
];

export default function AssistantPage() {
  const { user, ready } = useAuth();
  const { language } = useLanguage();
  const english = language === 'en';
  const [task, setTask] = useState<Task>('produit');
  const [input, setInput] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState('');
  const [provider, setProvider] = useState<'ai' | 'local' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const selected = TASKS.find((item) => item.value === task) ?? TASKS[0];

  const generate = async () => {
    if (!input.trim()) return;
    setLoading(true); setError('');
    try {
      const response = await api.assistantGenerate({ task, input, context, language });
      setResult(response.content); setProvider(response.provider); setCopied(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (english ? 'Generation failed.' : 'La génération a échoué.'));
    } finally { setLoading(false); }
  };

  const copyResult = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(result)}`, '_blank', 'noopener,noreferrer');
  };

  if (!ready || !user) return <p className="text-stone-600">{english ? 'Loading...' : 'Chargement...'}</p>;
  if (user.role !== 'artisan') return <p className="text-stone-600">{english ? 'This assistant is reserved for artisans.' : 'Cet assistant est réservé aux artisans.'}</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header><p className="text-sm font-medium uppercase tracking-wide text-amber-700">ArtisanConnect AI</p><h1 className="mt-1 text-3xl font-semibold">{english ? 'Your artisan writing assistant' : 'Votre assistant pour artisans'}</h1><p className="mt-2 text-stone-600">{english ? 'Create clear content for your workshop, products, clients and opportunities.' : 'Créez des textes clairs pour votre atelier, vos produits, vos clients et vos opportunités.'}</p></header>
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-2 rounded-xl border border-stone-200 bg-white p-3">{TASKS.map((item) => <button key={item.value} type="button" onClick={() => { setTask(item.value); setResult(''); setCopied(false); }} className={`w-full rounded-md px-3 py-2 text-left text-sm ${task === item.value ? 'bg-amber-700 font-medium text-white' : 'text-stone-700 hover:bg-stone-100'}`}>{english ? item.en : item.fr}</button>)}</aside>
        <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-semibold">{english ? selected.en : selected.fr}</h2>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={7} placeholder={selected.placeholder} className="field w-full" />
          <input value={context} onChange={(event) => setContext(event.target.value)} placeholder={english ? 'Optional context: city, price, delivery, audience...' : 'Contexte facultatif : ville, prix, livraison, public...'} className="field w-full" />
          {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <button type="button" disabled={loading || !input.trim()} onClick={() => void generate()} className="rounded-md bg-amber-700 px-5 py-3 font-medium text-white disabled:opacity-60">{loading ? (english ? 'Generating...' : 'Génération...') : (english ? 'Generate' : 'Générer')}</button>
          {result ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{provider === 'ai' ? 'IA ArtisanConnect' : (english ? 'Draft' : 'Brouillon')}</p><div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => void copyResult()} className="text-sm font-medium text-amber-800 underline">{copied ? (english ? 'Copied' : 'Copié') : (english ? 'Copy' : 'Copier')}</button><button type="button" onClick={openWhatsApp} className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">{english ? 'Open WhatsApp' : 'Ouvrir WhatsApp'}</button></div></div>{copied ? <p role="status" className="mt-2 text-sm font-medium text-green-700">{english ? 'Message copied successfully.' : 'Message copié avec succès.'}</p> : null}<p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-800">{result}</p></div> : null}
        </section>
      </div>
    </div>
  );
}
