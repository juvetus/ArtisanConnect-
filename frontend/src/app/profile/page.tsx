'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Shop, User } from '@/lib/types';

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
  const router = useRouter();
  const [name, setName] = useState(user.name ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [whatsappPhone, setWhatsappPhone] = useState(user.whatsappPhone ?? user.phone ?? '');
  const [location, setLocation] = useState(user.location ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { data: shops, isLoading: shopsLoading } = useSWR<Shop[]>(user.role === 'artisan' ? ['profile-shops', user.id] : null, api.myShops);

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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">ArtisanConnect</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">Mon profil</h1>
        <p className="mt-2 text-stone-600">Mettez à jour vos informations de contact et le numéro utilisé par WhatsApp.</p>
      </header>
      <form onSubmit={save} className="space-y-5 rounded-lg border border-stone-200 bg-white p-6">
        <div>
          <label htmlFor="profile-name" className="block text-sm font-medium text-stone-700">Nom ou raison sociale</label>
          <input id="profile-name" required value={name} onChange={(event) => setName(event.target.value)} className="field mt-1" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-phone" className="block text-sm font-medium text-stone-700">Téléphone du profil</label>
            <input id="profile-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+237... ou +33..." className="field mt-1" />
          </div>
          <div>
            <label htmlFor="profile-whatsapp" className="block text-sm font-medium text-stone-700">Téléphone WhatsApp</label>
            <input id="profile-whatsapp" type="tel" value={whatsappPhone} onChange={(event) => setWhatsappPhone(event.target.value)} placeholder="+237... ou +33..." className="field mt-1" />
          </div>
        </div>
        <p className="-mt-2 text-xs text-stone-500">Le numéro WhatsApp est utilisé par les clients pour vous contacter. Il peut être différent du numéro Mobile Money de votre boutique.</p>
        <div>
          <label htmlFor="profile-location" className="block text-sm font-medium text-stone-700">Ville et pays</label>
          <input id="profile-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Douala, Cameroun" className="field mt-1" />
        </div>
        <div>
          <label htmlFor="profile-bio" className="block text-sm font-medium text-stone-700">Présentation</label>
          <textarea id="profile-bio" rows={5} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Présentez votre activité..." className="field mt-1" />
        </div>
        {notice ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p> : null}
        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className="rounded-md bg-amber-700 px-5 py-2.5 font-medium text-white hover:bg-amber-800 disabled:opacity-60">{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</button>
          <button type="button" onClick={() => router.back()} className="rounded-md border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50">Retour</button>
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