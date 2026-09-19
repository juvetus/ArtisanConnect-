import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

type TableSection = {
  heading?: string;
  headers: string[];
  rows: string[][];
  /** Répartition des colonnes en fractions de la largeur utile (somme = 1). */
  columns?: number[];
  emptyMessage?: string;
};

const CELL_PADDING = 8;
const MIN_ROW_HEIGHT = 22;

@Injectable()
export class PdfService {
  /** Tous les exports PDF partagent la même mise en page : en-tête, tableaux, pied paginé. */
  private render(
    title: string,
    subtitle: string,
    sections: TableSection[],
    footerLabel = 'ArtisanConnect',
  ): Promise<Buffer> {
    const document = new PDFDocument({ margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];
    const promise = new Promise<Buffer>((resolve) => {
      document.on('data', (chunk) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const pageWidth = document.page.width - document.page.margins.left - document.page.margins.right;

    document.rect(document.page.margins.left, 45, pageWidth, 56).fill('#292524');
    document.fillColor('#ffffff').fontSize(21).text('Artisan', document.page.margins.left + 18, 62, { continued: true });
    document.fillColor('#f59e0b').text('Connect');
    document.fillColor('#57534e').fontSize(9).text(subtitle.toUpperCase(), document.page.margins.left, 115, {
      characterSpacing: 1.2,
    });
    document.fillColor('#292524').fontSize(17).text(title);
    document.fillColor('#78716c').fontSize(9).text(`Édité le ${new Date().toLocaleDateString('fr-FR')}`);
    document.moveDown();

    sections.forEach((section) => {
      if (section.heading) {
        if (document.y + 60 > document.page.height - document.page.margins.bottom) document.addPage();
        document.fontSize(13).fillColor('#292524').text(section.heading);
        document.moveDown(0.4);
      }
      if (!section.rows.length && section.emptyMessage) {
        document.fontSize(10).fillColor('#78716c').text(section.emptyMessage);
        document.moveDown();
        return;
      }
      this.drawTable(document, pageWidth, section);
    });

    const pageRange = document.bufferedPageRange();
    for (let pageIndex = pageRange.start; pageIndex < pageRange.start + pageRange.count; pageIndex += 1) {
      document.switchToPage(pageIndex);
      document.save();
      document
        .fillColor('#78716c')
        .fontSize(8)
        .text(
          `${footerLabel} — page ${pageIndex + 1}/${pageRange.count}`,
          document.page.margins.left,
          document.page.height - 32,
          { width: pageWidth, align: 'center', lineBreak: false },
        );
      document.restore();
    }

    document.end();
    return promise;
  }

  /** Les hauteurs de ligne s'adaptent au contenu : un texte long ne doit jamais être tronqué. */
  private drawTable(document: PDFKit.PDFDocument, pageWidth: number, section: TableSection) {
    const fractions = section.columns ?? section.headers.map(() => 1 / section.headers.length);
    const widths = fractions.map((fraction) => pageWidth * fraction);
    const startX = document.page.margins.left;
    let y = document.y;

    const drawRow = (cells: string[], isHeader = false, rowIndex = 0) => {
      document.fontSize(isHeader ? 10 : 9.5);
      const height = Math.max(
        MIN_ROW_HEIGHT,
        ...cells.map(
          (cell, index) =>
            document.heightOfString(String(cell ?? ''), { width: widths[index] - CELL_PADDING * 2 }) + CELL_PADDING * 1.6,
        ),
      );

      if (y + height > document.page.height - document.page.margins.bottom) {
        document.addPage();
        y = document.page.margins.top;
      }

      let x = startX;
      cells.forEach((cell, index) => {
        const width = widths[index];
        document
          .rect(x, y, width, height)
          .fillAndStroke(isHeader ? '#292524' : rowIndex % 2 === 0 ? '#fafaf9' : '#ffffff', '#d6d3d1');
        document
          .fillColor(isHeader ? '#ffffff' : '#292524')
          .fontSize(isHeader ? 10 : 9.5)
          .text(String(cell ?? ''), x + CELL_PADDING, y + CELL_PADDING * 0.8, { width: width - CELL_PADDING * 2 });
        x += width;
      });
      y += height;
    };

    drawRow(section.headers, true);
    section.rows.forEach((row, index) => drawRow(row, false, index));
    document.y = y + 14;
  }

  private static deliveryLabel(order: any): string {
    if (order.deliveryMethod === 'home') return `Domicile — ${order.deliveryAddress ?? 'adresse non précisée'}`;
    if (order.deliveryMethod === 'carrier') return 'Transporteur partenaire';
    return 'Retrait à l’atelier';
  }

  order(order: any) {
    return this.render('Commande de service', 'Document de commande', [
      {
        heading: 'Informations générales',
        headers: ['Champ', 'Valeur'],
        columns: [0.34, 0.66],
        rows: [
          ['Référence', order.id],
          ['Service', order.service?.title ?? order.serviceId],
          ['Client', order.client?.name ?? order.clientId],
          ['Artisan', order.artisan?.name ?? order.artisanId],
          ['Statut', order.status],
          ['Livraison', PdfService.deliveryLabel(order)],
          ['Créée le', new Date(order.createdAt).toLocaleDateString('fr-FR')],
        ],
      },
      {
        heading: 'Besoin du client',
        headers: ['Description du projet'],
        columns: [1],
        rows: [[order.projectObjective ?? '—']],
      },
    ]);
  }

  quote(order: any, quote: any) {
    const details = String(quote.details ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => [line]);

    return this.render('Devis de service', 'Proposition commerciale', [
      {
        heading: 'Références',
        headers: ['Champ', 'Valeur'],
        columns: [0.34, 0.66],
        rows: [
          ['Commande', order.id],
          ['Service', order.service?.title ?? order.serviceId],
          ['Artisan', order.artisan?.name ?? order.artisanId],
          ['Client', order.client?.name ?? order.clientId],
        ],
      },
      {
        heading: 'Proposition',
        headers: ['Prix proposé', 'Délai', 'Valable jusqu’au'],
        columns: [0.34, 0.33, 0.33],
        rows: [
          [
            `${Number(quote.proposedPrice).toLocaleString('fr-FR')} FCFA`,
            `${quote.proposedDays} jours`,
            new Date(quote.expiresAt).toLocaleDateString('fr-FR'),
          ],
        ],
      },
      {
        heading: 'Phases et livrables',
        headers: ['Détail de la prestation'],
        columns: [1],
        rows: details,
        emptyMessage: 'Aucun détail fourni.',
      },
    ]);
  }

  payment(order: any, payment: any) {
    return this.render('Reçu de paiement', 'Justificatif de règlement', [
      {
        heading: 'Paiement',
        headers: ['Champ', 'Valeur'],
        columns: [0.34, 0.66],
        rows: [
          ['Référence paiement', payment.id],
          ['Type', payment.type === 'deposit' ? 'Acompte 30 %' : 'Solde 70 %'],
          ['Montant', `${Number(payment.amount).toLocaleString('fr-FR')} FCFA`],
          ['Statut', payment.status],
          ['Méthode', payment.method],
          ['Transaction', payment.transactionId ?? 'N/A'],
          [
            'Date',
            payment.paidAt
              ? new Date(payment.paidAt).toLocaleDateString('fr-FR')
              : new Date().toLocaleDateString('fr-FR'),
          ],
        ],
      },
      {
        heading: 'Commande associée',
        headers: ['Champ', 'Valeur'],
        columns: [0.34, 0.66],
        rows: [
          ['Commande', order.id],
          ['Service', order.service?.title ?? order.serviceId],
          ['Client', order.client?.name ?? order.clientId],
          ['Artisan', order.artisan?.name ?? order.artisanId],
        ],
      },
    ]);
  }

  adminReport(data: { stats: Record<string, unknown>; recentOrders: any[] }) {
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

    return this.render(
      'Rapport de performance',
      'Pilotage administrateur',
      [
        {
          heading: 'Indicateurs',
          headers: ['Indicateur', 'Valeur'],
          columns: [0.62, 0.38],
          rows: Object.entries(data.stats).map(([key, value]) => [statLabels[key] ?? key, String(value ?? 0)]),
        },
        {
          heading: 'Commandes récentes',
          headers: ['Référence', 'Statut', 'Montant'],
          columns: [0.46, 0.24, 0.3],
          rows: data.recentOrders.map((order) => [
            order.id,
            order.status,
            `${Number(order.totalPrice ?? 0).toLocaleString('fr-FR')} FCFA`,
          ]),
          emptyMessage: 'Aucune commande sur la période.',
        },
      ],
      'ArtisanConnect | Rapport de pilotage',
    );
  }
}
