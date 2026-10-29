import { categoryLabel } from './categories';
import type { Language } from './i18n';

export interface Opportunity {
  id: string;
  source: 'armp' | 'ungm' | 'manual';
  sourceUrl: string;
  title: string;
  organization: string;
  location: string;
  reference: string;
  deadline: string | null;
  summary: string;
  trades: string[];
  status: 'draft' | 'published' | 'archived';
  analysisStatus: 'pending' | 'done' | 'failed';
  analysisError: string | null;
  closed?: boolean;
}

export interface OpportunityPreferences {
  subscribed: boolean;
  trades: string[];
  emailEnabled: boolean;
  whatsappEnabled: boolean;
}

export interface OpportunityGroup {
  id: string;
  name: string;
  description: string;
  capacity: number;
  status: 'open' | 'closed';
  ownerId: string;
  ownerName: string;
  members: { id: string; userId: string; name: string; status: 'pending' | 'accepted' | 'rejected' }[];
}

export interface OpportunityConfig {
  trades: string[];
  scheduled: boolean;
  whatsappAvailable: boolean;
  sources: { key: string; name: string; url: string; automatic: boolean }[];
}

export interface OpportunityDashboard extends OpportunityConfig {
  drafts: number;
  published: number;
  runs: { id: string; source: string; status: string; fetched: number; imported: number; error: string | null; createdAt: string }[];
  deliveries: {
    counts: { status: string; count: number }[];
    items: { id: string; opportunityId: string; channel: string; status: string; error: string | null }[];
  };
}

export function opportunityTradeLabel(trade: string, language: Language) {
  if (trade === 'peinture') return language === 'en' ? 'Painting' : 'Peinture';
  return categoryLabel(trade, language);
}

export function opportunityDate(value: string | null, language: Language) {
  return value ? new Date(value).toLocaleString(language === 'en' ? 'en-GB' : 'fr-FR', { timeZone: 'Africa/Douala' }) : (language === 'en' ? 'To be checked' : 'À vérifier');
}
