'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import type { Service, Shop, User } from '@/lib/types';

function ShopPaymentForm({ shop }: { shop: Shop }) {
  const [momoNumber, setMomoNumber] = useState(shop.momoNumber ?? shop.mobileMoneyNumber ?? '');
  const [orangeMoneyNumber, setOrangeMoneyNumber] = useState(shop.orangeMoneyNumber ?? shop.mobileMoneyNumber ?? '');
  const [provider, setProvider] = useState<'momo' | 'orange_money' | 'both'>(shop.mobileMoneyProvider ?? 'both');
  const [deliveryMethods, setDeliveryMethods] = useState<('workshop' | 'home' | 'carrier')[]>(shop.deliveryMethods?.length ? shop.deliveryMethods : [shop.deliveryMode]);
  const [availability, setAvailability] = useState<'available' | 'busy' | 'unavailable'>(shop.availability ?? 'available');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      if ((provider === 'momo' || provider === 'both') && !momoNumber.trim()) throw new Error('Le numéro MoMo est requis.');
      if ((provider === 'orange_money' || provider === 'both') && !orangeMoneyNumber.trim()) throw new Error('Le numéro Orange Money est requis.');
      await api.updateShop(shop.id, { mobileMoneyNumber: momoNumber.trim() || orangeMoneyNumber.trim(), momoNumber: momoNumber.trim(), orangeMoneyNumber: orangeMoneyNumber.trim(), mobileMoneyProvider: provider, deliveryMethods, availability });
      setNotice('Paramètres de la boutique mis à jour.');
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : 'Impossible de mettre à jour les paiements.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
      <div>
        <h2 className="font-semibold text-stone-900">Paiements de la boutique : {shop.name}</h2>
        <p className="mt-1 text-sm text-stone-600">Choisissez les moyens de paiement acceptés par cette boutique.</p>
      </div>
      <div>
        <p className="block text-sm font-medium text-stone-700">Modes de livraison acceptés</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {([
            ['workshop', "Retrait à l'atelier"],
            ['home', 'Livraison à domicile'],
            ['carrier', 'Transporteur'],
          ] as const).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 rounded-md border border-stone-200 p-3 text-sm">
              <input type="checkbox" checked={deliveryMethods.includes(value)} onChange={() => setDeliveryMethods((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} />
              {label}
            </label>
          ))}
        </div>
        {!deliveryMethods.length ? <p className="mt-1 text-xs text-red-700">Sélectionnez au moins un mode de livraison.</p> : null}
      </div>
      <div>
        {provider === 'momo' || provider === 'both' ? <div><label htmlFor={`shop-momo-${shop.id}`} className="block text-sm font-medium text-stone-700">Numéro MoMo</label><input id={`shop-momo-${shop.id}`} required value={momoNumber} onChange={(event) => setMomoNumber(event.target.value)} placeholder="+237..." className="field mt-1" /></div> : null}
        {provider === 'orange_money' || provider === 'both' ? <div className="mt-3"><label htmlFor={`shop-orange-${shop.id}`} className="block text-sm font-medium text-stone-700">Numéro Orange Money</label><input id={`shop-orange-${shop.id}`} required value={orangeMoneyNumber} onChange={(event) => setOrangeMoneyNumber(event.target.value)} placeholder="+237..." className="field mt-1" /></div> : null}
      </div>
      <div>
        <label htmlFor={`shop-availability-${shop.id}`} className="block text-sm font-medium text-stone-700">Disponibilité affichée aux clients</label>
        <select id={`shop-availability-${shop.id}`} value={availability} onChange={(event) => setAvailability(event.target.value as typeof availability)} className="field mt-1">
          <option value="available">Disponible pour de nouveaux projets</option>
          <option value="busy">Peu de disponibilité en ce moment</option>
          <option value="unavailable">Indisponible actuellement</option>
        </select>
      </div>
      <div>
        <label htmlFor={`shop-provider-${shop.id}`} className="block text-sm font-medium text-stone-700">Moyens acceptés</label>
        <select id={`shop-provider-${shop.id}`} value={provider} onChange={(event) => setProvider(event.target.value as typeof provider)} className="field mt-1">
          <option value="both">MoMo et Orange Money</option>
          <option value="momo">MoMo uniquement</option>
          <option value="orange_money">Orange Money uniquement</option>
        </select>
      </div>
      {notice ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p> : null}
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button type="submit" disabled={saving || !deliveryMethods.length} className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60">{saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}</button>
    </form>
  );
}

