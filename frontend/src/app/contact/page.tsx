'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';

type ContactTopic = 'order' | 'artisan' | 'payment' | 'account' | 'seller' | 'partnership' | 'other';

export default function ContactPage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-600">Chargement…</p>}>
      <ContactForm />
    </Suspense>
  );
}

function ContactForm() {
  const { language } = useLanguage();
  const english = language === 'en';
  const searchParams = useSearchParams();
  const initialTopic = searchParams.get('topic') === 'partnership' ? 'partnership' : null;
  const [topic, setTopic] = useState<ContactTopic | null>(initialTopic);
  const [form, setForm] = useState({ name: '', email: '', city: '', neighborhood: '', message: '' });
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const topics: { id: ContactTopic; icon: string; label: string; subject: string; hint: string }[] = english
    ? [
        { id: 'order', icon: '🛒', label: 'I have an order issue', subject: 'Order support', hint: 'Order number, item and what happened' },
        { id: 'artisan', icon: '🔧', label: 'I have an issue with an artisan', subject: 'Artisan support', hint: 'Artisan or shop name and what happened' },
        { id: 'payment', icon: '💳', label: 'I have a payment issue', subject: 'Payment support', hint: 'Payment method, amount and reference if available' },
        { id: 'account', icon: '👤', label: 'My account is not working', subject: 'Account support', hint: 'What you were trying to do and any error message' },
        { id: 'seller', icon: '🏪', label: 'I am an artisan', subject: 'Artisan assistance', hint: 'Tell us about your shop or the support you need' },
        { id: 'partnership', icon: '🤝', label: 'I represent an organization', subject: 'Partnership enquiry', hint: 'Tell us about your organization, programme and partnership goals' },
        { id: 'other', icon: '✉️', label: 'Something else', subject: 'General support', hint: 'How can we help?' },
      ]
    : [
        { id: 'order', icon: '🛒', label: 'J’ai un problème avec une commande', subject: 'Support commande', hint: 'Numéro de commande, article et problème rencontré' },
        { id: 'artisan', icon: '🔧', label: 'J’ai un problème avec un artisan', subject: 'Support artisan', hint: 'Nom de l’artisan ou de la boutique et problème rencontré' },
        { id: 'payment', icon: '💳', label: 'J’ai un problème de paiement', subject: 'Support paiement', hint: 'Mode de paiement, montant et référence si disponible' },
        { id: 'account', icon: '👤', label: 'Mon compte ne fonctionne pas', subject: 'Support compte', hint: 'Action tentée et éventuel message d’erreur' },
        { id: 'seller', icon: '🏪', label: 'Je suis artisan', subject: 'Accompagnement artisan', hint: 'Votre boutique ou l’accompagnement dont vous avez besoin' },
        { id: 'partnership', icon: '🤝', label: 'Je représente une organisation', subject: 'Demande de partenariat', hint: 'Présentez votre organisation, votre programme et vos objectifs de partenariat' },
        { id: 'other', icon: '✉️', label: 'Autre', subject: 'Support général', hint: 'Comment pouvons-nous vous aider ?' },
      ];
  const selectedTopic = topics.find((item) => item.id === topic);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTopic) return;
    try {
      setSending(true);
      setNotice(null);
      const result = await api.sendContactMessage({
        ...form,
        subject: `[${selectedTopic.subject}] ${selectedTopic.label}`,
      }, files);
      setNotice({ type: 'success', text: result.message });
      setForm({ name: '', email: '', city: '', neighborhood: '', message: '' });
      setFiles([]);
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : (english ? 'Could not send the message.' : 'Impossible d’envoyer le message.') });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">Support ArtisanConnect</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">{english ? 'How can we help you?' : 'Comment pouvons-nous vous aider ?'}</h1>
        <p className="mt-2 text-stone-600">{english ? 'Choose a topic so we can direct your message to the right team.' : 'Choisissez un motif pour orienter votre demande vers la bonne équipe.'}</p>
      </header>

      <section aria-label={english ? 'Choose a support topic' : 'Choisir un motif'} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((item) => (
          <button key={item.id} type="button" aria-pressed={topic === item.id} onClick={() => { setTopic(item.id); setNotice(null); }} className={`flex min-h-24 items-start gap-3 rounded-md border p-4 text-left transition ${topic === item.id ? 'border-amber-700 bg-amber-50 ring-1 ring-amber-700' : 'border-stone-200 bg-white hover:border-amber-500'}`}>
            <span aria-hidden className="text-xl">{item.icon}</span>
            <span className="font-medium text-stone-900">{item.label}</span>
          </button>
        ))}
      </section>

      {selectedTopic ? (
        <section className="border-t border-stone-200 pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">{selectedTopic.label}</h2>
              <p className="mt-1 text-sm text-stone-600">{english ? 'Your message will be routed as:' : 'Votre message sera orienté sous le motif :'} {selectedTopic.subject}</p>
            </div>
            <button type="button" onClick={() => setTopic(null)} className="text-sm font-medium text-amber-800 underline">{english ? 'Change topic' : 'Changer de motif'}</button>
          </div>

          {notice ? <p role="status" className={`mb-5 rounded-md px-4 py-3 text-sm ${notice.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{notice.text}</p> : null}
          <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="contact-name" className="block text-sm font-medium text-stone-700">{english ? 'Name *' : 'Nom *'}</label><input id="contact-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="field mt-1" /></div>
              <div><label htmlFor="contact-email" className="block text-sm font-medium text-stone-700">{english ? 'Email *' : 'E-mail *'}</label><input id="contact-email" required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="field mt-1" /></div>
            </div>
            <div><label htmlFor="contact-message" className="block text-sm font-medium text-stone-700">{english ? 'Message *' : 'Message *'}</label><textarea id="contact-message" required minLength={10} rows={6} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder={selectedTopic.hint} className="field mt-1" /></div>
            <details className="rounded-md border border-stone-200 px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium text-stone-700">{english ? 'Add location (optional)' : 'Ajouter une localisation (facultatif)'}</summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="contact-city" className="block text-sm font-medium text-stone-700">{english ? 'City' : 'Ville'}</label><input id="contact-city" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="Douala, Yaoundé..." className="field mt-1" /></div>
                <div><label htmlFor="contact-neighborhood" className="block text-sm font-medium text-stone-700">{english ? 'Neighborhood' : 'Quartier'}</label><input id="contact-neighborhood" value={form.neighborhood} onChange={(event) => setForm({ ...form, neighborhood: event.target.value })} className="field mt-1" /></div>
              </div>
            </details>
            <div><label htmlFor="contact-files" className="block text-sm font-medium text-stone-700">{english ? 'Attachments (optional)' : 'Pièces jointes (facultatif)'}</label><input id="contact-files" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp,text/plain" onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 3))} className="mt-1 block w-full rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-amber-700 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-amber-800" /><p className="mt-1 text-xs text-stone-500">{english ? 'Up to 3 files, 5 MB each.' : 'Maximum 3 fichiers, 5 Mo chacun.'}</p></div>
            <div className="flex flex-wrap items-center gap-4"><button disabled={sending} className="min-h-11 rounded-md bg-amber-700 px-5 py-2.5 font-medium text-white hover:bg-amber-800 disabled:bg-stone-400">{sending ? (english ? 'Sending…' : 'Envoi…') : (english ? 'Send message' : 'Envoyer le message')}</button><Link href="/" className="text-sm text-stone-600 underline">{english ? 'Back to home' : 'Retour à l’accueil'}</Link></div>
          </form>
        </section>
      ) : null}
    </div>
  );
}