'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { SERVICE_CATEGORIES, categoryLabel } from '@/lib/categories';

interface Service {
  id: string;
  title: string;
  description: string;
  price?: number;
  priceMin?: number;
  priceMax?: number;
  estimatedDays: number;
  category: string;
  tags?: string[];
  fileUrls?: string[];
  videoUrls?: string[];
  externalUrls?: string[];
  status: 'draft' | 'pending_validation' | 'validation_requested' | 'approved' | 'rejected';
  validationFeedback?: string;
  createdAt: string;
}

const statusLabels = {
  draft: 'Brouillon',
  pending_validation: 'En attente de validation',
  validation_requested: 'Modification demandée',
  approved: 'Approuvé',
  rejected: 'Refusé',
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  pending_validation: 'bg-yellow-100 text-yellow-800',
  validation_requested: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const categories = SERVICE_CATEGORIES;

export default function ServicesPage() {
  const { user, ready } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState<'success' | 'error'>('success');
  const [serviceImages, setServiceImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [serviceVideos, setServiceVideos] = useState<string[]>([]);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [externalUrls, setExternalUrls] = useState<string[]>([]);
  const { data: planStatus } = useSWR('artisan-plan-status', api.getPlanStatus);
  const isPremiumGrowth = planStatus?.planSlug === 'premium-growth';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    priceMin: '',
    priceMax: '',
    estimatedDays: '5',
    category: categories[0].value,
    tags: '',
  });

  const { data: services, isLoading, mutate } = useSWR<Service[]>(
    user?.role === 'artisan' ? 'my-services' : null,
    async () => (await api.getMyServices()) as Service[],
  );

  useEffect(() => {
    if (ready && user?.role !== 'artisan') {
      router.replace('/');
    }
  }, [ready, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: any = {
        title: formData.title,
        description: formData.description,
        estimatedDays: parseInt(formData.estimatedDays),
        category: formData.category,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        fileUrls: serviceImages,
        videoUrls: serviceVideos,
        externalUrls: externalUrls.filter((url) => url.trim()),
      };

      if (formData.price) {
        data.price = parseFloat(formData.price);
      }
      if (formData.priceMin) {
        data.priceMin = parseFloat(formData.priceMin);
      }
      if (formData.priceMax) {
        data.priceMax = parseFloat(formData.priceMax);
      }

      if (editingId) {
        await api.updateService(editingId, data);
        setNoticeType('success');
        setNotice('Service mis à jour avec succès.');
      } else {
        await api.createService(data);
        setNoticeType('success');
        setNotice('Service créé avec succès.');
      }

      setFormData({
        title: '',
        description: '',
        price: '',
        priceMin: '',
        priceMax: '',
        estimatedDays: '5',
        category: categories[0].value,
        tags: '',
      });
      setServiceImages([]);
      setServiceVideos([]);
      setExternalUrls([]);
      setShowForm(false);
      setEditingId(null);
      await mutate();
    } catch (error) {
      setNoticeType('error');
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement';
      setNotice(message);
    }
  };

  const handleEdit = (service: Service) => {
    setFormData({
      title: service.title,
      description: service.description,
      price: service.price?.toString() || '',
      priceMin: service.priceMin?.toString() || '',
      priceMax: service.priceMax?.toString() || '',
      estimatedDays: service.estimatedDays.toString(),
      category: service.category,
      tags: service.tags?.join(', ') || '',
    });
    setServiceImages(service.fileUrls ?? []);
    setServiceVideos(service.videoUrls ?? []);
    setExternalUrls(service.externalUrls ?? []);
    setEditingId(service.id);
    setShowForm(true);
  };

  const handleServiceVideos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    if (files.length + serviceVideos.length > 3) {
      setNoticeType('error');
      setNotice('Ajoutez au maximum 3 vidéos à une galerie.');
      return;
    }
    setUploadingVideos(true);
    try {
      const result = await api.uploadServiceVideos(files);
      setServiceVideos((current) => [...current, ...result.videoUrls]);
      setNoticeType('success');
      setNotice('Vidéos ajoutées à la galerie Premium.');
    } catch (error) {
      setNoticeType('error');
      setNotice(error instanceof Error ? error.message : 'Le téléversement des vidéos a échoué.');
    } finally {
      setUploadingVideos(false);
    }
  };

  const handleServiceImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    if (files.length + serviceImages.length > 5) {
      setNoticeType('error');
      setNotice('Ajoutez au maximum 5 photos à une galerie.');
      return;
    }
    setUploadingImages(true);
    try {
      const result = await api.uploadServiceImages(files);
      setServiceImages((current) => [...current, ...result.imageUrls]);
      setNoticeType('success');
      setNotice('Photos ajoutées à la galerie.');
    } catch (error) {
      setNoticeType('error');
      setNotice(error instanceof Error ? error.message : 'Le téléversement des photos a échoué.');
    } finally {
      setUploadingImages(false);
    }
  };

  const handlePublish = async (serviceId: string) => {
    try {
      await api.publishService(serviceId);
      setNoticeType('success');
      setNotice('Service envoyé pour validation.');
      await mutate();
    } catch (error) {
      setNoticeType('error');
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'envoi';
      setNotice(message);
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      try {
        await api.deleteService(serviceId);
        setNoticeType('success');
        setNotice('Service supprimé avec succès.');
        await mutate();
      } catch (error) {
        setNoticeType('error');
        const message = error instanceof Error ? error.message : 'Erreur lors de la suppression';
        setNotice(message);
      }
    }
  };

  if (!ready || user?.role !== 'artisan' || isLoading) {
    return <p className="text-stone-600">{t('action_loading')}</p>;
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('artisan_services_badge')}</p>
          <h1 className="mt-1 text-3xl font-semibold">{t('artisan_services_title')}</h1>
          <p className="mt-2 text-stone-600">{t('artisan_services_subtitle')}</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({
              title: '',
              description: '',
              price: '',
              priceMin: '',
              priceMax: '',
              estimatedDays: '5',
              category: categories[0].value,
              tags: '',
            });
            setServiceImages([]);
            setServiceVideos([]);
            setExternalUrls([]);
          }}
          className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
        >
          + {t('artisan_services_new_btn')}
        </button>
      </header>

      {notice && (
        <p
          className={`rounded-md px-4 py-3 text-sm ${
            noticeType === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {notice}
        </p>
      )}

      {showForm && (
        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="mb-4 text-xl font-semibold">
            {editingId ? 'Modifier le service' : 'Créer un nouveau service'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-stone-600"><span className="text-red-700" aria-hidden="true">*</span> Champ obligatoire</p>
            <div>
              <label className="block text-sm font-medium text-stone-700">Titre <span className="text-red-700" aria-hidden="true">*</span><span className="sr-only"> (obligatoire)</span></label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="ex : Création site web"
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">Description <span className="text-red-700" aria-hidden="true">*</span><span className="sr-only"> (obligatoire)</span></label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez votre service en détail..."
                rows={4}
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700">Catégorie</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.labelFr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700">Délai estimé (jours) <span className="text-red-700" aria-hidden="true">*</span><span className="sr-only"> (obligatoire)</span></label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.estimatedDays}
                  onChange={(e) => setFormData({ ...formData, estimatedDays: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">Prix</label>
              <div className="mt-1 grid grid-cols-3 gap-3">
                <div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="Montant fixe"
                    className="block w-full rounded-md border border-stone-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-stone-500">Montant fixe</p>
                </div>
                <div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.priceMin}
                    onChange={(e) => setFormData({ ...formData, priceMin: e.target.value })}
                    placeholder="Min"
                    className="block w-full rounded-md border border-stone-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-stone-500">Prix min</p>
                </div>
                <div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.priceMax}
                    onChange={(e) => setFormData({ ...formData, priceMax: e.target.value })}
                    placeholder="Max"
                    className="block w-full rounded-md border border-stone-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-stone-500">Prix max</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">Tags (séparés par des virgules)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="ex : React, WordPress, E-commerce"
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="service-images" className="block text-sm font-medium text-stone-700">Photos du service (jusqu’à 5)</label>
              <input id="service-images" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingImages || serviceImages.length >= 5} onChange={handleServiceImages} className="mt-1 block w-full rounded-md border border-amber-300 bg-amber-50 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-amber-700 file:px-3 file:py-2 file:font-medium file:text-white" />
              <p className="mt-1 text-xs text-stone-500">Montrez vos réalisations : JPEG, PNG, WebP ou GIF, 5 Mo maximum par photo.</p>
              {serviceImages.length ? <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {serviceImages.map((url, index) => <div key={`${url}-${index}`} className="relative"><img src={url} alt={`Réalisation ${index + 1}`} className="aspect-square w-full rounded-md object-cover" /><button type="button" onClick={() => setServiceImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 rounded-full bg-stone-900/80 px-2 py-1 text-xs text-white" aria-label={`Supprimer la photo ${index + 1}`}>×</button></div>)}
              </div> : null}
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <label htmlFor="service-videos" className="block text-sm font-medium text-stone-800">Vidéos du service <span className="text-amber-800">(Premium Growth)</span></label>
              {isPremiumGrowth ? <>
                <input id="service-videos" type="file" multiple accept="video/mp4,video/webm,video/quicktime" disabled={uploadingVideos || serviceVideos.length >= 3} onChange={handleServiceVideos} className="mt-2 block w-full rounded-md border border-amber-300 bg-white p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-amber-700 file:px-3 file:py-2 file:font-medium file:text-white" />
                <p className="mt-1 text-xs text-stone-600">Jusqu’à 3 vidéos, 25 Mo maximum par vidéo. MP4, WebM ou MOV.</p>
                {serviceVideos.length ? <div className="mt-3 grid grid-cols-3 gap-2">{serviceVideos.map((url, index) => <div key={`${url}-${index}`} className="relative"><video src={url} controls className="aspect-video w-full rounded-md object-cover" /><button type="button" onClick={() => setServiceVideos((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 rounded-full bg-stone-900/80 px-2 py-1 text-xs text-white" aria-label={`Supprimer la vidéo ${index + 1}`}>×</button></div>)}</div> : null}
              </> : <p className="mt-1 text-sm text-stone-700">Passez au plan Premium Growth pour présenter votre travail en vidéo.</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">Liens de réalisations</label>
              <p className="mt-1 text-xs text-stone-500">Ajoutez votre site, portfolio, Instagram, Facebook ou toute page présentant votre travail.</p>
              {externalUrls.map((url, index) => <div key={index} className="mt-2 flex gap-2"><input type="url" aria-label={`Lien site ou réseau social ${index + 1}`} value={url} onChange={(event) => setExternalUrls((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="Site, Instagram, Facebook, TikTok : https://..." className="field flex-1" /><button type="button" onClick={() => setExternalUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-md border border-stone-300 px-3 text-sm">×</button></div>)}
              {externalUrls.length < 5 ? <button type="button" onClick={() => setExternalUrls((current) => [...current, ''])} className="mt-2 text-sm font-medium text-amber-700 underline">+ Ajouter un lien</button> : null}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 rounded-md bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800"
              >
                {editingId ? 'Mettre à jour' : 'Créer le service'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="flex-1 rounded-md border border-stone-300 bg-white px-4 py-2 font-medium text-stone-700 hover:bg-stone-50"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {!services || services.length === 0 ? (
          <p className="rounded-lg border border-stone-200 bg-stone-50 p-6 text-center text-stone-600">
            Vous n'avez pas encore créé de service.
          </p>
        ) : (
          services.map((service: Service) => (
            <div key={service.id} className="rounded-lg border border-stone-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{service.title}</h3>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                        statusColors[service.status]
                      }`}
                    >
                      {statusLabels[service.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">{service.description}</p>

                  <div className="mt-4 flex flex-wrap gap-4">
                    <div>
                      <p className="text-xs text-stone-500 uppercase">Catégorie</p>
                      <p className="font-medium">
                        {categoryLabel(service.category)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500 uppercase">Délai estimé</p>
                      <p className="font-medium">{service.estimatedDays} jours</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500 uppercase">Prix</p>
                      <p className="font-medium">
                        {service.price
                          ? `${service.price} CFA`
                          : service.priceMin && service.priceMax
                            ? `${service.priceMin} - ${service.priceMax} CFA`
                            : 'Sur devis'}
                      </p>
                    </div>
                  </div>

                  {service.tags && service.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {service.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {service.validationFeedback && (
                    <div className="mt-3 rounded-md bg-orange-50 p-3">
                      <p className="text-xs font-medium text-orange-800">Feedback admin :</p>
                      <p className="mt-1 text-sm text-orange-900">{service.validationFeedback}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {service.status === 'draft' && (
                    <>
                      <button
                        onClick={() => handleEdit(service)}
                        className="rounded-md bg-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handlePublish(service.id)}
                        className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800"
                      >
                        Publier
                      </button>
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
                      >
                        Supprimer
                      </button>
                    </>
                  )}

                  {service.status === 'validation_requested' && (
                    <>
                      <button
                        onClick={() => handleEdit(service)}
                        className="rounded-md bg-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handlePublish(service.id)}
                        className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800"
                      >
                        Renvoyer
                      </button>
                    </>
                  )}

                  {service.status === 'rejected' && (
                    <>
                      <button
                        onClick={() => handleEdit(service)}
                        className="rounded-md bg-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handlePublish(service.id)}
                        className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800"
                      >
                        Renvoyer
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
