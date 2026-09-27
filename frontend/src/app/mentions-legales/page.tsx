import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/LegalDocumentPage';

export const metadata: Metadata = {
  title: 'Mentions légales | ArtisanConnect',
  description: 'Informations légales relatives au service ArtisanConnect.',
};

export default function LegalNoticePage() {
  return <LegalDocumentPage documentId="legal-notice" />;
}
