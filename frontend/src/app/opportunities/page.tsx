'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { opportunityDate, opportunityTradeLabel, type OpportunityPreferences } from '@/lib/opportunities';
import { OpportunityTradePicker } from '@/components/OpportunityTradePicker';

function AlertPreferences({ initial, trades, emailAvailable, whatsappAvailable, onSave }: {
  initial: OpportunityPreferences; trades: string[]; emailAvailable: boolean; whatsappAvailable: boolean; onSave: () => Promise<unknown>;
}) {
  const { language } = useLanguage();
  const en = language === 'en';
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  return (
    <form className="space-y-4 rounded-lg border border-stone-200 bg-white p-5" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setError(''); setNotice('');
      try { await api.saveOpportunityPreferences(form); await onSave(); setNotice(en ? 'Alert preferences saved.' : 'Préférences enregistrées.'); }
      catch (err) { setError(err instanceof Error ? err.message : (en ? 'Could not save preferences.' : 'Enregistrement impossible.')); }
      finally { setBusy(false); }
    }}>
      <h2 className="text-xl font-semibold">{en ? 'My tender alerts' : 'Mes alertes appels d’offres'}</h2>
      <p className="text-sm text-stone-600">{en ? 'Choose your trades and opt in to each channel. Only active formalized or certified artisans receive alerts. You can unsubscribe at any time.' : 'Choisissez vos métiers et les canaux souhaités. Seuls les artisans actifs formalisés ou certifiés reçoivent les alertes. Désabonnement possible à tout moment.'}</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.subscribed} onChange={(e) => setForm({ ...form, subscribed: e.target.checked })} />{en ? 'Subscribe to matching opportunities (in-app notifications)' : 'Recevoir les opportunités correspondantes (notifications internes)'}</label>
      <OpportunityTradePicker trades={trades} value={form.trades} onChange={(value) => setForm({ ...form, trades: value })} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!emailAvailable} checked={form.emailEnabled} onChange={(e) => setForm({ ...form, emailEnabled: e.target.checked })} />{en ? 'Also receive e-mail alerts (verified address)' : 'Recevoir aussi les alertes e-mail (adresse vérifiée)'}</label>
      {!emailAvailable && <p className="text-sm text-stone-600">{en ? 'E-mail alerts are not available yet. In-app notifications remain available.' : 'Les alertes e-mail ne sont pas encore disponibles. Les notifications internes restent disponibles.'}</p>}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!whatsappAvailable} checked={form.whatsappEnabled} onChange={(e) => setForm({ ...form, whatsappEnabled: e.target.checked })} />{en ? 'I agree to receive opportunity alerts on my WhatsApp number' : 'J’accepte de recevoir les alertes opportunités sur mon numéro WhatsApp'}</label>
      {!whatsappAvailable && <p className="text-sm text-stone-600">{en ? 'WhatsApp alerts are not available yet.' : 'Les alertes WhatsApp ne sont pas encore disponibles.'}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
      <button disabled={busy} className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? (en ? 'Saving…' : 'Enregistrement…') : (en ? 'Save preferences' : 'Enregistrer mes préférences')}</button>
    </form>
  );
}

export default function OpportunitiesPage() {
  const { user, ready } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const [skip, setSkip] = useState(0);
  const [trade, setTrade] = useState('');
  const artisan = ready && user?.role === 'artisan';
  const { data: config, error: configError } = useSWR(artisan ? 'opportunity-config' : null, api.opportunityConfig);
  const { data: preferences, error: preferenceError, mutate } = useSWR(artisan ? ['opportunity-preferences', user.id] : null, api.opportunityPreferences);
  const { data, error, isLoading } = useSWR(artisan ? ['opportunities', user.id, skip] : null, () => api.opportunities(skip));
  if (!ready) return <p>{en ? 'Loading…' : 'Chargement…'}</p>;
  if (!artisan) return <p>{en ? 'Sign in with an artisan account to access tender monitoring.' : 'Connectez-vous avec un compte artisan pour accéder à la veille.'}</p>;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header><h1 className="text-3xl font-semibold">{en ? 'Tenders & artisan opportunities' : 'Veille des appels d’offres et opportunités artisanales'}</h1><p className="mt-2 text-stone-600">{en ? 'Public notices reviewed by the team. Always check the official tender documents and eligibility requirements.' : 'Avis publics relus par l’équipe. Consultez toujours le dossier officiel et ses conditions d’éligibilité.'}</p></header>
      {(configError || preferenceError) && <p role="alert" className="text-red-700">{(configError || preferenceError).message}</p>}
      {config && preferences && <AlertPreferences key={user.id} initial={preferences} trades={config.trades} emailAvailable={config.emailAvailable} whatsappAvailable={config.whatsappAvailable} onSave={mutate} />}
      {error ? <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4"><p>{error.message}</p><Link href="/profile" className="mt-2 inline-block text-amber-800 underline">{en ? 'Complete my formalization profile' : 'Compléter mon profil de formalisation'}</Link></div> : null}
      {config && <label className="block text-sm font-medium">{en ? 'Filter this page by trade' : 'Filtrer cette page par métier'}<select className="field mt-1" value={trade} onChange={(event) => setTrade(event.target.value)}><option value="">{en ? 'All trades' : 'Tous les métiers'}</option>{config.trades.map((value) => <option key={value} value={value}>{opportunityTradeLabel(value, language)}</option>)}</select></label>}
      {isLoading && <p>{en ? 'Loading notices…' : 'Chargement des avis…'}</p>}
      {data && !data.items.filter((item) => !trade || item.trades.includes(trade)).length && <p className="rounded-lg bg-stone-50 p-5">{en ? 'No matching notice on this page.' : 'Aucun avis correspondant sur cette page.'}</p>}
      {data?.items.filter((item) => !trade || item.trades.includes(trade)).map((item) => (
        <article key={item.id} className="space-y-3 rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-xs font-medium uppercase text-amber-800">{item.source} · {item.organization} · {item.location}</p>
          <h2 className="text-xl font-semibold"><Link href={`/opportunities/${item.id}`} className="hover:text-amber-800">{item.title}</Link></h2>
          <p className="text-sm text-stone-600">{item.summary}</p>
          <p className="text-sm font-medium">{en ? 'Deadline' : 'Date limite'} : {opportunityDate(item.deadline, language)} ({en ? 'Cameroon time' : 'heure du Cameroun'})</p>
          <p className="text-sm text-stone-600">{item.trades.map((value) => opportunityTradeLabel(value, language)).join(' · ')}</p>
          <Link href={`/opportunities/${item.id}`} className="inline-block text-sm font-medium text-amber-800 underline">{en ? 'View notice and groups' : 'Consulter l’avis et les groupements'}</Link>
        </article>
      ))}
      {data && <div className="flex items-center justify-between gap-3"><button disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - 30))} className="rounded border px-3 py-2 disabled:opacity-40">{en ? 'Previous' : 'Précédent'}</button><span className="text-sm">{data.total} {en ? 'active notices' : 'avis actifs'}</span><button disabled={skip + 30 >= data.total} onClick={() => setSkip(skip + 30)} className="rounded border px-3 py-2 disabled:opacity-40">{en ? 'Next' : 'Suivant'}</button></div>}
    </div>
  );
}
