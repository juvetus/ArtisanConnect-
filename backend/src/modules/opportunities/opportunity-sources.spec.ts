import { afterEach, describe, expect, it, vi } from 'vitest';
import { collectSource, fetchSource, parseArmp, parseUngm } from './opportunity-sources.js';
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
  it('collects current ARMP and UNGM metadata without credentials', async () => {
    const armp = await collectSource('armp');
    const ungm = await collectSource('ungm');
    expect(armp.length).toBeGreaterThan(0);
    expect(ungm.length).toBeGreaterThan(0);
    expect(armp.every((notice) => notice.sourceUrl.startsWith('https://armp.cm/details?'))).toBe(true);
    expect(ungm.every((notice) => notice.title && notice.sourceUrl.startsWith('https://www.ungm.org/Public/Notice/'))).toBe(true);
    console.info(`Public sources verified: ARMP ${armp.length} calls; UNGM ${ungm.length} Cameroon notices.`);
  }, 180000);
});
