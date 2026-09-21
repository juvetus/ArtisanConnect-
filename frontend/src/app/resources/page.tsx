'use client';

import useSWR from 'swr';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import type { ResourceType } from '@/lib/types';

export default function ResourcesPage() {
  const { user, ready } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [activeProgram, setActiveProgram] = useState<string | null>(null);
  const [motivation, setMotivation] = useState('');
  const [notice, setNotice] = useState('');

  const resourceTypeLabels: Record<ResourceType, string> = {
    training: language === 'en' ? 'Training' : 'Formation',
    guide: language === 'en' ? 'Guide' : 'Guide',
    template: language === 'en' ? 'Template' : 'Modèle',
  };

  useEffect(() => {
    if (ready && user?.role !== 'artisan' && user?.role !== 'admin') router.replace('/');
  }, [ready, user, router]);

  const { data: resources, isLoading: resourcesLoading } = useSWR(ready && (user?.role === 'artisan' || user?.role === 'admin') ? 'institution-resources' : null, api.institutionResources);

  const { data: programs, isLoading: programsLoading } = useSWR(ready && (user?.role === 'artisan' || user?.role === 'admin') ? 'institution-programs' : null, api.institutionPrograms);

  if (!ready || (user?.role !== 'artisan' && user?.role !== 'admin')) return <p className="text-stone-600">{t('action_loading')}</p>;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('nav_resources')}</p>
        <h1 className="mt-1 text-3xl font-semibold">{t('resources_title')}</h1>
        <p className="mt-2 max-w-2xl text-stone-600">{t('resources_subtitle')}</p>
      </header>
      
      <section>
        <h2 className="text-xl font-semibold">{t('resources_trainings_docs')}</h2>
        {resourcesLoading ? <p className="mt-3 text-stone-600">{t('action_loading')}</p> : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(resources ?? []).map((resource) => (
              <article key={resource.id} className="flex flex-col rounded-lg border border-stone-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">{resourceTypeLabels[resource.type]}</span>
                  <span className="text-xs text-stone-500">{resource.theme}</span>
                </div>
                <h3 className="mt-4 font-semibold">{resource.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-stone-600">{resource.description}</p>
                {resource.contentUrl && <a href={resource.contentUrl} target="_blank" rel="noreferrer" className="mt-4 text-sm font-medium text-amber-700 underline">Ouvrir le document ↗</a>}
                {resource.pdfUrls?.map((url, index) => <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="mt-2 text-sm font-medium text-amber-700 underline">PDF {index + 1} ↗</a>)}
              </article>
            ))}
            {!resources?.length && <p className="text-stone-600">{language === 'en' ? 'No resources published yet.' : 'Aucune ressource publiée pour le moment.'}</p>}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('resources_programs')}</h2>
        {programsLoading ? <p className="mt-3 text-stone-600">{t('action_loading')}</p> : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(programs ?? []).map((program) => (
              <article key={program.id} className="rounded-lg border border-stone-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{program.title}</h3>
                  <span className="text-xs capitalize text-stone-500">{program.type}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600">{program.description}</p>
                {program.eligibility && <p className="mt-3 border-t border-stone-100 pt-3 text-sm text-stone-600"><strong>{language === 'en' ? 'Eligibility:' : 'Éligibilité :'}</strong> {program.eligibility}</p>}
                {program.pdfUrls?.map((url, index) => <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="mt-3 block text-sm font-medium text-amber-700 underline">PDF {index + 1} ↗</a>)}
                {user?.role === 'artisan' ? <button onClick={() => { setActiveProgram(program.id); setMotivation(''); setNotice(''); }} className="mt-4 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">{t('resources_apply_button')}</button> : null}
              </article>
            ))}
            {!programs?.length && <p className="text-stone-600">{language === 'en' ? 'No open programs currently.' : 'Aucun programme ouvert pour le moment.'}</p>}
          </div>
        )}
      </section>
      {activeProgram ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setActiveProgram(null)}><div className="w-full max-w-lg rounded-lg bg-white p-6" onClick={(event) => event.stopPropagation()}><h2 className="text-xl font-semibold">{t('resources_apply_modal_title')}</h2><p className="mt-2 text-sm text-stone-600">{t('resources_apply_modal_desc')}</p><textarea value={motivation} onChange={(event) => setMotivation(event.target.value)} minLength={30} rows={6} placeholder={t('resources_motivation_placeholder')} className="field mt-4" />{notice ? <p className="mt-2 text-sm text-stone-600">{notice}</p> : null}<div className="mt-4 flex justify-end gap-3"><button onClick={() => setActiveProgram(null)} className="rounded-md border border-stone-300 px-4 py-2 text-sm">{t('action_cancel')}</button><button disabled={motivation.trim().length < 30} onClick={async () => { try { await api.applyToProgram(activeProgram, motivation); setNotice(t('resources_application_sent')); setMotivation(''); } catch (error) { setNotice(error instanceof Error ? error.message : 'Candidature impossible.'); } }} className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white disabled:bg-stone-300">{t('resources_send_application')}</button></div></div></div> : null}
    </div>
  );
}
