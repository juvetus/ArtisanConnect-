import { describe, it, expect } from 'vitest';
import { PdfService } from './pdf.service.js';

const service = new PdfService();

const order = {
  id: 'order-1',
  serviceId: 'service-1',
  service: { title: 'Création site web' },
  client: { name: 'Awa' },
  artisan: { name: 'Juvet' },
  status: 'accepted',
  deliveryMethod: 'home',
  deliveryAddress: 'Bastos, Yaoundé',
  createdAt: '2026-09-01T10:00:00.000Z',
  projectObjective: 'Refonte complète du site vitrine avec une page de contact.',
};

async function expectPdf(promise: Promise<Buffer>) {
  const buffer = await promise;
  expect(buffer.length).toBeGreaterThan(500);
  expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
}

describe('PdfService', () => {
  it('génère la commande de service', async () => {
    await expectPdf(service.order(order));
  });

  it('génère le devis avec des phases multilignes', async () => {
    await expectPdf(
      service.quote(order, {
        proposedPrice: 250000,
        proposedDays: 15,
        expiresAt: '2026-09-20T10:00:00.000Z',
        details: 'Phase 1 : cadrage\nPhase 2 : réalisation\nLivrables : maquettes et site en ligne',
      }),
    );
  });

  it('génère le devis même sans détail fourni', async () => {
    await expectPdf(
      service.quote(order, { proposedPrice: 100000, proposedDays: 5, expiresAt: '2026-09-20T10:00:00.000Z', details: '' }),
    );
  });

  it('génère le reçu de paiement', async () => {
    await expectPdf(
      service.payment(order, { id: 'pay-1', type: 'deposit', amount: 75000, status: 'paid', method: 'momo', paidAt: null }),
    );
  });

  it('génère le rapport admin, y compris sans commande', async () => {
    await expectPdf(service.adminReport({ stats: { users: 12, revenue: 480000 }, recentOrders: [] }));
  });
});
