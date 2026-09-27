import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/LegalDocumentPage';

export const metadata: Metadata = {
  title: 'Confidentialité et données personnelles | ArtisanConnect',
  description: 'Informations sur les données traitées par ArtisanConnect et les moyens de contacter l’équipe.',
};

export default function PrivacyPage() {
  return <LegalDocumentPage documentId="privacy" />;
}
