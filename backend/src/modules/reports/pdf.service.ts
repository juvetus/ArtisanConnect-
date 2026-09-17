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
    const document = new PDFDocument({ margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    const promise = new Promise<Buffer>((resolve) => {
      document.on('data', (chunk) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
    });
    const pageWidth = document.page.width - document.page.margins.left - document.page.margins.right;
    const labelWidth = pageWidth * 0.62;
    const valueWidth = pageWidth - labelWidth;
    const rowHeight = 24;
    const footer = () => {
      document.save();
      document.fillColor('#78716c').fontSize(8).text('ArtisanConnect | Rapport de pilotage', document.page.margins.left, document.page.height - 32, {
        width: pageWidth,
        align: 'center',
        lineBreak: false,
      });
      document.restore();
    };
    const statLabels: Record<string, string> = {
      users: 'Utilisateurs',
      artisans: 'Artisans',
      clients: 'Clients',
      institutions: 'Institutions',
      listings: 'Annonces actives',
      orders: 'Commandes',
      revenue: 'Volume terminé (FCFA)',
      platformFees: 'Commissions plateforme (FCFA)',
      servicePlatformFees: 'Commissions services (FCFA)',
      pendingPayments: 'Paiements en attente',
      womenArtisans: 'Femmes artisanes',
      womenPercentage: 'Part des femmes artisanes (%)',
      cooperativeArtisans: 'Artisans en coopérative',
      cooperativePercentage: 'Part des coopératives (%)',
      resources: 'Ressources publiées',
      programs: 'Programmes actifs',
      programApplications: 'Candidatures',
      activeShops: 'Boutiques actives',
      shopViews: 'Vues boutique',
      whatsappContacts: 'Contacts WhatsApp',
      shopShares: 'Partages boutique',
      successfulSales: 'Ventes réussies',
    };

    const drawTable = (headers: string[], rows: string[][], widths: number[]) => {
      const startX = document.page.margins.left;
      let y = document.y;
      const drawRow = (cells: string[], header = false) => {
        if (y + rowHeight > document.page.height - document.page.margins.bottom) {
          document.addPage();
          y = document.page.margins.top;
        }
        let x = startX;
        cells.forEach((cell, index) => {
          const width = widths[index];
          document.rect(x, y, width, rowHeight)
            .fillAndStroke(header ? '#292524' : index % 2 === 0 ? '#fafaf9' : '#ffffff', '#d6d3d1');
          document.fillColor(header ? '#ffffff' : '#292524').fontSize(10).text(String(cell), x + 8, y + 7, {
            width: width - 16,
            height: rowHeight - 10,
            ellipsis: true,
          });
          x += width;
        });
        y += rowHeight;
      };

      drawRow(headers, true);
      rows.forEach((row) => drawRow(row));
      document.y = y + 12;
    };

    document.rect(document.page.margins.left, 45, pageWidth, 56).fill('#292524');
    document.fillColor('#ffffff').fontSize(21).text('Artisan', document.page.margins.left + 18, 62, { continued: true });
    document.fillColor('#f59e0b').text('Connect');
    document.fillColor('#57534e').fontSize(9).text('PILOTAGE ADMINISTRATEUR', document.page.margins.left, 115, {
      characterSpacing: 1.2,
    });
    document.fillColor('#292524').fontSize(17).text('Rapport de performance');
    document.fillColor('#78716c').fontSize(9).text(`Édité le ${new Date().toLocaleDateString('fr-FR')}`);
    document.moveDown();
    drawTable(
      ['Indicateur', 'Valeur'],
      Object.entries(data.stats).map(([key, value]) => [statLabels[key] ?? key, String(value ?? 0)]),
      [labelWidth, valueWidth],
    );

    document.fontSize(13).fillColor('#292524').text('Commandes récentes');
    document.moveDown(0.5);
    drawTable(
      ['Référence', 'Statut', 'Montant'],
      data.recentOrders.map((order) => [order.id, order.status, `${order.totalPrice ?? 0} FCFA`]),
      [pageWidth * 0.46, pageWidth * 0.24, pageWidth * 0.3],
    );
    const pageRange = document.bufferedPageRange();
    for (let pageIndex = pageRange.start; pageIndex < pageRange.start + pageRange.count; pageIndex += 1) {
      document.switchToPage(pageIndex);
      footer();
    }
    document.end();
    return promise;
  }
}