function ProfileForm({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [name, setName] = useState(user.name ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [whatsappPhone, setWhatsappPhone] = useState(user.whatsappPhone ?? user.phone ?? '');
  const [location, setLocation] = useState(user.location ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [bioSuggestion, setBioSuggestion] = useState('');
  const [suggestingBio, setSuggestingBio] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { data: shops, isLoading: shopsLoading } = useSWR<Shop[]>(user.role === 'artisan' ? ['profile-shops', user.id] : null, api.myShops);
  const { data: services } = useSWR<Service[]>(user.role === 'artisan' ? ['profile-services', user.id] : null, () => api.getMyServices());

  const suggestBio = async () => {
    setSuggestingBio(true);
    setError('');
    setNotice('');
    try {
      const categories = [...new Set([...(shops ?? []).map((shop) => shop.category), ...(services ?? []).map((service) => service.category)].filter((value): value is string => Boolean(value)))];
      const serviceNames = (services ?? []).map((service) => service.title).filter(Boolean);
      const context = [
        `Nom : ${name || 'non précisé'}`,
        `${language === 'en' ? 'Location' : 'Ville'}: ${location || shops?.find((shop) => shop.city)?.city || (language === 'en' ? 'not specified' : 'non précisée')}`,
        `${language === 'en' ? 'Trades' : 'Métiers'}: ${categories.join(', ') || (language === 'en' ? 'to specify' : 'à préciser')}`,
        `${language === 'en' ? 'Services' : 'Services'}: ${serviceNames.join(', ') || (language === 'en' ? 'to specify' : 'à préciser')}`,
        `${language === 'en' ? 'Current description' : 'Description actuelle'}: ${bio || (language === 'en' ? 'none' : 'aucune')}`,
      ].join('\n');
      const result = await api.assistantGenerate({
        task: 'presentation',
        input: language === 'en'
          ? `Write a public profile description for this artisan, under 150 words. Mention only skills and services confirmed below. Do not invent experience, certifications, or years in business. ${bio ? 'Improve the existing description without adding facts.' : 'If details are missing, stay general and mark what should be completed.'}`
          : `Rédige une description pour le profil public de cet artisan. Limite-la à 150 mots. Mets en avant uniquement les savoir-faire et services confirmés par les informations ci-dessous. N’invente ni expérience, ni certification, ni ancienneté. ${bio ? 'Améliore la description existante sans ajouter de faits.' : 'Si les informations sont insuffisantes, reste général et indique les éléments à compléter.'}`,
        context,
        language,
      });
      setBioSuggestion(result.content);
    } catch (suggestionError) {
      setError(suggestionError instanceof ApiError ? suggestionError.message : 'Impossible de préparer une suggestion de description.');
    } finally {
      setSuggestingBio(false);
    }
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const updated = await api.updateProfile(user.id, { name: name.trim(), phone: phone.trim(), whatsappPhone: whatsappPhone.trim(), location: location.trim(), bio: bio.trim() });
      updateUser(updated);
      setNotice('Profil mis à jour avec succès.');
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : 'Impossible de mettre à jour le profil.');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    setNotice('');
    setError('');
    try {
      const result = await api.uploadAvatar(file);
      setAvatarUrl(result.avatarUrl);
      updateUser({ avatarUrl: result.avatarUrl });
      setNotice('Photo de profil mise à jour.');
    } catch (uploadError) {
      setError(uploadError instanceof ApiError ? uploadError.message : 'Impossible de téléverser cette photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">ArtisanConnect</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">{t('profile_title')}</h1>
        <p className="mt-2 text-stone-600">{t('profile_subtitle')}</p>
      </header>
      <form onSubmit={save} className="space-y-5 rounded-lg border border-stone-200 bg-white p-6">
        <div>
          <label htmlFor="profile-avatar" className="block text-sm font-medium text-stone-700">{t('profile_photo')}</label>
          <div className="mt-2 flex items-center gap-4">
            {avatarUrl ? <img src={avatarUrl} alt={t('profile_photo_alt')} className="h-20 w-20 rounded-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-2xl font-semibold text-amber-800" aria-hidden>{name.charAt(0).toUpperCase()}</div>}
            <div>
              <input id="profile-avatar" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingAvatar} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); }} className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-amber-700 file:px-3 file:py-2 file:font-medium file:text-white hover:file:bg-amber-800" />
              <p className="mt-1 text-xs text-stone-500">{t('profile_photo_help')}</p>
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="profile-name" className="block text-sm font-medium text-stone-700">{t('profile_name')}</label>
          <input id="profile-name" required value={name} onChange={(event) => setName(event.target.value)} className="field mt-1" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-phone" className="block text-sm font-medium text-stone-700">{t('profile_phone')}</label>
            <input id="profile-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+237... ou +33..." className="field mt-1" />
          </div>
          <div>
            <label htmlFor="profile-whatsapp" className="block text-sm font-medium text-stone-700">{t('profile_whatsapp')}</label>
            <input id="profile-whatsapp" type="tel" value={whatsappPhone} onChange={(event) => setWhatsappPhone(event.target.value)} placeholder="+237... ou +33..." className="field mt-1" />
          </div>
        </div>
        <p className="-mt-2 text-xs text-stone-500">{t('profile_whatsapp_help')}</p>
        <div>
          <label htmlFor="profile-location" className="block text-sm font-medium text-stone-700">{t('profile_location')}</label>
          <input id="profile-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Douala, Cameroun" className="field mt-1" />
        </div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="profile-bio" className="block text-sm font-medium text-stone-700">{t('profile_bio')}</label>
            {user.role === 'artisan' ? <button type="button" disabled={suggestingBio} onClick={() => void suggestBio()} className="rounded-md border border-amber-700 px-3 py-1.5 text-sm font-medium text-amber-800 disabled:opacity-50">{suggestingBio ? 'Préparation…' : 'Suggérer une description avec l’IA'}</button> : null}
          </div>
          <textarea id="profile-bio" rows={5} value={bio} onChange={(event) => setBio(event.target.value)} placeholder={t('profile_bio_placeholder')} className="field mt-1" />
          {user.role === 'artisan' ? <p className="mt-1 text-xs text-stone-500">La suggestion est un brouillon : vérifiez-la et appliquez-la vous-même.</p> : null}
          {bioSuggestion ? <div className="mt-3 space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4"><p className="whitespace-pre-wrap text-sm text-stone-800">{bioSuggestion}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setBio(bioSuggestion); setBioSuggestion(''); }} className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800">Utiliser cette suggestion</button><button type="button" onClick={() => setBioSuggestion('')} className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700">Ignorer</button></div></div> : null}
        </div>
        {notice ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p> : null}
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className="rounded-md bg-amber-700 px-5 py-2.5 font-medium text-white hover:bg-amber-800 disabled:opacity-60">{saving ? t('profile_saving') : t('profile_save')}</button>
          <button type="button" onClick={() => router.back()} className="rounded-md border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50">{t('profile_back')}</button>
        </div>
      </form>
      {user.role === 'artisan' ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Paramètres des boutiques</h2>
            <p className="mt-1 text-sm text-stone-600">Modifiez le numéro Mobile Money et les moyens de paiement acceptés par chaque boutique.</p>
          </div>
          {shopsLoading ? <p className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600">Chargement des boutiques...</p> : null}
          {!shopsLoading && !shops?.length ? <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Aucune boutique n’est encore associée à ce profil. Créez une boutique pour configurer ses paiements.</p> : null}
          {shops?.map((shop) => <ShopPaymentForm key={shop.id} shop={shop} />)}
        </section>
      ) : null}
    </div>
  );
}

export default function ProfilePage() {
  const { user, ready } = useAuth();
  if (!ready) return <p className="text-stone-600">Chargement...</p>;
  if (!user) return <p className="text-stone-600">Connectez-vous pour modifier votre profil.</p>;
  return <ProfileForm key={user.id} user={user} />;
}