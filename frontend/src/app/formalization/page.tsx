'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

export default function FormalizationPage() {
  const { user, ready } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const { data, mutate } = useSWR(user?.role === 'artisan' ? 'my-formalization' : null, api.myFormalization);
  const [form, setForm] = useState({ businessName: '', registrationNumber: '', taxId: '' });
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { if (ready && user?.role !== 'artisan') router.replace('/'); }, [ready, user, router]);
  if (!ready || user?.role !== 'artisan') return <p className="text-stone-600">{t('action_loading')}</p>;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await api.submitFormalization({ ...form, documentsUrl: JSON.stringify(documentUrls) });
    setMessage(t('formalization_submitted_msg'));
    await mutate();
  };

  const uploadDocuments = async (files: File[]) => {
    if (!files.length) return;
    if (files.length + documentUrls.length > 5) {
      setMessage(t('formalization_docs_help'));
      return;
    }
    setUploadingDocuments(true);
    try {
      const result = await api.uploadFormalizationDocuments(files);
      setDocumentUrls((current) => [...current, ...result.documentUrls]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('formalization_docs_uploading'));
    } finally {
      setUploadingDocuments(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('formalization_badge')}</p>
        <h1 className="mt-1 text-3xl font-semibold">{t('formalization_title')}</h1>
        <p className="mt-2 text-stone-600">{t('formalization_subtitle')}</p>
      </header>
      {data && (
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <div className="flex justify-between text-sm">
            <span>{t('formalization_progress')}</span>
            <strong>{data.progress}%</strong>
          </div>
          <div className="mt-3 h-2 rounded-full bg-stone-100">
            <div className="h-2 rounded-full bg-amber-600" style={{ width: `${data.progress}%` }} />
          </div>
          <p className="mt-3 text-sm capitalize text-stone-600">
            {t('formalization_status')} {data.status.replace('_', ' ')}
          </p>
          {data.institutionNotes && (
            <p className="mt-2 text-sm text-stone-700">
              {t('formalization_feedback')} {data.institutionNotes}
            </p>
          )}
        </section>
      )}
      <form onSubmit={submit} className="space-y-4 rounded-lg border border-stone-200 bg-white p-6">
        <label className="block text-sm font-medium">
          {t('formalization_business_name')}
          <input required value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="field mt-1" />
        </label>
        <label className="block text-sm font-medium">
          {t('formalization_reg_number')}
          <input value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} className="field mt-1" />
        </label>
        <label className="block text-sm font-medium">
          {t('formalization_tax_id')}
          <input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} className="field mt-1" />
        </label>
        <div>
          <label htmlFor="formalization-documents" className="block text-sm font-medium">{t('formalization_docs_upload')}</label>
          <input id="formalization-documents" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" disabled={uploadingDocuments || documentUrls.length >= 5} onChange={(event) => { void uploadDocuments(Array.from(event.target.files ?? [])); event.target.value = ''; }} className="mt-1 block w-full rounded-md border border-amber-300 bg-amber-50 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-amber-700 file:px-3 file:py-2 file:font-medium file:text-white" />
          <p className="mt-1 text-xs text-stone-500">{uploadingDocuments ? t('formalization_docs_uploading') : t('formalization_docs_help')}</p>
          <div className="mt-2 space-y-1 text-sm text-stone-700">
            {documentUrls.length ? documentUrls.map((url, index) => <div key={url} className="flex items-center justify-between gap-2 rounded-md bg-stone-50 px-3 py-2"><a href={url} target="_blank" rel="noreferrer" className="truncate text-amber-800 underline">{t('formalization_docs_upload')} {index + 1}</a><button type="button" onClick={() => setDocumentUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-xs text-red-700">{t('formalization_docs_remove')}</button></div>) : <p className="text-xs text-stone-500">{t('formalization_docs_empty')}</p>}
          </div>
        </div>
        {message && <p className="text-sm text-green-700">{message}</p>}
        <button className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">
          {t('formalization_submit_btn')}
        </button>
      </form>
    </div>
  );
}
