'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { LEGAL_DOCUMENTS, LEGAL_DRAFT_NOTICE, type LegalDocumentId } from '@/lib/legal-content';

const LEGAL_LINKS: { id: LegalDocumentId; href: string; label: Record<'fr' | 'en', string> }[] = [
  { id: 'legal-notice', href: '/mentions-legales', label: { fr: 'Mentions légales', en: 'Legal notice' } },
  { id: 'privacy', href: '/confidentialite', label: { fr: 'Confidentialité', en: 'Privacy' } },
  { id: 'terms', href: '/conditions', label: { fr: 'Conditions', en: 'Terms' } },
];

export function LegalDocumentPage({ documentId }: { documentId: LegalDocumentId }) {
  const { language } = useLanguage();
  const document = LEGAL_DOCUMENTS[documentId][language];
  const english = language === 'en';

  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <header className="space-y-3 border-b border-stone-200 pb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-amber-800">ArtisanConnect</p>
        <h1 className="text-3xl font-semibold text-stone-950">{document.title}</h1>
        <p className="leading-7 text-stone-600">{document.intro}</p>
        <p role="status" className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
          {LEGAL_DRAFT_NOTICE[language]}
        </p>
        <nav aria-label={english ? 'Legal documents' : 'Documents légaux'} className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {LEGAL_LINKS.map((item) => (
            <Link key={item.id} href={item.href} aria-current={item.id === documentId ? 'page' : undefined} className={item.id === documentId ? 'font-semibold text-stone-950 underline underline-offset-4' : 'text-amber-800 underline underline-offset-4 hover:text-amber-950'}>
              {item.label[language]}
            </Link>
          ))}
        </nav>
      </header>

      <div className="divide-y divide-stone-200">
        {document.sections.map((section) => (
          <section key={section.title} className="space-y-3 py-6 first:pt-0 last:pb-0">
            <h2 className="text-xl font-semibold text-stone-900">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="whitespace-pre-line text-sm leading-7 text-stone-700">{paragraph}</p>
            ))}
            {section.items ? (
              <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-stone-700">
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <p className="border-t border-stone-200 pt-5 text-xs text-stone-500">
        {english ? 'Questions? Contact the ArtisanConnect team through the support form.' : 'Une question ? Contactez l’équipe ArtisanConnect via le formulaire de support.'}{' '}
        <Link href="/contact" className="font-medium text-amber-800 underline underline-offset-4">{english ? 'Contact support' : 'Contacter le support'}</Link>
      </p>
    </article>
  );
}
