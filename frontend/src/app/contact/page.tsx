'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', city: '', neighborhood: '', subject: '', message: '' });
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSending(true);
      setNotice(null);
      const result = await api.sendContactMessage(form, files);
      setNotice({ type: 'success', text: result.message });
      setForm({ name: '', email: '', city: '', neighborhood: '', subject: '', message: '' });
      setFiles([]);
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Impossible d’envoyer le message.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">Support ArtisanConnect</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">Nous contacter</h1>
        <p className="mt-2 text-stone-600">Une question sur une commande, une boutique ou un service ? Écrivez-nous.</p>
      </header>

      <section className="rounded-lg border border-stone-200 bg-white p-6">
        {notice ? <p className={`mb-5 rounded-md px-4 py-3 text-sm ${notice.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{notice.text}</p> : null}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="contact-name" className="block text-sm font-medium text-stone-700">Nom *</label><input id="contact-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="field mt-1" /></div>
            <div><label htmlFor="contact-email" className="block text-sm font-medium text-stone-700">E-mail *</label><input id="contact-email" required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="field mt-1" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="contact-city" className="block text-sm font-medium text-stone-700">Ville</label><input id="contact-city" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="Douala, Yaoundé..." className="field mt-1" /></div><div><label htmlFor="contact-neighborhood" className="block text-sm font-medium text-stone-700">Quartier</label><input id="contact-neighborhood" value={form.neighborhood} onChange={(event) => setForm({ ...form, neighborhood: event.target.value })} className="field mt-1" /></div></div>
          <div><label htmlFor="contact-subject" className="block text-sm font-medium text-stone-700">Objet *</label><input id="contact-subject" required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} className="field mt-1" /></div>
          <div><label htmlFor="contact-message" className="block text-sm font-medium text-stone-700">Message *</label><textarea id="contact-message" required minLength={10} rows={7} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="field mt-1" /></div>
          <div><label htmlFor="contact-files" className="block text-sm font-medium text-stone-700">Pièces jointes (facultatif)</label><input id="contact-files" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp,text/plain" onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 3))} className="mt-1 block w-full rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-amber-700 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-amber-800" /><p className="mt-1 text-xs text-stone-500">Maximum 3 fichiers, 5 Mo chacun : PDF, image ou texte.</p></div>
          <div className="flex flex-wrap items-center gap-4"><button disabled={sending} className="rounded-md bg-amber-700 px-5 py-2.5 font-medium text-white hover:bg-amber-800 disabled:bg-stone-400">{sending ? 'Envoi...' : 'Envoyer le message'}</button><Link href="/" className="text-sm text-stone-600 underline">Retour à l’accueil</Link></div>
        </form>
      </section>
    </div>
  );
}
