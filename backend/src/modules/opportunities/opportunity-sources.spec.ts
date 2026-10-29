import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTOMATIC_SOURCE_KEYS, collectSource, fetchSource, parseArmp, parseSangobids, parseUngm, WATCH_SOURCES } from './opportunity-sources.js';
import { isFormalized, parseDeadline, validateTrades, validSourceUrl } from './opportunity-policy.js';

afterEach(() => vi.unstubAllGlobals());

const armpCard = (type = 'AO', deadline = '15-11-2030') => `
  <li class="list-group-item"><strong title="Avis">Construction d'un atelier</strong>
  <div class="d-table-row"><div class="d-table-cell">PO/CA:</div><div class="d-table-cell">Commune</div></div>
  <div class="d-table-row"><div class="d-table-cell">Region :</div><div class="d-table-cell">CENTRE</div></div>
  <div class="d-table-row"><div class="d-table-cell">Closing date :</div><div class="d-table-cell">${deadline}</div></div>
  <div class="d-table-row"><div class="d-table-cell">Closing time :</div><div class="d-table-cell">10:30:00</div></div>
  <a href="/details?type_publication=${type}&amp;id_publication=123">Details</a></li>`;

describe('opportunity source parsers', () => {
  it('extracts ARMP references and interprets deadlines in Cameroon time', () => {
    const [notice] = parseArmp(armpCard());
    expect(notice).toMatchObject({ source: 'armp', externalId: 'AO:123', organization: 'Commune', location: 'CENTRE' });
    expect(notice.sourceUrl).toBe('https://armp.cm/details?type_publication=AO&id_publication=123');
    expect(notice.deadline?.toISOString()).toBe('2030-11-15T09:30:00.000Z');
  });

  it('does not turn award decisions or addenda into new calls', () => {
    expect(parseArmp(armpCard('DEC-ATTR') + armpCard('COMM') + armpCard('ADDITIF'))).toEqual([]);
  });

  it('retains unknown deadlines for human verification, and reports changed markup', () => {
    expect(parseArmp(armpCard('DC', ''))[0].deadline).toBeNull();
    expect(() => parseArmp('<html>Maintenance</html>')).toThrow('structure');
  });

  it('parses UNGM metadata and its explicit GMT offset', () => {
    const result = parseUngm(`<div class="tableRow" data-noticeid="99">
      <div class="resultTitle"><span class="ungm-title">Furniture supply</span></div>
      <div class="resultAgency">UNICEF</div><div class="deadline"><span>15-Nov-2030 23:59 (GMT 2.00)</span></div>
      <div data-description="Reference">RFQ-99</div></div><script>var noticeTotal = "1";</script>`);
    expect(result.total).toBe(1);
    expect(result.notices[0]).toMatchObject({ source: 'ungm', externalId: '99', reference: 'RFQ-99', organization: 'UNICEF' });
    expect(result.notices[0].deadline?.toISOString()).toBe('2030-11-15T21:59:00.000Z');
  });

  it('distinguishes an empty UNGM search from a failed parser', () => {
    expect(parseUngm('<script>var noticeTotal = "0";</script>').notices).toEqual([]);
    expect(() => parseUngm('<script>var noticeTotal = "2";</script>')).toThrow('absents');
    expect(() => parseUngm('<html>Access denied</html>')).toThrow('structure');
  });

  it('handles fractional GMT hours used by UNGM without treating decimals as minutes', () => {
    const result = parseUngm(`<div class="tableRow" data-noticeid="100"><div class="resultTitle"><span class="ungm-title">Test</span></div><div class="deadline"><span>15-Nov-2030 23:59 (GMT 5.50)</span></div></div><script>var noticeTotal = "1";</script>`);
    expect(result.notices[0].deadline?.toISOString()).toBe('2030-11-15T18:29:00.000Z');
  });

  it('surfaces HTTP failures, wrong content types and oversized pages', async () => {
    const mock = vi.fn();
    vi.stubGlobal('fetch', mock);
    mock.mockResolvedValueOnce(new Response('Denied', { status: 403 }));
    await expect(fetchSource('https://armp.cm/')).rejects.toThrow('403');
    mock.mockResolvedValueOnce(new Response('{}', { headers: { 'Content-Type': 'application/json' } }));
    await expect(fetchSource('https://armp.cm/')).rejects.toThrow('HTML');
    mock.mockResolvedValueOnce(new Response('a'.repeat(4_000_001), { headers: { 'Content-Type': 'text/html' } }));
    await expect(fetchSource('https://armp.cm/')).rejects.toThrow('volumineuse');
  });

  it('collects only factual SangoBids URL labels and keeps unknown deadline times unset', () => {
    const html = `<h1>Appels d'offres du jour au Cameroun</h1><ul>
      <li><a href="/tenders/abc123/avis-appel-offres-mobilier">Résumé IA à ne pas copier</a><p>COMMUNE — publié le 28 octobre 2026 — clôture le 12 novembre 2026</p></li>
      <li><a href="/tenders/abc123/avis-appel-offres-mobilier">Duplicate</a><p>COMMUNE — publié le 28 octobre 2026</p></li>
      <li><a href="/tenders/abc124/additif-mobilier">Addendum</a></li>
      <li><a href="/tenders/abc125/communique-resultat">Award</a></li>
      <li><a href="/tenders/page/1">Archive</a></li></ul>`;
    expect(parseSangobids(html)).toEqual([{
      source: 'sangobids', externalId: 'abc123', sourceUrl: 'https://sangobids.com/tenders/abc123/avis-appel-offres-mobilier',
      title: 'avis appel offres mobilier', organization: 'COMMUNE', location: 'Cameroun',
      reference: 'abc123', deadline: null,
    }]);
  });

  it('reports SangoBids structure changes and bounds collection to 200 public links', () => {
    expect(() => parseSangobids('<h1>Access denied</h1>')).toThrow('structure');
    expect(() => parseSangobids("<h1>Appels d'offres du jour au Cameroun</h1>")).toThrow('aucun lien');
    const list = Array.from({ length: 205 }, (_, i) => `<li><a href="/tenders/id${i}/appel-offres-${i}">Text</a><p>COMMUNE — publié le 28 octobre 2026</p></li>`).join('');
    expect(parseSangobids(`<h1>Appels d'offres du jour au Cameroun</h1><ul>${list}</ul>`)).toHaveLength(200);
  });

  it('exposes all requested sources without pretending blocked or planned connectors are automatic', () => {
    expect(WATCH_SOURCES).toHaveLength(29);
    expect(new Set(WATCH_SOURCES.map((source) => source.key)).size).toBe(WATCH_SOURCES.length);
    expect(WATCH_SOURCES.filter((source) => source.automatic).map((source) => source.key).sort()).toEqual([...AUTOMATIC_SOURCE_KEYS].sort());
    expect(WATCH_SOURCES.filter((source) => source.group === 'council')).toHaveLength(7);
    expect(WATCH_SOURCES.filter((source) => source.group === 'company')).toHaveLength(10);
    expect(WATCH_SOURCES.find((source) => source.key === 'coleps')).toMatchObject({ status: 'blocked', automatic: false });
    expect(WATCH_SOURCES.every((source) => source.note && source.noteEn && (!source.url || source.url.startsWith('https://')))).toBe(true);
  });

  it('fetches only the public SangoBids HTML page, never its private API', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(`<h1>Appels d'offres du jour au Cameroun</h1><ul><li><a href="/tenders/id1/appel-offres">Text</a><p>COMMUNE — publié le 28 octobre 2026</p></li></ul>`, { headers: { 'Content-Type': 'text/html' } }));
    vi.stubGlobal('fetch', mock);
    expect(await collectSource('sangobids')).toHaveLength(1);
    expect(mock).toHaveBeenCalledOnce();
    expect(mock.mock.calls[0][0]).toBe('https://sangobids.com/appels-offres/du-jour');
  });
});

