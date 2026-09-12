import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfService {
  private createDocument(title: string, lines: string[]) {
    const document = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    const promise = new Promise<Buffer>((resolve) => {
      document.on('data', (chunk) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
    });
    document.fontSize(20).text('ArtisanConnect', { align: 'center' });
    document.moveDown().fontSize(16).text(title);
    document.moveDown();
    lines.forEach((line) => document.fontSize(11).text(line));
    document.end();
    return promise;
  }

  order(order: any) {
    return this.createDocument('Commande de service', [
      `Référence : ${order.id}`,
      `Service : ${order.service?.title ?? order.serviceId}`,
      `Client : ${order.client?.name ?? order.clientId}`,
      `Artisan : ${order.artisan?.name ?? order.artisanId}`,
      `Statut : ${order.status}`,
      `Livraison : ${order.deliveryMethod === 'home' ? `Domicile - ${order.deliveryAddress ?? ''}` : order.deliveryMethod === 'carrier' ? 'Transporteur' : 'Atelier'}`,
      `Créée le : ${new Date(order.createdAt).toLocaleDateString('fr-FR')}`,
      '',
      'Besoin du client :',
      order.projectObjective,
    ]);
  }

  quote(order: any, quote: any) {
    return this.createDocument('Devis de service', [
      `Commande : ${order.id}`,
      `Service : ${order.service?.title ?? order.serviceId}`,
      `Artisan : ${order.artisan?.name ?? order.artisanId}`,
      `Prix proposé : ${quote.proposedPrice} FCFA`,
      `Délai proposé : ${quote.proposedDays} jours`,
      `Valable jusqu'au : ${new Date(quote.expiresAt).toLocaleDateString('fr-FR')}`,
      '',
      'Phases et livrables :',
      quote.details,
    ]);
  }

  payment(order: any, payment: any) {
    return this.createDocument('Reçu de paiement', [
      `Référence paiement : ${payment.id}`,
      `Commande : ${order.id}`,
      `Service : ${order.service?.title ?? order.serviceId}`,
      `Type : ${payment.type === 'deposit' ? 'Acompte 30 %' : 'Solde 70 %'}`,
      `Montant : ${payment.amount} FCFA`,
      `Statut : ${payment.status}`,
      `Méthode : ${payment.method}`,
      `Transaction : ${payment.transactionId ?? 'N/A'}`,
      `Date : ${payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}`,
    ]);
  }

  adminReport(data: { stats: Record<string, unknown>; recentOrders: any[] }) {
    return this.createDocument('Rapport administrateur', [
      ...Object.entries(data.stats).map(([key, value]) => `${key} : ${value}`),
      '',
      'Commandes récentes :',
      ...data.recentOrders.map((order) => `${order.id} - ${order.status} - ${order.totalPrice ?? ''} FCFA`),
    ]);
  }
}
