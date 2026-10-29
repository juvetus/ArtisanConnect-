export const AUTOMATIC_SOURCE_KEYS = ['armp', 'ungm', 'sangobids'] as const;
export type SourceKey = typeof AUTOMATIC_SOURCE_KEYS[number];
export type SourceGroup = 'public' | 'aggregator' | 'un' | 'council' | 'company';
export type SourceStatus = 'automatic' | 'manual' | 'blocked' | 'covered' | 'planned';

export interface WatchSource {
  key: string;
  name: string;
  url: string | null;
  group: SourceGroup;
  status: SourceStatus;
  automatic: boolean;
  note: string;
  noteEn: string;
}

function source(key: string, name: string, url: string | null, group: SourceGroup, status: SourceStatus, note: string, noteEn: string): WatchSource {
  return { key, name, url, group, status, automatic: status === 'automatic', note, noteEn };
}

export const WATCH_SOURCES: WatchSource[] = [
  source('armp', 'ARMP Cameroun', 'https://armp.cm/', 'public', 'automatic',
    'Priorité 1. Avis AO, DC et AMI ; dix premières pages maximum.',
    'Priority 1. AO, DC and AMI notices; first ten pages at most.'),
  source('armp-legacy', 'ARMP — consultations et JDM', 'https://ancien.armp.cm/Consultations.php?P1=CON', 'public', 'covered',
    'Lien historique ; collecte via le site ARMP actuel pour éviter les doublons.',
    'Legacy link; collected through the current ARMP site to avoid duplicates.'),
  source('coleps', 'COLEPS', 'https://marchespublics.cm/index.do', 'public', 'blocked',
    'Priorité 1. Portail public vérifié ; négociation TLS refusée par le client Node. Aucun affaiblissement TLS appliqué.',
    'Priority 1. Public portal verified; TLS negotiation rejected by the Node client. TLS security is not weakened.'),
  source('minmap', 'MINMAP — site officiel', 'https://www.minmap.cm/index.php?lang=fr', 'public', 'manual',
    'Actualités institutionnelles ; aucun flux distinct d’avis validé. Consultation et saisie manuelles.',
    'Institutional news; no separate tender feed verified. Manual review and entry.'),
  source('minmap-digital', 'MINMAP — portail numérique', 'https://minmap.dev/', 'public', 'manual',
    'La page présente la gestion des marchés de gré à gré, pas une liste publique d’appels d’offres.',
    'The page presents direct-award management, not a public tender listing.'),
  source('sangobids', 'SangoBids', 'https://sangobids.com/appels-offres/du-jour', 'aggregator', 'automatic',
    'Une page publique, 200 liens maximum. Intitulés issus des URL, sans copie des résumés IA ni des documents. Échéance à vérifier et doublons intersources à contrôler.',
    'One public page, up to 200 links. Titles derived from URLs; no AI summaries or documents copied. Verify deadlines and cross-source duplicates.'),
  source('katika', 'Katika Tender', 'https://katika237.com/tender/', 'aggregator', 'blocked',
    'HTTP 429 lors de la vérification ; aucune tentative de contournement.',
    'HTTP 429 during verification; no attempt to bypass rate limits.'),
  source('ungm', 'UNGM — Cameroun', 'https://www.ungm.org/Public/Notice', 'un', 'automatic',
    'Source majeure. Filtre Cameroun, avis actifs, toutes agences (PNUD, UNICEF, ONU Femmes, UNFPA, PAM, OIM, etc.). Dix pages maximum.',
    'Major source. Cameroon filter, active notices, all agencies (UNDP, UNICEF, UN Women, UNFPA, WFP, IOM, etc.). Up to ten pages.'),
  source('undp-fr', 'PNUD — acquisitions Cameroun', 'https://www.undp.org/fr/cameroon/acquisitions', 'un', 'blocked',
    'Accès automatisé testé refusé (HTTP 403). Les avis publiés sur UNGM restent couverts par ce collecteur.',
    'Automated access denied during verification (HTTP 403). Notices published on UNGM remain covered there.'),
  source('undp-en', 'PNUD — procurement Cameroun', 'https://www.undp.org/cameroon/procurement', 'un', 'manual',
    'Accès non confirmé ; consulter manuellement. Couverture partielle via UNGM, sans garantie d’exhaustivité.',
    'Access not confirmed; review manually. Partial coverage through UNGM, not guaranteed exhaustive.'),
  source('unicef-ungm', 'UNICEF — avis UNGM', 'https://www.ungm.org/public/notice?agencyenglishabbreviation=unicef', 'un', 'covered',
    'Avis Cameroun inclus dans le collecteur UNGM ; ce lien peut aussi afficher des avis hors Cameroun.',
    'Cameroon notices are included in the UNGM collector; this link may also show notices outside Cameroon.'),
  source('unicef-calendar', 'UNICEF — calendriers des achats', 'https://www.unicef.org/supply/tender-calendars', 'un', 'manual',
    'Prévisions mondiales, pas uniquement Cameroun. Ne pas traiter un calendrier comme un appel ouvert.',
    'Global plans, not Cameroon-only. A calendar is not an open tender.'),
  ...['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'].map((district, index) => source(
    `yaounde-${index + 1}`, `Mairie de Yaoundé ${district}`, 'https://armp.cm/', 'council', 'covered',
    'Suivi via les publications ARMP et consultation COLEPS. Pas de collecteur du site municipal ni de garantie d’exhaustivité.',
    'Follow ARMP publications and consult COLEPS. No municipal-site collector or exhaustive coverage guarantee.',
  )),
  source('orange', 'Orange Cameroun', 'https://www.orange.cm/', 'company', 'planned',
    'Site institutionnel vérifié ; page achats et connecteur spécifiques à valider.',
    'Corporate site verified; procurement page and connector still to be verified.'),
  source('mtn', 'MTN Cameroun', null, 'company', 'planned',
    'Page officielle d’achats à identifier et vérifier avant connexion.',
    'Official procurement page must be identified and verified before integration.'),
  source('camtel', 'CAMTEL', 'https://camtel.cm/', 'company', 'planned',
    'Site institutionnel vérifié ; page achats et connecteur spécifiques à valider.',
    'Corporate site verified; procurement page and connector still to be verified.'),
  source('eneo', 'ENEO', 'https://eneocameroon.cm/index.php/fr/actualite-communiques/communiques-appels-d-offres-et-resultats', 'company', 'manual',
    'Page officielle vérifiée, mêlant avis et résultats anciens. Vérifier les échéances avant saisie.',
    'Official page verified, mixing notices and old results. Check deadlines before manual entry.'),
  source('sabc', 'SABC', null, 'company', 'planned',
    'Page officielle d’achats et conditions de collecte à vérifier.',
    'Official procurement page and collection terms still to be verified.'),
  source('guinness', 'Guinness Cameroun', null, 'company', 'planned',
    'Page officielle d’achats et conditions de collecte à vérifier.',
    'Official procurement page and collection terms still to be verified.'),
  source('cimencam', 'CIMENCAM', 'https://www.cimencam.com/fr', 'company', 'planned',
    'Site institutionnel vérifié ; page achats et connecteur spécifiques à valider.',
    'Corporate site verified; procurement page and connector still to be verified.'),
  source('dangote', 'Dangote Cement Cameroun', 'https://cement.dangote.com/', 'company', 'planned',
    'Site du groupe vérifié ; flux d’achats propre au Cameroun à identifier.',
    'Group site verified; Cameroon-specific procurement feed still to be identified.'),
  source('pad', 'Port Autonome de Douala (PAD)', null, 'company', 'planned',
    'Page officielle d’achats à vérifier. Les avis diffusés par ARMP peuvent déjà être collectés.',
    'Official procurement page still to be verified. Notices published by ARMP may already be collected.'),
  source('kct', 'Kribi Conteneurs Terminal', 'https://kribi-conteneurs-terminal.com/', 'company', 'planned',
    'Site institutionnel vérifié ; aucun flux public d’achats validé. Ne pas confondre avec le Port Autonome de Kribi.',
    'Corporate site verified; no public procurement feed verified. Distinct from the Port Authority of Kribi.'),
];
