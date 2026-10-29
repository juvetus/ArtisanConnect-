import { load } from 'cheerio';
import type { SourceKey } from './opportunity-source-catalog.js';
export { AUTOMATIC_SOURCE_KEYS, WATCH_SOURCES, type SourceKey } from './opportunity-source-catalog.js';

export interface CollectedNotice {
  source: SourceKey;
  externalId: string;
  sourceUrl: string;
  title: string;
  organization: string;
  location: string;
  reference: string;
  deadline: Date | null;
}

const clean = (text: string) => text.replace(/\s+/g, ' ').trim();

export function parseArmp(html: string): CollectedNotice[] {
  const $ = load(html);
  const cards = $('li.list-group-item').filter((_, card) => $(card).find('a[href*="/details?"]').length > 0);
  if (!cards.length) throw new Error('ARMP : structure des avis non reconnue');
  const notices: CollectedNotice[] = [];
  cards.each((_, card) => {
    const item = $(card);
    const href = item.find('a[href^="/details?"]').first().attr('href');
    if (!href) return;
    const url = new URL(href, 'https://armp.cm');
    const type = url.searchParams.get('type_publication');
    // Attributions, communiqués et additifs ne sont pas de nouveaux marchés.
    if (!['AO', 'DC', 'AMI'].includes(type ?? '')) return;
    const title = clean(item.find('strong[title]').first().text());
    const id = url.searchParams.get('id_publication');
    if (!title || !id) throw new Error('ARMP : titre ou référence manquant');
    const values = new Map<string, string>();
    item.find('.d-table-row').each((_, row) => {
      const cells = $(row).find('.d-table-cell');
      values.set(clean(cells.eq(0).text()).toLowerCase(), clean(cells.eq(1).text()));
    });
    const find = (pattern: RegExp) => [...values].find(([key]) => pattern.test(key))?.[1] ?? '';
    const day = find(/closing date|date.*cl[oô]ture/).match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
    const time = find(/closing time|heure/).match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
    const deadline = day ? new Date(`${day[3]}-${day[2]}-${day[1]}T${time?.[1] ?? '00'}:${time?.[2] ?? '00'}:${time?.[3] ?? '00'}+01:00`) : null;
    notices.push({
      source: 'armp', externalId: `${type}:${id}`, sourceUrl: url.href,
      title, organization: find(/po\/ca|mo\/ac/), location: find(/region|région|localisation/),
      reference: `${type} ${id}`, deadline: deadline && Number.isFinite(deadline.getTime()) ? deadline : null,
    });
  });
  return notices;
}

export function parseUngm(html: string): { notices: CollectedNotice[]; total: number } {
  const $ = load(html);
  const totalMatch = html.match(/var noticeTotal\s*=\s*"(\d+)"/);
  if (!totalMatch) throw new Error('UNGM : nombre de résultats absent, structure modifiée');
  const notices: CollectedNotice[] = [];
  $('.tableRow[data-noticeid]').each((_, row) => {
    const item = $(row);
    const id = item.attr('data-noticeid');
    const title = clean(item.find('.resultTitle .ungm-title').text());
    if (!id || !/^\d+$/.test(id) || !title) throw new Error('UNGM : avis invalide');
    const text = clean(item.find('.deadline > span').first().text());
    const date = text.match(/(\d{2})-([A-Za-z]{3})-(\d{4})\s+(\d{2}):(\d{2})\s*\(GMT\s*([+-]?\d+)\.(\d{2})\)/);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = date ? months.indexOf(date[2]) + 1 : 0;
    const offsetMinutes = date ? Math.round(Math.abs(Number(`${date[6]}.${date[7]}`)) * 60) : 0;
    const offset = date ? `${date[6].startsWith('-') ? '-' : '+'}${String(Math.floor(offsetMinutes / 60)).padStart(2, '0')}:${String(offsetMinutes % 60).padStart(2, '0')}` : '';
    const deadline = date && month ? new Date(`${date[3]}-${String(month).padStart(2, '0')}-${date[1]}T${date[4]}:${date[5]}:00${offset}`) : null;
    notices.push({
      source: 'ungm', externalId: id, sourceUrl: `https://www.ungm.org/Public/Notice/${id}`,
      title, organization: clean(item.find('.resultAgency').text()), location: 'Cameroun',
      reference: clean(item.find('[data-description="Reference"]').text()),
      deadline: deadline && Number.isFinite(deadline.getTime()) ? deadline : null,
    });
  });
  if (Number(totalMatch[1]) > 0 && !notices.length) throw new Error('UNGM : avis attendus mais absents');
  return { notices, total: Number(totalMatch[1]) };
}

