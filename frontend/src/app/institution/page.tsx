'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import type { ArtisanFormalization, ProgramType, ResourceType, InstitutionalResource, InstitutionalProgram, ProgramApplication } from '@/lib/types';

export default function InstitutionPage() {
  const { user, ready } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState<'success' | 'error'>('success');
  const [resource, setResource] = useState({ title: '', description: '', type: 'training' as ResourceType, theme: '', contentUrl: '' });
  const [program, setProgram] = useState({ title: '', description: '', type: 'support' as ProgramType, eligibility: '', budget: '', interventionZone: '', startDate: '', endDate: '', objectives: '', targetBeneficiaries: '', impactIndicators: '' });
  const [resourceMedia, setResourceMedia] = useState<{ imageUrls: string[]; videoUrls: string[]; pdfUrls: string[] }>({ imageUrls: [], videoUrls: [], pdfUrls: [] });
  const [programMedia, setProgramMedia] = useState<{ imageUrls: string[]; videoUrls: string[]; pdfUrls: string[] }>({ imageUrls: [], videoUrls: [], pdfUrls: [] });
  const [uploadingMedia, setUploadingMedia] = useState<'resource' | 'program' | null>(null);

  const resourceLabels: Record<ResourceType, string> = {
    training: language === 'en' ? 'Training' : 'Formation',
    guide: language === 'en' ? 'Guide' : 'Guide',
    template: language === 'en' ? 'Template' : 'Modèle',
  };

  const programTypeLabels: Record<ProgramType, string> = {
    support: language === 'en' ? 'Support' : 'Accompagnement',
    funding: language === 'en' ? 'Funding' : 'Financement',
    grant: language === 'en' ? 'Grant' : 'Subvention',
    training: language === 'en' ? 'Training' : 'Formation',
  };

  // États d'édition
  const [editingResource, setEditingResource] = useState<{ id: string; title: string; description: string; type: ResourceType; theme: string; contentUrl: string } | null>(null);
  const [editingProgram, setEditingProgram] = useState<{ id: string; title: string; description: string; type: ProgramType; eligibility: string; budget: string; interventionZone: string; startDate: string; endDate: string; objectives: string; targetBeneficiaries: string; impactIndicators: string; status: 'active' | 'closed' } | null>(null);

  const { data, isLoading, mutate } = useSWR(user?.role === 'institution' ? 'institution-console' : null, async () => {
    const [dashboard, resources, programs, formalizations, applications] = await Promise.all([
      api.institutionDashboard(),
      api.institutionMyResources(),
      api.institutionMyPrograms(),
      api.institutionFormalizations(),
      api.institutionApplications(),
    ]);
    return { dashboard, resources, programs, formalizations, applications };
  });

  useEffect(() => {
    if (ready && user?.role !== 'institution') router.replace('/');
  }, [ready, user, router]);

  if (!ready || user?.role !== 'institution' || isLoading || !data) return <p className="text-stone-600">{t('action_loading')}</p>;

  const publishResource = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.institutionCreateResource({ ...resource, ...resourceMedia });
      setResource({ title: '', description: '', type: 'training', theme: '', contentUrl: '' });
      setResourceMedia({ imageUrls: [], videoUrls: [], pdfUrls: [] });
      setNoticeType('success');
      setNotice(language === 'en' ? 'Resource published successfully.' : 'Ressource publiée avec succès.');
      await mutate();
    } catch (error) {
      setNoticeType('error');
      const message = error instanceof Error ? error.message : 'Erreur lors de la publication';
      setNotice(message);
    }
  };

  const publishProgram = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.institutionCreateProgram({
        ...program,
        ...programMedia,
        budget: program.budget ? Number(program.budget) : undefined,
        impactIndicators: program.impactIndicators.split(',').map((item) => item.trim()).filter(Boolean),
      });
      setProgram({ title: '', description: '', type: 'support', eligibility: '', budget: '', interventionZone: '', startDate: '', endDate: '', objectives: '', targetBeneficiaries: '', impactIndicators: '' });
      setProgramMedia({ imageUrls: [], videoUrls: [], pdfUrls: [] });
      setNoticeType('success');
      setNotice(language === 'en' ? 'Program published successfully.' : 'Programme publié avec succès.');
      await mutate();
    } catch (error) {
      setNoticeType('error');
      const message = error instanceof Error ? error.message : 'Erreur lors de la publication';
      setNotice(message);
    }
  };

  const uploadMedia = async (kind: 'resource' | 'program', files: File[]) => {
    if (!files.length) return;
    setUploadingMedia(kind);
    try {
      const uploaded = await api.institutionUploadMedia(files);
      const setter = kind === 'resource' ? setResourceMedia : setProgramMedia;
      setter((current) => ({ imageUrls: [...current.imageUrls, ...uploaded.imageUrls], videoUrls: [...current.videoUrls, ...uploaded.videoUrls], pdfUrls: [...current.pdfUrls, ...uploaded.pdfUrls] }));
    } catch (error) {
      setNoticeType('error');
      setNotice(error instanceof Error ? error.message : 'Le téléversement a échoué.');
    } finally {
      setUploadingMedia(null);
    }
  };

  const saveEditedResource = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingResource) return;
    try {
      await api.institutionUpdateResource(editingResource.id, {
        title: editingResource.title,
        description: editingResource.description,
        type: editingResource.type,
        theme: editingResource.theme,
        contentUrl: editingResource.contentUrl || undefined,
      });
      setNoticeType('success');
      setNotice(language === 'en' ? 'Resource updated successfully.' : 'Ressource modifiée avec succès.');
      setEditingResource(null);
      await mutate();
    } catch (error) {
      setNoticeType('error');
      const message = error instanceof Error ? error.message : 'Erreur lors de la modification';
      setNotice(message);
    }
  };

  const saveEditedProgram = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingProgram) return;
    try {
      await api.institutionUpdateProgram(editingProgram.id, {
        title: editingProgram.title,
        description: editingProgram.description,
        type: editingProgram.type,
        eligibility: editingProgram.eligibility || undefined,
        budget: editingProgram.budget ? Number(editingProgram.budget) : undefined,
        interventionZone: editingProgram.interventionZone || undefined,
        startDate: editingProgram.startDate || undefined,
        endDate: editingProgram.endDate || undefined,
        objectives: editingProgram.objectives || undefined,
        targetBeneficiaries: editingProgram.targetBeneficiaries || undefined,
        impactIndicators: editingProgram.impactIndicators
          ? editingProgram.impactIndicators.split(',').map((item) => item.trim()).filter(Boolean)
          : [],
        status: editingProgram.status,
      });
      setNoticeType('success');
      setNotice(language === 'en' ? 'Program updated successfully.' : 'Programme modifié avec succès.');
      setEditingProgram(null);
      await mutate();
    } catch (error) {
      setNoticeType('error');
      const message = error instanceof Error ? error.message : 'Erreur lors de la modification';
      setNotice(message);
    }
  };

  const deleteResource = async (id: string) => {
    if (confirm(language === 'en' ? 'Are you sure you want to delete this resource?' : 'Êtes-vous sûr de vouloir supprimer cette ressource ?')) {
      try {
        await api.institutionDeleteResource(id);
        setNoticeType('success');
        setNotice(language === 'en' ? 'Resource deleted successfully.' : 'Ressource supprimée avec succès.');
        await mutate();
      } catch (error) {
        setNoticeType('error');
        const message = error instanceof Error ? error.message : 'Erreur lors de la suppression';
        setNotice(message);
      }
    }
  };

  const deleteProgram = async (id: string) => {
    if (confirm(language === 'en' ? 'Are you sure you want to delete this program?' : 'Êtes-vous sûr de vouloir supprimer ce programme ?')) {
      try {
        await api.institutionDeleteProgram(id);
        setNoticeType('success');
        setNotice(language === 'en' ? 'Program deleted successfully.' : 'Programme supprimé avec succès.');
        await mutate();
      } catch (error) {
        setNoticeType('error');
        const message = error instanceof Error ? error.message : 'Erreur lors de la suppression';
        setNotice(message);
      }
    }
  };

  const review = async (record: ArtisanFormalization, status: ArtisanFormalization['status']) => {
    await api.institutionReviewFormalization(record.id, status);
    await mutate();
  };

  const reviewApplication = async (appId: string, status: 'submitted' | 'in_review' | 'accepted' | 'rejected') => {
    try {
      await api.institutionReviewApplication(appId, status);
      setNoticeType('success');
      setNotice(
        status === 'accepted'
          ? (language === 'en' ? 'Application accepted.' : 'Candidature acceptée.')
          : status === 'rejected'
          ? (language === 'en' ? 'Application rejected.' : 'Candidature refusée.')
          : (language === 'en' ? 'Status updated.' : 'Statut mis à jour.')
      );
      await mutate();
    } catch (error) {
      setNoticeType('error');
      const message = error instanceof Error ? error.message : 'Action impossible';
      setNotice(message);
    }
  };

  const downloadReport = async () => {
    const blob = await api.downloadInstitutionReport();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'artisanconnect-rapport.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const stats = data.dashboard.stats;
  const trainingResources = data.resources.filter((r: InstitutionalResource) => r.type === 'training' || r.type === 'guide');
  const otherPrograms = data.programs;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-stone-200 pb-6">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('institution_badge')}</p>
          <h1 className="mt-1 text-3xl font-semibold text-stone-900">{t('institution_title')}</h1>
          <p className="mt-2 text-stone-600">{t('institution_subtitle')}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-600">
            <span className="rounded-full bg-stone-100 px-3 py-1">{t('institution_tag_verified')}</span>
            <span className="rounded-full bg-stone-100 px-3 py-1">{t('institution_tag_realtime')}</span>
          </div>
        </div>
        <button onClick={downloadReport} className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800">
          {t('institution_download_csv')}
        </button>
      </header>
      {notice && (
        <p className={`rounded-md px-4 py-3 text-sm ${
          noticeType === 'success' 
            ? 'bg-green-50 text-green-800' 
            : 'bg-red-50 text-red-800'
        }`}>
          {notice}
        </p>
      )}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          [t('institution_stats_artisans'), stats.artisans],
          [t('institution_stats_women'), `${stats.womenArtisans ?? 0} (${stats.womenPercentage ?? 0}%)`],
          [t('institution_stats_coops'), `${stats.cooperativeArtisans ?? 0} (${stats.cooperativePercentage ?? 0}%)`],
          [t('institution_stats_applications'), (stats.pendingFormalizations ?? 0) + (stats.approvedFormalizations ?? 0)],
          [t('institution_stats_resources'), stats.resources],
        ].map(([label, value]) => <div key={label} className="rounded-lg border border-stone-200 bg-white p-5"><p className="text-sm text-stone-600">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">{t('institution_program_view')}</p>
            <h2 className="mt-1 text-xl font-semibold text-stone-900">{t('institution_tracking_indicators')}</h2>
          </div>
          <p className="text-xs text-stone-500">{t('institution_updated_on_open')}</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="border-l-4 border-amber-600 bg-amber-50 p-4"><p className="text-sm text-amber-900">{t('institution_approval_rate')}</p><p className="mt-2 text-2xl font-semibold text-amber-950">{stats.pendingFormalizations + stats.approvedFormalizations ? Math.round((stats.approvedFormalizations / (stats.pendingFormalizations + stats.approvedFormalizations)) * 100) : 0}%</p></div>
          <div className="border-l-4 border-rose-600 bg-rose-50 p-4"><p className="text-sm text-rose-900">{t('institution_stats_women')}</p><p className="mt-2 text-2xl font-semibold text-rose-950">{stats.womenArtisans ?? 0} ({stats.womenPercentage ?? 0}%)</p></div>
          <div className="border-l-4 border-indigo-600 bg-indigo-50 p-4"><p className="text-sm text-indigo-900">{t('institution_stats_coops')}</p><p className="mt-2 text-2xl font-semibold text-indigo-950">{stats.cooperativeArtisans ?? 0} ({stats.cooperativePercentage ?? 0}%)</p></div>
          <div className="border-l-4 border-green-600 bg-green-50 p-4"><p className="text-sm text-green-900">{t('institution_active_programs')}</p><p className="mt-2 text-2xl font-semibold text-green-950">{stats.programs}</p></div>
          <div className="border-l-4 border-blue-600 bg-blue-50 p-4"><p className="text-sm text-blue-900">{t('institution_available_resources')}</p><p className="mt-2 text-2xl font-semibold text-blue-950">{stats.resources}</p></div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{t('institution_support_section')}</p>
            <h2 className="text-xl font-semibold">{t('institution_resources_and_programs')}</h2>
          </div>
          <p className="max-w-md text-right text-sm text-stone-500">{t('institution_support_desc')}</p>
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {/* Formations et documents */}
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <h3 className="font-semibold text-amber-700">{t('institution_trainings_docs')}</h3>
            <div className="mt-4 space-y-3">
              {trainingResources.length === 0 && <p className="text-sm text-stone-600">{t('institution_no_resources')}</p>}
              {trainingResources.map((res: InstitutionalResource) => (
                <div key={res.id} className="flex flex-col gap-2 border-l-4 border-amber-700 bg-amber-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-stone-900">{res.title}</p>
                      <p className="text-xs text-stone-600 uppercase tracking-wide">{resourceLabels[res.type as ResourceType]} • {res.theme}</p>
                      <p className="mt-1 text-sm text-stone-700">{res.description}</p>
                      {res.contentUrl && <a href={res.contentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-medium text-amber-700 underline">{t('institution_view_doc')}</a>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setEditingResource({
                          id: res.id,
                          title: res.title,
                          description: res.description,
                          type: res.type as ResourceType,
                          theme: res.theme,
                          contentUrl: res.contentUrl || '',
                        })}
                        className="flex-shrink-0 rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-200"
                      >
                        {t('action_edit')}
                      </button>
                      <button
                        onClick={() => deleteResource(res.id)}
                        className="flex-shrink-0 rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                      >
                        {t('institution_remove_btn')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Programmes d'accompagnement */}
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <h3 className="font-semibold text-amber-700">{t('institution_programs_title')}</h3>
            <div className="mt-4 space-y-3">
              {otherPrograms.length === 0 && <p className="text-sm text-stone-600">{t('institution_no_programs')}</p>}
              {otherPrograms.map((prog: InstitutionalProgram) => (
                <div key={prog.id} className="flex flex-col gap-2 border-l-4 border-green-700 bg-green-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-stone-900">{prog.title}</p>
                      <p className="text-xs text-stone-600 uppercase tracking-wide">{programTypeLabels[prog.type] || prog.type}</p>
                      <p className="mt-1 text-sm text-stone-700">{prog.description}</p>
                      <div className="mt-2 grid gap-2 text-xs text-stone-600 sm:grid-cols-2">
                        <span><strong>{language === 'en' ? 'Zone:' : 'Zone :'}</strong> {prog.interventionZone || (language === 'en' ? 'Not specified' : 'Non précisée')}</span>
                        <span><strong>{language === 'en' ? 'Budget:' : 'Budget :'}</strong> {prog.budget ? `${prog.budget} FCFA` : (language === 'en' ? 'Not specified' : 'Non précisé')}</span>
                        <span><strong>{language === 'en' ? 'Period:' : 'Période :'}</strong> {prog.startDate || '—'} → {prog.endDate || '—'}</span>
                        <span><strong>{language === 'en' ? 'Beneficiaries:' : 'Bénéficiaires :'}</strong> {prog.targetBeneficiaries || (language === 'en' ? 'Not specified' : 'Non précisés')}</span>
                      </div>
                      {prog.objectives && <p className="mt-2 text-xs text-stone-600"><strong>{language === 'en' ? 'Objectives:' : 'Objectifs :'}</strong> {prog.objectives}</p>}
                      {prog.impactIndicators?.length ? <p className="mt-2 text-xs text-stone-600"><strong>{language === 'en' ? 'Indicators:' : 'Indicateurs :'}</strong> {prog.impactIndicators.join(' · ')}</p> : null}
                      {prog.eligibility && <p className="mt-2 text-xs text-stone-600"><strong>{language === 'en' ? 'Eligibility:' : 'Critères :'}</strong> {prog.eligibility}</p>}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setEditingProgram({
                          id: prog.id,
                          title: prog.title,
                          description: prog.description,
                          type: prog.type as ProgramType,
                          eligibility: prog.eligibility || '',
                          budget: prog.budget ? String(prog.budget) : '',
                          interventionZone: prog.interventionZone || '',
                          startDate: prog.startDate || '',
                          endDate: prog.endDate || '',
                          objectives: prog.objectives || '',
                          targetBeneficiaries: prog.targetBeneficiaries || '',
                          impactIndicators: prog.impactIndicators?.join(', ') || '',
                          status: prog.status,
                        })}
                        className="flex-shrink-0 rounded-md bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-200"
                      >
                        {t('action_edit')}
                      </button>
                      <button
                        onClick={() => deleteProgram(prog.id)}
                        className="flex-shrink-0 rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                      >
                        {t('institution_remove_btn')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{t('institution_beneficiaries_tracking')}</p>
            <h2 className="text-xl font-semibold">{t('institution_formalizations_title')}</h2>
          </div>
          <p className="max-w-md text-right text-sm text-stone-500">{t('institution_formalizations_desc')}</p>
        </div>
        <div className="mt-4 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
          {data.formalizations.length === 0 && <p className="p-5 text-stone-600">{t('institution_no_formalizations')}</p>}
          {data.formalizations.map((record) => (
            <div key={record.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">{record.businessName}</p>
                <p className="text-sm text-stone-600">{record.artisan.name} · {t('formalization_progress')} {record.progress}% · <span className="capitalize">{record.status}</span></p>
              </div>
              <div className="flex gap-2">
                {record.status !== 'approved' && (
                  <button onClick={() => review(record, 'approved')} className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white">
                    {t('action_approve')}
                  </button>
                )}
                {record.status !== 'rejected' && (
                  <button onClick={() => review(record, 'rejected')} className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    {t('institution_request_correction')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">{t('institution_applications_badge')}</p>
            <h2 className="text-xl font-semibold">{t('institution_applications_title')}</h2>
          </div>
          <p className="max-w-md text-right text-sm text-stone-500">{t('institution_applications_desc')}</p>
        </div>
        <div className="mt-4 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
          {(!data.applications || data.applications.length === 0) && <p className="p-5 text-stone-600">{t('institution_no_applications')}</p>}
          {data.applications?.map((app: ProgramApplication) => (
            <div key={app.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-900">{app.artisan?.name || 'Artisan'}</span>
                  <span className="text-xs text-stone-500">→ {language === 'en' ? 'Program:' : 'Programme :'} <strong>{app.program?.title}</strong></span>
                </div>
                <p className="mt-2 text-sm text-stone-700 bg-stone-50 p-2.5 rounded border border-stone-100 italic">« {app.motivation} »</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-stone-500">
                  <span>{language === 'en' ? 'Received on' : 'Reçue le'} {new Date(app.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}</span>
                  <span className={`font-medium capitalize px-2.5 py-0.5 rounded-full ${
                    app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {app.status === 'submitted' ? (language === 'en' ? 'Submitted' : 'Soumise') : app.status === 'in_review' ? (language === 'en' ? 'In Review' : 'En revue') : app.status === 'accepted' ? (language === 'en' ? 'Accepted' : 'Acceptée') : (language === 'en' ? 'Rejected' : 'Refusée')}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {app.status !== 'accepted' && (
                  <button onClick={() => reviewApplication(app.id, 'accepted')} className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800">
                    {t('action_approve')}
                  </button>
                )}
                {app.status !== 'rejected' && (
                  <button onClick={() => reviewApplication(app.id, 'rejected')} className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
                    {t('action_reject')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={publishResource} className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">{t('institution_publish_resource')}</h2>
          <input required placeholder={t('institution_resource_title')} value={resource.title} onChange={(e) => setResource({ ...resource, title: e.target.value })} className="field" />
          <textarea required placeholder={t('institution_resource_desc')} value={resource.description} onChange={(e) => setResource({ ...resource, description: e.target.value })} className="field min-h-24" />
          <div className="grid grid-cols-2 gap-3">
            <select value={resource.type} onChange={(e) => setResource({ ...resource, type: e.target.value as ResourceType })} className="field">
              {Object.entries(resourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input required placeholder={t('institution_resource_theme')} value={resource.theme} onChange={(e) => setResource({ ...resource, theme: e.target.value })} className="field" />
          </div>
          <input type="url" placeholder={t('institution_resource_link')} value={resource.contentUrl} onChange={(e) => setResource({ ...resource, contentUrl: e.target.value })} className="field" />
          <label className="block text-sm font-medium text-stone-700">Médias de la ressource</label>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf" disabled={uploadingMedia === 'resource'} onChange={(e) => { void uploadMedia('resource', Array.from(e.target.files ?? [])); e.target.value = ''; }} className="field" />
          <p className="text-xs text-stone-500">Formats acceptés : JPG, PNG, WebP, GIF, MP4, WebM, MOV et PDF. Maximum 25 Mo par fichier, 5 fichiers par envoi.</p>
          <button className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white">{t('institution_publish_resource')}</button>
        </form>

        <form onSubmit={publishProgram} className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">{t('institution_publish_program')}</h2>
          <input required placeholder={t('institution_program_name')} value={program.title} onChange={(e) => setProgram({ ...program, title: e.target.value })} className="field" />
          <textarea required placeholder={t('institution_resource_desc')} value={program.description} onChange={(e) => setProgram({ ...program, description: e.target.value })} className="field min-h-24" />
          <select value={program.type} onChange={(e) => setProgram({ ...program, type: e.target.value as ProgramType })} className="field">
            <option value="support">{programTypeLabels.support}</option>
            <option value="funding">{programTypeLabels.funding}</option>
            <option value="grant">{programTypeLabels.grant}</option>
            <option value="training">{programTypeLabels.training}</option>
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="number" min="0" placeholder={t('institution_program_budget')} value={program.budget} onChange={(e) => setProgram({ ...program, budget: e.target.value })} className="field" />
            <input placeholder={t('institution_program_zone')} value={program.interventionZone} onChange={(e) => setProgram({ ...program, interventionZone: e.target.value })} className="field" />
            <input type="date" value={program.startDate} onChange={(e) => setProgram({ ...program, startDate: e.target.value })} className="field" />
            <input type="date" value={program.endDate} onChange={(e) => setProgram({ ...program, endDate: e.target.value })} className="field" />
          </div>
          <textarea placeholder={t('institution_program_objectives')} value={program.objectives} onChange={(e) => setProgram({ ...program, objectives: e.target.value })} className="field min-h-20" />
          <input placeholder={t('institution_program_beneficiaries')} value={program.targetBeneficiaries} onChange={(e) => setProgram({ ...program, targetBeneficiaries: e.target.value })} className="field" />
          <input placeholder={t('institution_program_indicators')} value={program.impactIndicators} onChange={(e) => setProgram({ ...program, impactIndicators: e.target.value })} className="field" />
          <input placeholder={t('institution_program_eligibility')} value={program.eligibility} onChange={(e) => setProgram({ ...program, eligibility: e.target.value })} className="field" />
          <label className="block text-sm font-medium text-stone-700">Médias du programme</label>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf" disabled={uploadingMedia === 'program'} onChange={(e) => { void uploadMedia('program', Array.from(e.target.files ?? [])); e.target.value = ''; }} className="field" />
          <p className="text-xs text-stone-500">Formats acceptés : JPG, PNG, WebP, GIF, MP4, WebM, MOV et PDF. Maximum 25 Mo par fichier, 5 fichiers par envoi.</p>
          <button className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white">{t('institution_publish_program')}</button>
        </form>
      </section>

      {/* Modal d'édition de Ressource */}
      {editingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingResource(null)}>
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-stone-900">{t('institution_edit_resource_title')}</h2>
            <form onSubmit={saveEditedResource} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_resource_title')}</label>
                <input required value={editingResource.title} onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })} className="field mt-1" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_resource_desc')}</label>
                <textarea required value={editingResource.description} onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })} rows={3} className="field mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_resource_type')}</label>
                  <select value={editingResource.type} onChange={(e) => setEditingResource({ ...editingResource, type: e.target.value as ResourceType })} className="field mt-1">
                    {Object.entries(resourceLabels).map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_resource_theme')}</label>
                  <input required value={editingResource.theme} onChange={(e) => setEditingResource({ ...editingResource, theme: e.target.value })} className="field mt-1" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_resource_link')}</label>
                <input type="url" value={editingResource.contentUrl} onChange={(e) => setEditingResource({ ...editingResource, contentUrl: e.target.value })} className="field mt-1" placeholder="https://..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingResource(null)} className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">{t('action_cancel')}</button>
                <button type="submit" className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">{t('institution_save_changes')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'édition de Programme */}
      {editingProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingProgram(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-stone-900">{t('institution_edit_program_title')}</h2>
            <form onSubmit={saveEditedProgram} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_program_name')}</label>
                <input required value={editingProgram.title} onChange={(e) => setEditingProgram({ ...editingProgram, title: e.target.value })} className="field mt-1" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_resource_desc')}</label>
                <textarea required value={editingProgram.description} onChange={(e) => setEditingProgram({ ...editingProgram, description: e.target.value })} rows={3} className="field mt-1" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_resource_type')}</label>
                  <select value={editingProgram.type} onChange={(e) => setEditingProgram({ ...editingProgram, type: e.target.value as ProgramType })} className="field mt-1">
                    <option value="support">{programTypeLabels.support}</option>
                    <option value="funding">{programTypeLabels.funding}</option>
                    <option value="grant">{programTypeLabels.grant}</option>
                    <option value="training">{programTypeLabels.training}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_program_status')}</label>
                  <select value={editingProgram.status} onChange={(e) => setEditingProgram({ ...editingProgram, status: e.target.value as 'active' | 'closed' })} className="field mt-1">
                    <option value="active">{t('institution_program_active')}</option>
                    <option value="closed">{t('institution_program_closed')}</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_program_budget')}</label>
                  <input type="number" min="0" value={editingProgram.budget} onChange={(e) => setEditingProgram({ ...editingProgram, budget: e.target.value })} className="field mt-1" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_program_zone')}</label>
                  <input value={editingProgram.interventionZone} onChange={(e) => setEditingProgram({ ...editingProgram, interventionZone: e.target.value })} className="field mt-1" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_program_start')}</label>
                  <input type="date" value={editingProgram.startDate} onChange={(e) => setEditingProgram({ ...editingProgram, startDate: e.target.value })} className="field mt-1" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_program_end')}</label>
                  <input type="date" value={editingProgram.endDate} onChange={(e) => setEditingProgram({ ...editingProgram, endDate: e.target.value })} className="field mt-1" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_program_objectives')}</label>
                <textarea value={editingProgram.objectives} onChange={(e) => setEditingProgram({ ...editingProgram, objectives: e.target.value })} rows={2} className="field mt-1" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_program_beneficiaries')}</label>
                <input value={editingProgram.targetBeneficiaries} onChange={(e) => setEditingProgram({ ...editingProgram, targetBeneficiaries: e.target.value })} className="field mt-1" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_program_indicators')}</label>
                <input value={editingProgram.impactIndicators} onChange={(e) => setEditingProgram({ ...editingProgram, impactIndicators: e.target.value })} className="field mt-1" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600">{t('institution_program_eligibility')}</label>
                <input value={editingProgram.eligibility} onChange={(e) => setEditingProgram({ ...editingProgram, eligibility: e.target.value })} className="field mt-1" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingProgram(null)} className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">{t('action_cancel')}</button>
                <button type="submit" className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">{t('institution_save_changes')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
