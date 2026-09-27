import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/LegalDocumentPage';

export const metadata: Metadata = {
  title: 'Conditions d’utilisation et de vente | ArtisanConnect',
  description: 'Brouillon des conditions d’utilisation, commandes, paiements, livraison et remboursements ArtisanConnect.',
};

export default function TermsPage() {
  return <LegalDocumentPage documentId="terms" />;
}