export function parseSangobids(html: string): CollectedNotice[] {
  const $ = load(html);
  if (!/appels d.offres du jour au cameroun/i.test(clean($('h1').text()))) {
    throw new Error('SangoBids : structure de la liste publique non reconnue');
  }
  const links = $('li > a[href^="/tenders/"]').filter((_, element) => {
    const href = $(element).attr('href') ?? '';
    return !href.startsWith('/tenders/page/') && /^\/tenders\/[a-z0-9]+\/[a-z0-9-]+$/.test(href);
  });
  if (!links.length) throw new Error('SangoBids : aucun lien d’avis reconnu ; vérifier la page source');
  const notices = new Map<string, CollectedNotice>();
  links.slice(0, 200).each((_, element) => {
    const link = $(element);
    const href = link.attr('href');
    if (!href) throw new Error('SangoBids : lien d’avis absent');
    const [, , id, slug] = href.split('/');
    // Only factual URL labels: do not copy the aggregator's generated summaries.
    if (/^(?:additif|communique|decision|avis-d-attribution|attribution|resultat|report-|annulation|avis-d-annulation)/.test(slug)) return;
    const metadata = clean(link.siblings('p').first().text());
    const organization = metadata.split(' — ')[0];
    if (!organization || !/publié le/i.test(metadata)) throw new Error('SangoBids : métadonnées de publication absentes');
    notices.set(id, {
      source: 'sangobids', externalId: id, sourceUrl: `https://sangobids.com${href}`,
      title: slug.replace(/-/g, ' '), organization, location: 'Cameroun',
      reference: id, deadline: null,
    });
  });
  return [...notices.values()];
}

export async function fetchSource(url: string, init?: RequestInit): Promise<{ html: string; response: Response }> {
  const response = await fetch(url, {
    ...init, redirect: 'error', signal: AbortSignal.timeout(25000),
    headers: { 'User-Agent': 'ArtisanConnect-OpportunityWatch/1.0', ...init?.headers },
  });
  if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!/text\/html/i.test(contentType)) throw new Error('La source ne retourne pas de page HTML');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Réponse source vide');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4_000_000) throw new Error('Page source trop volumineuse (4 Mo maximum)');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return { html: Buffer.concat(chunks).toString('utf8'), response };
}

export async function collectSource(source: SourceKey): Promise<CollectedNotice[]> {
  const notices: CollectedNotice[] = [];
  if (source === 'armp') {
    // Pilote borné aux dix premières pages ; chaque exécution est visible dans l'administration.
    for (let page = 1; page <= 10; page++) {
      const { html } = await fetchSource(`https://armp.cm/?page=${page}`);
      notices.push(...parseArmp(html));
      const $ = load(html);
      if (!$(`a[href="https://armp.cm?page=${page + 1}"]`).length) break;
    }
  } else if (source === 'sangobids') {
    const { html } = await fetchSource('https://sangobids.com/appels-offres/du-jour');
    notices.push(...parseSangobids(html));
  } else if (source === 'ungm') {
    const session = await fetchSource('https://www.ungm.org/Public/Notice');
    const $ = load(session.html);
    const token = $('input[name="__RequestVerificationToken"]').val();
    const cookie = session.response.headers.getSetCookie().map((entry) => entry.split(';')[0]).join('; ');
    for (let page = 0; page < 10; page++) {
      const { html } = await fetchSource('https://www.ungm.org/Public/Notice/Search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', RequestVerificationToken: typeof token === 'string' ? token : '', Cookie: cookie },
        body: JSON.stringify({
          PageIndex: page, PageSize: 15, Title: '', Description: '', Reference: '', PublishedFrom: '', PublishedTo: '',
          DeadlineFrom: '', DeadlineTo: '', Countries: [2327], Agencies: [], UNSPSCs: [], NoticeTypes: [],
          SortField: 'Deadline', SortAscending: true, isPicker: false, IsSustainable: false, IsActive: true,
          NoticeDisplayType: null, NoticeSearchTotalLabelId: 'noticeSearchTotal', TypeOfCompetitions: [],
        }),
      });
      const result = parseUngm(html);
      notices.push(...result.notices);
      if ((page + 1) * 15 >= result.total) break;
    }
  } else {
    throw new Error(`Connecteur non pris en charge : ${String(source)}`);
  }
  return notices;
}
