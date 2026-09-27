import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Invoice, Order, Payment, User } from '../../entities/index.js';
import { EmailService } from '../email/email.service.js';
import { PdfService } from '../reports/pdf.service.js';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly email: EmailService,
    private readonly pdf: PdfService,
    private readonly config: ConfigService,
  ) {}

  async issueForOrder(orderId: string): Promise<Invoice | null> {
    const payment = await this.payments.findOne({ where: { orderId } });
    if (!payment || !['confirmed', 'captured'].includes(payment.status)) return null;

    const existing = await this.invoices.findOne({ where: { orderId } });
    if (existing) return existing;

    const order = await this.orders.findOne({
      where: { id: orderId },
      relations: { buyer: true, seller: true, listing: true },
    });
    if (!order) return null;

    const subtotal = Number(order.totalPrice);
    const taxRate = Number(this.config.get('INVOICE_TAX_RATE', 0)) || 0;
    const taxAmount = Math.round(subtotal * taxRate / 100);
    const invoice = await this.invoices.save(this.invoices.create({
      orderId,
      invoiceNumber: `FAC-${new Date().getFullYear()}-${order.id.slice(0, 8).toUpperCase()}`,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      subtotal,
      taxRate,
      taxAmount,
      total: subtotal + taxAmount,
      currency: 'XAF',
      status: 'issued',
      issuedAt: new Date(),
    }));

    if (order.buyer?.email && !order.buyer.email.endsWith('@phone.artisanconnect.local')) {
      const pdf = await this.pdf.invoice(invoice, order);
      const baseUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      await this.email.send({
        to: order.buyer.email,
        subject: `[ArtisanConnect] Facture ${invoice.invoiceNumber}`,
        text: `Votre facture ${invoice.invoiceNumber} est disponible. Montant total : ${invoice.total.toLocaleString('fr-FR')} ${invoice.currency}.`,
        html: `<div style="font-family:Arial,sans-serif;color:#292524"><h1 style="background:#292524;color:#fff;padding:24px">Artisan<span style="color:#fbbf24">Connect</span></h1><h2>Votre facture est disponible</h2><p>Référence : <strong>${invoice.invoiceNumber}</strong></p><p>Total : <strong>${invoice.total.toLocaleString('fr-FR')} ${invoice.currency}</strong></p><p><a href="${baseUrl}/orders">Consulter mes commandes</a></p></div>`,
        attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdf, contentType: 'application/pdf' }],
      });
    }
    return invoice;
  }

  async getForUser(invoiceId: string, userId: string, role?: string) {
    const invoice = await this.invoices.findOne({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Facture introuvable');
    if (role !== 'admin' && invoice.buyerId !== userId && invoice.sellerId !== userId) throw new ForbiddenException('Cette facture ne vous concerne pas');
    return invoice;
  }

  async getPdf(invoiceId: string, userId: string, role?: string): Promise<Buffer> {
    const invoice = await this.getForUser(invoiceId, userId, role);
    const order = await this.orders.findOne({ where: { id: invoice.orderId }, relations: { buyer: true, seller: true, listing: true } });
    if (!order) throw new NotFoundException('Commande liée introuvable');
    return this.pdf.invoice(invoice, order);
  }

  async getPdfForOrder(orderId: string, userId: string, role?: string): Promise<Buffer> {
    const invoice = await this.invoices.findOne({ where: { orderId } });
    if (!invoice) throw new NotFoundException('Facture indisponible pour cette commande');
    return this.getPdf(invoice.id, userId, role);
  }
}
