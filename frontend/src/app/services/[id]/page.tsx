'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Service } from '@/lib/types';
import { whatsappHref } from '@/lib/whatsapp';
import { resolveMediaUrl } from '@/lib/media';
const LocationPicker = dynamic(() => import('@/components/LocationPicker').then((module) => module.LocationPicker), { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-md bg-stone-100" /> });

export default function ServiceOrderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, ready } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [projectObjective, setProjectObjective] = useState('');
  const [inspirationLinks, setInspirationLinks] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'home' | 'workshop' | 'carrier'>('workshop');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLatitude, setDeliveryLatitude] = useState<number | null>(null);
  const [deliveryLongitude, setDeliveryLongitude] = useState<number | null>(null);
  const [projectFiles, setProjectFiles] = useState<File[]>([]);
  const [options, setOptions] = useState('');
  const [clientConfirmed, setClientConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    api.getService(params.id)
      .then((data) => setService(data as Service))
      .catch(() => setNotice({ type: 'error', text: 'Ce service est introuvable ou n’est plus disponible.' }))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      router.push(`/login?redirect=/services/${params.id}`);
      return;
    }

    try {
      setSubmitting(true);
      setNotice(null);
      const parsedOptions = options.trim()
        ? { requestedFeatures: options.split(',').map((option) => option.trim()).filter(Boolean) }
        : {};

      const createdOrder = await api.createServiceOrder({
        serviceId: params.id,
        projectObjective,
        options: parsedOptions,
        inspirationLinks: inspirationLinks || undefined,
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
        budgetMax: budgetMax ? Number(budgetMax) : undefined,
        requestedDate: requestedDate || undefined,
        deliveryMethod,
        deliveryAddress: deliveryMethod === 'home' ? deliveryAddress : undefined,
        deliveryLatitude: deliveryMethod === 'home' ? deliveryLatitude ?? undefined : undefined,
        deliveryLongitude: deliveryMethod === 'home' ? deliveryLongitude ?? undefined : undefined,
        clientConfirmed,
        termsAccepted,
      });
      if (projectFiles.length) {
        await api.uploadServiceOrderFiles((createdOrder as { id: string }).id, projectFiles);
      }
      setNotice({ type: 'success', text: 'Votre demande a été envoyée. Elle sera vérifiée par notre équipe.' });
      setProjectObjective('');
      setOptions('');
      setClientConfirmed(false);
      setTermsAccepted(false);
      setDeliveryMethod('workshop');
      setDeliveryAddress('');
      setProjectFiles([]);
    } catch (error) {
      setNotice({ type: 'error', text: error instanceof Error ? error.message : 'Impossible d’envoyer la demande.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-stone-600">Chargement du service...</p>;
  if (!service) return <p className="text-red-700">Service indisponible.</p>;
  const artisanWhatsapp = whatsappHref(service.artisan?.whatsappPhone ?? service.artisan?.phone, `Bonjour ${service.artisan?.name ?? ''}, je suis intéressé par votre service « ${service.title} » sur ArtisanConnect.`);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link href="/" className="text-sm font-medium text-amber-700 hover:text-amber-800">← Retour aux services</Link>

      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-amber-700">Service approuvé</p>
            <h1 className="mt-1 text-3xl font-semibold text-stone-900">{service.title}</h1>
            <p className="mt-2 text-stone-600">Par {service.artisan?.name ?? 'Artisan'}</p>
            {artisanWhatsapp ? <a href={artisanWhatsapp} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">Contacter sur WhatsApp</a> : null}
          </div>
          <div className="text-right text-sm text-stone-600">
            <p>{service.estimatedDays} jours estimés</p>
            <p className="font-semibold text-stone-900">
              {service.price ? `${service.price} FCFA` : service.priceMin && service.priceMax ? `${service.priceMin} - ${service.priceMax} FCFA` : 'Sur devis'}
            </p>
            <p className="mt-2">{service.averageRating ? `★ ${service.averageRating}/5` : 'Pas encore noté'} ({service.reviewCount ?? 0} avis)</p>
          </div>
        </div>
        <p className="mt-6 whitespace-pre-wrap text-stone-700">{service.description}</p>
        {service.fileUrls?.length ? <div className="mt-6"><h2 className="text-xl font-semibold text-stone-900">Réalisations</h2><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{service.fileUrls.map((url, index) => <img key={`${url}-${index}`} src={resolveMediaUrl(url)} alt={`${service.title} - réalisation ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" />)}</div></div> : null}
        {service.videoUrls?.length ? <div className="mt-6"><h2 className="text-xl font-semibold text-stone-900">Démonstrations vidéo</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{service.videoUrls.map((url, index) => <video key={`${url}-${index}`} src={resolveMediaUrl(url)} controls preload="metadata" className="w-full rounded-lg" aria-label={`${service.title} - vidéo ${index + 1}`} />)}</div></div> : null}
        {service.tags?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {service.tags.map((tag) => <span key={tag} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700">{tag}</span>)}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="text-2xl font-semibold text-stone-900">Demander ce service</h2>
        <p className="mt-2 text-sm text-stone-600">Décrivez votre projet avec assez de détails pour permettre une première validation.</p>

        {notice ? (
          <div className={`mt-4 rounded-md px-4 py-3 text-sm ${notice.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {notice.text}
          </div>
        ) : null}

        {!ready || !user ? (
          <div className="mt-6 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
            Connectez-vous pour envoyer une demande de service.
            <Link href={`/login?redirect=/services/${params.id}`} className="ml-2 font-semibold underline">Se connecter</Link>
          </div>
        ) : user.role !== 'client' ? (
          <div className="mt-6 rounded-md bg-stone-100 p-4 text-sm text-stone-700">Seuls les clients peuvent commander un service.</div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="objective" className="block text-sm font-medium text-stone-700">Objectif du projet *</label>
              <textarea id="objective" required minLength={50} value={projectObjective} onChange={(event) => setProjectObjective(event.target.value)} rows={6} placeholder="Décrivez le résultat attendu, votre contexte et les fonctionnalités importantes..." className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-amber-500 focus:outline-none" />
              <p className="mt-1 text-xs text-stone-500">Minimum 50 caractères.</p>
            </div>

            <div>
              <label htmlFor="options" className="block text-sm font-medium text-stone-700">Fonctionnalités ou options souhaitées</label>
              <input id="options" value={options} onChange={(event) => setOptions(event.target.value)} placeholder="Ex. site vitrine, paiement en ligne, maintenance" className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-amber-500 focus:outline-none" />
            </div>

            <div>
              <label htmlFor="links" className="block text-sm font-medium text-stone-700">Exemples ou inspirations</label>
              <textarea id="links" value={inspirationLinks} onChange={(event) => setInspirationLinks(event.target.value)} rows={3} placeholder="Liens ou références utiles" className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-amber-500 focus:outline-none" />
            </div>

            <div>
              <label htmlFor="projectFiles" className="block text-sm font-medium text-stone-700">Documents du projet (PDF, facultatif)</label>
              <input id="projectFiles" type="file" multiple accept="application/pdf" onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                setProjectFiles(files.slice(0, 5));
              }} className="mt-1 block w-full rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-amber-700 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-amber-800" />
              <p className="mt-1 text-xs text-stone-500">Maximum 5 fichiers PDF, 10 Mo chacun.</p>
              {projectFiles.length ? <p className="mt-1 text-xs text-stone-600">{projectFiles.length} fichier(s) sélectionné(s).</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div><label htmlFor="budgetMin" className="block text-sm font-medium text-stone-700">Budget minimum</label><input id="budgetMin" type="number" min="0" value={budgetMin} onChange={(event) => setBudgetMin(event.target.value)} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2" /></div>
              <div><label htmlFor="budgetMax" className="block text-sm font-medium text-stone-700">Budget maximum</label><input id="budgetMax" type="number" min="0" value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2" /></div>
              <div><label htmlFor="date" className="block text-sm font-medium text-stone-700">Date souhaitée</label><input id="date" type="date" value={requestedDate} onChange={(event) => setRequestedDate(event.target.value)} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2" /></div>
            </div>

            <div>
              <label htmlFor="deliveryMethod" className="block text-sm font-medium text-stone-700">Mode de livraison *</label>
              <select id="deliveryMethod" required value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value as typeof deliveryMethod)} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2">
                <option value="workshop">Retrait à l’atelier</option>
                <option value="home">Livraison à domicile</option>
                <option value="carrier">Livraison par notre transporteur</option>
              </select>
            </div>
            {deliveryMethod !== 'workshop' ? <div><label htmlFor="deliveryAddress" className="block text-sm font-medium text-stone-700">Adresse du lieu *</label><textarea id="deliveryAddress" required value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} rows={2} placeholder="Ville, quartier, repères..." className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2" /></div> : null}
            {deliveryMethod !== 'workshop' ? <div><p className="mb-2 text-sm font-medium text-stone-700">Position du lieu</p><LocationPicker latitude={deliveryLatitude} longitude={deliveryLongitude} onChange={([lat, lng]) => { setDeliveryLatitude(lat); setDeliveryLongitude(lng); }} /></div> : null}

            <label className="flex items-start gap-3 text-sm text-stone-700"><input type="checkbox" checked={clientConfirmed} onChange={(event) => setClientConfirmed(event.target.checked)} required className="mt-1" />Je confirme que les informations de cette demande sont exactes.</label>
            <label className="flex items-start gap-3 text-sm text-stone-700"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} required className="mt-1" />J’ai lu et j’accepte les conditions d’exécution du service.</label>

            <button type="submit" disabled={submitting} className="rounded-md bg-amber-700 px-5 py-3 font-medium text-white hover:bg-amber-800 disabled:bg-stone-400">{submitting ? 'Envoi...' : 'Envoyer la demande'}</button>
          </form>
        )}
      </section>
    </div>
  );
}
