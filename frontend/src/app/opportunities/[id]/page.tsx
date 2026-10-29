'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { opportunityDate, opportunityTradeLabel } from '@/lib/opportunities';

export default function OpportunityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, ready } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const [form, setForm] = useState({ name: '', description: '', capacity: 5 });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const active = ready && user?.role === 'artisan';
  const { data, error } = useSWR(active ? ['opportunity', id, user.id] : null, () => api.opportunity(id), { refreshInterval: 30000 });
  const { data: groups, error: groupError, mutate } = useSWR(active ? ['opportunity-groups', id, user.id] : null, () => api.opportunityGroups(id), { refreshInterval: 30000 });
  async function action(run: () => Promise<unknown>) {
    setBusy(true); setActionError('');
    try { await run(); await mutate(); }
    catch (err) { setActionError(err instanceof Error ? err.message : (en ? 'Action failed' : 'Action impossible')); }
    finally { setBusy(false); }
  }
  if (!ready) return <p>{en ? 'Loading…' : 'Chargement…'}</p>;
  if (!active) return <p>{en ? 'An artisan account is required.' : 'Un compte artisan est requis.'}</p>;
  if (error) return <p role="alert" className="text-red-700">{error.message}</p>;
  if (!data) return <p>{en ? 'Loading notice…' : 'Chargement de l’avis…'}</p>;
  const expired = data.closed || !data.deadline;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/opportunities" className="text-sm text-amber-800 underline">{en ? 'Back to opportunities' : 'Retour aux opportunités'}</Link>
      <article className="space-y-4 rounded-lg border border-stone-200 bg-white p-6">
        <p className="text-sm text-amber-800">{data.source.toUpperCase()} · {data.reference}</p>
        <h1 className="text-2xl font-semibold">{data.title}</h1>
        <p className="text-sm text-stone-600">{data.organization} · {data.location}</p>
        <p className="whitespace-pre-wrap">{data.summary}</p>
        <p className="text-sm">{data.trades.map((trade) => opportunityTradeLabel(trade, language)).join(' · ')}</p>
        <p className="font-medium">{en ? 'Deadline' : 'Date limite'} : {opportunityDate(data.deadline, language)} ({en ? 'Cameroon time' : 'heure du Cameroun'})</p>
        <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white">{en ? 'Open official notice' : 'Consulter l’avis officiel'}</a>
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">{en ? 'Trade suggestions are not proof of eligibility. A group here is only a voluntary connection between artisans: it is not a legal consortium or a submitted bid.' : 'Les métiers suggérés ne prouvent pas votre éligibilité au marché. Un groupement ici est une mise en relation volontaire : il ne constitue ni un groupement juridique ni une offre déposée.'}</p>
        {expired && <p className="font-medium text-red-700">{en ? 'This notice is closed.' : 'Cet avis est clôturé.'}</p>}
      </article>
      <h2 className="text-xl font-semibold">{en ? 'Artisan groups' : 'Groupements d’artisans'}</h2>
      {(actionError || groupError) && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{actionError || groupError.message}</p>}
      {groups?.map((group) => {
        const owner = group.ownerId === user.id;
        const ownMembership = group.members.find((member) => member.userId === user.id);
        const accepted = group.members.filter((member) => member.status === 'accepted');
        return (
          <section key={group.id} className="space-y-3 rounded-lg border border-stone-200 bg-white p-5">
            <h3 className="text-lg font-semibold">{group.name}</h3>
            <p className="whitespace-pre-wrap text-sm">{group.description}</p>
            <p className="text-sm text-stone-600">{en ? 'Coordinator' : 'Coordinateur'} : {group.ownerName} · {accepted.length}/{group.capacity} · {group.status === 'closed' ? (en ? 'Closed' : 'Fermé') : (en ? 'Open' : 'Ouvert')}</p>
            <ul className="space-y-2 text-sm">{group.members.map((member) => <li key={member.id} className="flex flex-wrap items-center gap-3"><span>{member.name} — {member.status === 'accepted' ? (en ? 'Accepted' : 'Accepté') : member.status === 'pending' ? (en ? 'Pending' : 'En attente') : (en ? 'Declined' : 'Refusé')}</span>{owner && member.status === 'pending' && !expired && <><button disabled={busy || group.status !== 'open' || accepted.length >= group.capacity} onClick={() => void action(() => api.reviewOpportunityMember(group.id, member.id, true))} className="text-green-800 underline disabled:opacity-40">{en ? 'Accept' : 'Accepter'}</button><button disabled={busy} onClick={() => void action(() => api.reviewOpportunityMember(group.id, member.id, false))} className="text-red-700 underline">{en ? 'Decline' : 'Refuser'}</button></>}</li>)}</ul>
            {!ownMembership && !expired && group.status === 'open' && accepted.length < group.capacity && <button disabled={busy} onClick={() => void action(() => api.joinOpportunityGroup(group.id))} className="rounded-md border border-amber-700 px-3 py-2 text-sm text-amber-800">{en ? 'Request to join' : 'Demander à rejoindre'}</button>}
            {ownMembership && !owner && <button disabled={busy} onClick={() => void action(() => api.leaveOpportunityGroup(group.id))} className="text-sm text-red-700 underline">{en ? 'Leave / withdraw request' : 'Quitter / retirer ma demande'}</button>}
            {ownMembership?.status === 'accepted' && !owner && <Link href={`/messages?to=${group.ownerId}`} className="ml-3 text-sm text-amber-800 underline">{en ? 'Contact the coordinator' : 'Contacter le coordinateur'}</Link>}
            {owner && accepted.filter((member) => member.userId !== user.id).map((member) => <Link key={member.id} href={`/messages?to=${member.userId}`} className="mr-3 inline-block text-sm text-amber-800 underline">{en ? 'Contact' : 'Contacter'} {member.name}</Link>)}
            {owner && group.status === 'open' && <button disabled={busy} onClick={() => void action(() => api.closeOpportunityGroup(group.id))} className="text-sm text-stone-600 underline">{en ? 'Close recruitment' : 'Fermer les adhésions'}</button>}
          </section>
        );
      })}
      {groups?.length === 0 && <p className="text-sm text-stone-600">{en ? 'No group yet. Start one for this notice.' : 'Aucun groupement pour le moment. Créez-en un pour cet avis.'}</p>}
      {!expired && groups && !groups.some((group) => group.ownerId === user.id) && <form className="space-y-4 rounded-lg border border-stone-200 bg-white p-5" onSubmit={(event) => { event.preventDefault(); void action(() => api.createOpportunityGroup(id, form)); }}>
        <h3 className="text-lg font-semibold">{en ? 'Create a group' : 'Créer un groupement'}</h3>
        <label className="block text-sm">{en ? 'Group name' : 'Nom du groupement'}<input required maxLength={100} className="field mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="block text-sm">{en ? 'Skills needed and proposed organization' : 'Compétences recherchées et organisation proposée'}<textarea required maxLength={1000} rows={3} className="field mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label className="block text-sm">{en ? 'Total capacity (including you)' : 'Nombre total de membres (vous compris)'}<input type="number" min={2} max={20} required className="field mt-1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></label>
        <button disabled={busy} className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{en ? 'Create group' : 'Créer le groupement'}</button>
      </form>}
    </div>
  );
}