describe('opportunity policy', () => {
  const artisan = { role: 'artisan' as const, isActive: true, hasRccm: true, hasNiu: true, hasProfessionalArtisanCard: true };
  it('accepts formalized or approved active artisans, not inactive accounts or other roles', () => {
    expect(isFormalized(artisan, false)).toBe(true);
    expect(isFormalized({ ...artisan, hasNiu: null }, false)).toBe(false);
    expect(isFormalized({ ...artisan, hasNiu: null }, true)).toBe(true);
    expect(isFormalized({ ...artisan, isActive: false }, true)).toBe(false);
    expect(isFormalized({ ...artisan, role: 'client' }, true)).toBe(false);
  });
  it('validates trade vocabulary, public source link scheme and zoned future deadlines', () => {
    expect(validateTrades(['menuiserie', 'menuiserie'])).toEqual(['menuiserie']);
    expect(() => validateTrades(['invented'])).toThrow('invalides');
    expect(() => validSourceUrl('javascript:alert(1)')).toThrow();
    expect(() => validSourceUrl('https://user:password@example.com')).toThrow();
    expect(() => parseDeadline('2030-11-15T10:00')).toThrow('fuseau');
    expect(() => parseDeadline('2020-01-01T10:00:00Z')).toThrow('future');
    expect(parseDeadline('2099-01-01T10:00:00+01:00').toISOString()).toBe('2099-01-01T09:00:00.000Z');
  });
});

describe.skipIf(process.env.OPPORTUNITY_LIVE_SOURCES !== 'true')('live public sources (opt-in)', () => {
  it('collects current ARMP, UNGM and SangoBids metadata without credentials', async () => {
    const armp = await collectSource('armp');
    const ungm = await collectSource('ungm');
    const sangobids = await collectSource('sangobids');
    expect(armp.length).toBeGreaterThan(0);
    expect(ungm.length).toBeGreaterThan(0);
    expect(sangobids.length).toBeGreaterThan(0);
    expect(armp.every((notice) => notice.sourceUrl.startsWith('https://armp.cm/details?'))).toBe(true);
    expect(ungm.every((notice) => notice.title && notice.sourceUrl.startsWith('https://www.ungm.org/Public/Notice/'))).toBe(true);
    expect(sangobids.every((notice) => notice.title && notice.deadline === null && notice.sourceUrl.startsWith('https://sangobids.com/tenders/'))).toBe(true);
    console.info(`Public sources verified: ARMP ${armp.length} calls; UNGM ${ungm.length} Cameroon notices; SangoBids ${sangobids.length} public links.`);
  }, 180000);
});
