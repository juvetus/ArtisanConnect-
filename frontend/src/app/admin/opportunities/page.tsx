'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { opportunityDate, type Opportunity } from '@/lib/opportunities';
import { OpportunityTradePicker } from '@/components/OpportunityTradePicker';

const sourceGroups = [
  ['public', 'Marchés publics Cameroun — priorité 1', 'Cameroon public procurement — priority 1'],
  ['aggregator', 'Agrégateurs', 'Aggregators'],
  ['un', 'Nations Unies et programmes', 'United Nations and programmes'],
  ['council', 'Mairies du Mfoundi', 'Mfoundi councils'],
  ['company', 'Grandes entreprises', 'Major companies'],
] as const;
const sourceStatuses = {
  automatic: ['Collecte automatique', 'Automatic collection'],
  manual: ['Consultation manuelle', 'Manual review'],
  blocked: ['Connecteur bloqué — non activé', 'Connector blocked — not enabled'],
  covered: ['Via une source existante', 'Through an existing source'],
  planned: ['Connecteur à développer', 'Connector planned'],
};

function localDeadline(value: string | null) {
  return value ? new Date(value).toLocaleString('sv-SE', { timeZone: 'Africa/Douala' }).slice(0, 16).replace(' ', 'T') : '';
}

function ReviewNotice({ item, trades, writable, onAction, busy }: {
  item: Opportunity; trades: string[]; writable: boolean; onAction: (run: () => Promise<unknown>) => Promise<void>; busy: boolean;
}) {
  const { language } = useLanguage();
  const en = language === 'en';
  const [form, setForm] = useState({
    title: item.title, organization: item.organization, location: item.location,
    summary: item.summary, trades: item.trades, deadline: localDeadline(item.deadline),
  });
  return (
    <article className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap justify-between gap-2"><p className="text-xs font-medium uppercase text-amber-800">{item.source} · {item.reference}</p><span className="rounded-full bg-stone-100 px-3 py-1 text-xs">{item.status === 'draft' ? (en ? 'Draft' : 'Brouillon') : item.status === 'published' ? (en ? 'Published' : 'Publié') : (en ? 'Archived' : 'Archivé')}</span></div>
      <h2 className="text-lg font-semibold">{item.title}</h2>
      <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-800 underline">{en ? 'Check source notice' : 'Vérifier l’avis source'}</a>
      {item.source === 'sangobids' && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">{en ? 'Aggregator link: the imported title is derived from the URL and may be truncated. Check the original official notice, exact deadline and existing ARMP/UNGM notices before publication.' : 'Lien d’agrégateur : le titre importé provient de l’URL et peut être tronqué. Vérifiez l’avis officiel d’origine, l’échéance exacte et les avis ARMP/UNGM déjà présents avant publication.'}</p>}
      <p className="text-sm">{en ? 'Deadline' : 'Échéance'} : {opportunityDate(item.deadline, language)} ({en ? 'Cameroon time' : 'heure du Cameroun'})</p>
      {item.analysisError && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">{en ? 'AI analysis' : 'Analyse IA'} : {item.analysisError}</p>}
      {item.status === 'draft' && writable ? (
        <form className="space-y-4 border-t border-stone-100 pt-4" onSubmit={(event) => {
          event.preventDefault();
          void onAction(() => api.publishOpportunity(item.id, { ...form, deadline: new Date(`${form.deadline}:00+01:00`).toISOString() }));
        }}>
          <label className="block text-sm">{en ? 'Title' : 'Titre'}<textarea required maxLength={1200} className="field mt-1" rows={2} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">{en ? 'Organization' : 'Organisme'}<input required maxLength={200} className="field mt-1" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} /></label><label className="block text-sm">{en ? 'Location' : 'Localisation'}<input required maxLength={200} className="field mt-1" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label></div>
          <label className="block text-sm">{en ? 'Verified summary' : 'Résumé vérifié'}<textarea required rows={3} maxLength={2000} className="field mt-1" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></label>
          <label className="block text-sm">{en ? 'Verified deadline (Cameroon time, UTC+1)' : 'Échéance vérifiée (heure du Cameroun, UTC+1)'}<input required type="datetime-local" className="field mt-1" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label>
          <OpportunityTradePicker trades={trades} value={form.trades} onChange={(value) => setForm({ ...form, trades: value })} disabled={busy} />
          <p className="text-xs text-stone-600">{en ? 'Check the source, deadline, trades and eligibility requirements. Publication queues alerts for subscribed, matching, formalized artisans.' : 'Vérifiez la source, la date limite, les métiers et les conditions du dossier. La publication prépare les alertes pour les artisans formalisés abonnés aux métiers concernés.'}</p>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy || !form.trades.length} className="rounded-md bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50">{en ? 'Validate and publish' : 'Valider et publier'}</button>
            <button type="button" disabled={busy} onClick={() => void onAction(async () => { const result = await api.analyzeOpportunity(item.id); setForm((current) => ({ ...current, summary: result.summary, trades: result.trades })); })} className="rounded-md border border-amber-300 px-4 py-2 text-sm text-amber-800 disabled:opacity-50">{en ? 'Analyze trades with AI' : 'Analyser les métiers par IA'}</button>
          </div>
          {item.analysisStatus === 'done' && item.summary !== form.summary && <div className="space-y-2 rounded-md bg-amber-50 p-3 text-sm"><p>{en ? 'An AI suggestion is available. Applying it replaces only the summary and trades.' : 'Une suggestion IA est disponible. L’appliquer remplace uniquement le résumé et les métiers.'}</p><p>{item.summary}</p><button type="button" disabled={busy} onClick={() => setForm((current) => ({ ...current, summary: item.summary, trades: item.trades }))} className="text-amber-800 underline">{en ? 'Apply suggestion' : 'Appliquer la suggestion'}</button></div>}
        </form>
      ) : <p className="whitespace-pre-wrap text-sm text-stone-600">{item.summary}</p>}
      {writable && item.status !== 'archived' && <button type="button" disabled={busy} onClick={() => void onAction(() => api.archiveOpportunity(item.id))} className="text-sm text-red-700 underline disabled:opacity-50">{en ? 'Archive / remove from circulation' : 'Archiver / retirer de la diffusion'}</button>}
    </article>
  );
}

export default function AdminOpportunitiesPage() {
  const { user, ready } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const allowed = ready && user && ['admin', 'editor', 'viewer'].includes(user.role);
  const writable = Boolean(user && ['admin', 'editor'].includes(user.role));
  const [skip, setSkip] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [manual, setManual] = useState({ title: '', sourceUrl: '', organization: '', location: 'Cameroun', reference: '', deadline: '' });
  const { data: dashboard, error: dashboardError, mutate: refreshDashboard } = useSWR(allowed ? ['opportunity-admin-dashboard', user.id] : null, api.opportunityAdminDashboard, { refreshInterval: 10000 });
  const { data, error: listError, mutate } = useSWR(allowed ? ['opportunity-admin-notices', user.id, skip] : null, () => api.opportunityAdminNotices(skip), { refreshInterval: 10000 });
  async function action(run: () => Promise<unknown>) {
    setBusy(true); setError(''); setNotice('');
    try { await run(); await Promise.all([mutate(), refreshDashboard()]); }
    catch (err) { setError(err instanceof Error ? err.message : (en ? 'Action failed' : 'Action impossible')); }
    finally { setBusy(false); }
  }
  if (!ready) return <p>{en ? 'Loading…' : 'Chargement…'}</p>;
  if (!allowed) return <p>{en ? 'Administration access required.' : 'Accès administration requis.'}</p>;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header><h1 className="text-3xl font-semibold">{en ? 'Tender monitoring' : 'Veille des appels d’offres'}</h1><p className="mt-2 text-stone-600">{en ? 'Collection → AI trade suggestions → human validation → opted-in alerts. No bid is submitted automatically.' : 'Collecte → suggestion des métiers par IA → validation humaine → alertes sur abonnement. Aucune soumission automatique aux marchés.'}</p></header>
      {(error || dashboardError || listError) && <p role="alert" className="rounded-md bg-red-50 p-4 text-red-700">{error || dashboardError?.message || listError?.message}</p>}
      {notice && <p role="status" className="rounded-md bg-green-50 p-4 text-green-800">{notice}</p>}
      {dashboard && <>
        <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-xl font-semibold">{en ? 'Sources & monitoring' : 'Sources et suivi'}</h2>
          <p className="text-sm">{en ? 'Daily collection at 06:00 (Cameroon)' : 'Collecte quotidienne à 06 h (Cameroun)'} : <strong>{dashboard.scheduled ? (en ? 'Enabled' : 'Activée') : (en ? 'Disabled — set OPPORTUNITY_WATCH_ENABLED=true' : 'Désactivée — définir OPPORTUNITY_WATCH_ENABLED=true')}</strong></p>
          <p className="text-sm text-stone-600">{en ? 'Only sources marked “Automatic collection” are fetched. Other links require manual review; missing URLs are not invented. Coverage is not exhaustive.' : 'Seules les sources marquées « Collecte automatique » sont interrogées. Les autres liens nécessitent une consultation manuelle ; les URL manquantes ne sont pas inventées. La couverture n’est pas exhaustive.'}</p>
          {sourceGroups.map(([group, fr, english]) => <details key={group} open={group === 'public' || group === 'aggregator'} className="rounded-md border border-stone-200 p-3">
            <summary className="cursor-pointer font-semibold">{en ? english : fr} ({dashboard.sources.filter((source) => source.group === group).length})</summary>
            <ul className="mt-3 space-y-3 text-sm">{dashboard.sources.filter((source) => source.group === group).map((source) => <li key={source.key}>
              <div>{source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-amber-800 underline">{source.name}</a> : <strong>{source.name}</strong>} <span className={`ml-2 inline-block rounded px-2 py-1 text-xs ${source.automatic ? 'bg-green-50 text-green-800' : 'bg-stone-100 text-stone-700'}`}>{sourceStatuses[source.status][en ? 1 : 0]}</span></div>
              <p className="mt-1 text-stone-600">{en ? source.noteEn : source.note}</p>
            </li>)}</ul>
          </details>)}
          <p className="text-sm">{dashboard.drafts} {en ? 'drafts' : 'brouillons'} · {dashboard.published} {en ? 'published' : 'publiés'}</p>
          {writable && <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={() => void action(async () => { await api.collectOpportunities(); setNotice(en ? 'Collection queued. It starts within a minute; follow progress in the logs below.' : 'Collecte mise en attente. Elle démarre sous une minute ; suivez sa progression dans les journaux ci-dessous.'); })} className="rounded-md bg-amber-700 px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? (en ? 'Working…' : 'Traitement…') : (en ? 'Collect now' : 'Collecter maintenant')}</button><button disabled={busy} onClick={() => void action(async () => { const result = await api.dispatchOpportunityAlerts(); setNotice(`${result.processed} ${en ? 'alerts processed. Check channel delivery statuses below.' : 'alertes traitées. Vérifiez les états de livraison ci-dessous.'}`); })} className="rounded-md border border-stone-300 px-4 py-2 text-sm disabled:opacity-50">{en ? 'Process pending alerts' : 'Traiter les alertes en attente'}</button></div>}
        </section>
        <details className="rounded-lg border border-stone-200 bg-white p-5"><summary className="cursor-pointer font-semibold">{en ? 'Collection and delivery logs' : 'Journaux des collectes et des alertes'}</summary><div className="mt-4 space-y-3 text-sm">
          {!dashboard.runs.length && <p>{en ? 'No collection run yet.' : 'Aucune collecte effectuée.'}</p>}
          {dashboard.runs.map((run) => <p key={run.id}><strong>{run.source}</strong> · {opportunityDate(run.createdAt, language)} · {run.status} · {run.fetched} {en ? 'found' : 'trouvés'} / {run.imported} {en ? 'imported' : 'importés'}{run.error && <span className="block text-red-700">{run.error}</span>}</p>)}
          <h3 className="border-t pt-3 font-semibold">{en ? 'Alerts' : 'Alertes'}</h3>
          <p>{dashboard.deliveries.counts.map((row) => `${row.status} : ${row.count}`).join(' · ') || (en ? 'No delivery yet' : 'Aucun envoi')}</p>
          {dashboard.deliveries.items.filter((item) => item.error).map((item) => <p key={item.id} className="text-red-700">{item.channel} · {item.status} : {item.error}</p>)}
          <p className="text-xs text-stone-600">{en ? '“sent” means accepted by the channel, not read. Failed or interrupted external sends are not retried automatically to avoid duplicate messages.' : '« sent » signifie accepté par le canal, pas lu. Les envois externes échoués ou interrompus ne sont pas relancés automatiquement afin d’éviter les doublons.'}</p>
        </div></details>
      </>}
      {writable && <details className="rounded-lg border border-stone-200 bg-white p-5"><summary className="cursor-pointer font-semibold">{en ? 'Add an opportunity manually' : 'Ajouter une opportunité manuellement'}</summary><form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void action(async () => { await api.createManualOpportunity({ ...manual, deadline: manual.deadline ? new Date(`${manual.deadline}:00+01:00`).toISOString() : null }); setManual({ title: '', sourceUrl: '', organization: '', location: 'Cameroun', reference: '', deadline: '' }); setSkip(0); setNotice(en ? 'Draft created.' : 'Brouillon créé.'); }); }}>
        <label className="block text-sm">{en ? 'Title' : 'Titre'}<input required maxLength={1200} className="field mt-1" value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} /></label>
        <label className="block text-sm">{en ? 'Official source URL (HTTPS)' : 'Lien officiel (HTTPS)'}<input required type="url" maxLength={2000} className="field mt-1" value={manual.sourceUrl} onChange={(e) => setManual({ ...manual, sourceUrl: e.target.value })} /></label>
        <label className="block text-sm">{en ? 'Organization' : 'Organisme'}<input required maxLength={200} className="field mt-1" value={manual.organization} onChange={(e) => setManual({ ...manual, organization: e.target.value })} /></label>
        <label className="block text-sm">{en ? 'Location' : 'Localisation'}<input required maxLength={200} className="field mt-1" value={manual.location} onChange={(e) => setManual({ ...manual, location: e.target.value })} /></label>
        <label className="block text-sm">{en ? 'Reference' : 'Référence'}<input maxLength={200} className="field mt-1" value={manual.reference} onChange={(e) => setManual({ ...manual, reference: e.target.value })} /></label>
        <label className="block text-sm">{en ? 'Deadline (Cameroon time), optional until publication' : 'Échéance (heure du Cameroun), facultative avant publication'}<input type="datetime-local" className="field mt-1" value={manual.deadline} onChange={(e) => setManual({ ...manual, deadline: e.target.value })} /></label>
        <button disabled={busy} className="rounded-md bg-amber-700 px-4 py-2 text-sm text-white disabled:opacity-50">{en ? 'Create draft' : 'Créer le brouillon'}</button>
      </form></details>}
      {data && dashboard && <section className="space-y-4">
        <label className="block text-sm font-medium">{en ? 'Status filter (current page)' : 'Filtrer par statut (page actuelle)'}<select className="field mt-1" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{en ? 'All statuses' : 'Tous les statuts'}</option><option value="draft">{en ? 'Drafts' : 'Brouillons'}</option><option value="published">{en ? 'Published' : 'Publiés'}</option><option value="archived">{en ? 'Archived' : 'Archivés'}</option></select></label>
        {data.items.filter((item) => !status || item.status === status).map((item) => <ReviewNotice key={`${item.id}-${item.status}`} item={item} trades={dashboard.trades} writable={writable} onAction={action} busy={busy} />)}
        {!data.items.length && <p>{en ? 'No opportunity collected yet.' : 'Aucune opportunité collectée pour le moment.'}</p>}
        <div className="flex items-center justify-between"><button disabled={skip === 0 || busy} onClick={() => setSkip(Math.max(0, skip - 30))} className="rounded border px-3 py-2 disabled:opacity-40">{en ? 'Previous' : 'Précédent'}</button><span className="text-sm">{data.total} {en ? 'notices' : 'avis'}</span><button disabled={skip + 30 >= data.total || busy} onClick={() => setSkip(skip + 30)} className="rounded border px-3 py-2 disabled:opacity-40">{en ? 'Next' : 'Suivant'}</button></div>
      </section>}
    </div>
  );
}
