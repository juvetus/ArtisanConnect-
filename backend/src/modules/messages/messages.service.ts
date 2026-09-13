import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Message, User } from '../../entities/index.js';
import { ServiceOrder } from '../../entities/service-order.entity.js';
import { EmailService } from '../email/email.service.js';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(ServiceOrder)
    private serviceOrdersRepository: Repository<ServiceOrder>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  async create(message: Partial<Message>): Promise<Message> {
    const newMessage = this.messagesRepository.create(message);
    const savedMessage = await this.messagesRepository.save(newMessage);
    await this.sendMessageEmailNotification(savedMessage);
    return savedMessage;
  }

  private async sendMessageEmailNotification(message: Message): Promise<void> {
    if (!message.recipientId || !message.senderId) return;

    try {
      const [recipient, sender] = await Promise.all([
        this.usersRepository.findOne({ where: { id: message.recipientId } }),
        this.usersRepository.findOne({ where: { id: message.senderId } }),
      ]);
      if (!recipient?.email) return;

      await this.emailService.sendNewMessageEmail({
        to: recipient.email,
        recipientName: recipient.name || 'Utilisateur',
        senderName: sender?.name || 'Un utilisateur',
        content: message.content || 'Pièce jointe',
        messagesUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/messages`,
        hasAttachments: Boolean(message.fileUrls?.length),
      });
    } catch {
      // La notification e-mail ne doit jamais bloquer la messagerie interne.
    }
  }

  async findByConversation(userId1: string, userId2: string, skip = 0, take = 50): Promise<[Message[], number]> {
    return this.messagesRepository.findAndCount({
      where: [
        { senderId: userId1, recipientId: userId2 },
        { senderId: userId2, recipientId: userId1 },
      ],
      relations: { sender: true, recipient: true },
      order: { createdAt: 'ASC' },
      skip,
      take,
    });
  }

  async findByOrder(orderId: string): Promise<Message[]> {
    return this.messagesRepository.find({
      where: { orderId },
      relations: { sender: true, recipient: true },
      order: { createdAt: 'ASC' },
    });
  }

  async createForServiceOrder(userId: string, serviceOrderId: string, content: string) {
    const order = await this.serviceOrdersRepository.findOne({ where: { id: serviceOrderId } });
    if (!order) throw new NotFoundException('Commande de service introuvable');
    if (order.clientId !== userId && order.artisanId !== userId) {
      throw new ForbiddenException('Cette commande ne vous concerne pas');
    }
    const recipientId = order.clientId === userId ? order.artisanId : order.clientId;
    return this.create({ senderId: userId, recipientId, serviceOrderId, content });
  }

  async attachServiceFile(userId: string, serviceOrderId: string, fileUrl: string) {
    const order = await this.serviceOrdersRepository.findOne({ where: { id: serviceOrderId } });
    if (!order) throw new NotFoundException('Commande de service introuvable');
    if (order.clientId !== userId && order.artisanId !== userId) throw new ForbiddenException('Cette commande ne vous concerne pas');
    const recipientId = order.clientId === userId ? order.artisanId : order.clientId;
    return this.create({ senderId: userId, recipientId, serviceOrderId, content: 'Pièce jointe', fileUrls: [fileUrl] });
  }

  async getServiceFile(userId: string, filename: string) {
    const safeFilename = path.basename(filename);
    const fileUrl = `/messages/files/${safeFilename}`;
    const message = await this.messagesRepository.createQueryBuilder('message')
      .leftJoinAndSelect('message.serviceOrder', 'serviceOrder')
      .where(":fileUrl = ANY(string_to_array(message.fileUrls, ','))", { fileUrl })
      .getOne();
    if (!message?.serviceOrder) throw new NotFoundException('Fichier introuvable');
    if (message.serviceOrder.clientId !== userId && message.serviceOrder.artisanId !== userId) throw new ForbiddenException('Accès refusé');
    const filePath = path.resolve(process.cwd(), 'uploads', 'service-messages', safeFilename);
    if (!existsSync(filePath)) throw new NotFoundException('Fichier introuvable');
    return { path: filePath, mimeType: 'application/octet-stream' };
  }

  async findByServiceOrder(userId: string, serviceOrderId: string, skip = 0, take = 50) {
    const order = await this.serviceOrdersRepository.findOne({ where: { id: serviceOrderId } });
    if (!order) throw new NotFoundException('Commande de service introuvable');
    if (order.clientId !== userId && order.artisanId !== userId) {
      throw new ForbiddenException('Cette commande ne vous concerne pas');
    }
    return this.messagesRepository.findAndCount({
      where: { serviceOrderId },
      relations: { sender: true, recipient: true },
      order: { createdAt: 'ASC' },
      skip,
      take,
    });
  }

  async findById(id: string): Promise<Message | null> {
    return this.messagesRepository.findOne({ where: { id } });
  }

  async markAsRead(id: string): Promise<Message | null> {
    await this.messagesRepository.update(id, { read: true });
    return this.messagesRepository.findOne({ where: { id } });
  }

  /** Marque comme lus tous les messages reçus d'un interlocuteur donné. */
  async markConversationAsRead(userId: string, otherUserId: string): Promise<void> {
    await this.messagesRepository.update(
      { recipientId: userId, senderId: otherUserId, read: false },
      { read: true },
    );
  }

  /** Une entrée par interlocuteur, avec le dernier message échangé. */
  async findThreads(userId: string) {
    const messages = await this.messagesRepository.find({
      where: [{ senderId: userId }, { recipientId: userId }],
      relations: { sender: true, recipient: true },
      order: { createdAt: 'DESC' },
    });

    const threads = new Map<
      string,
      { user: { id: string; name: string }; lastMessage: Message; unread: number }
    >();

    for (const message of messages) {
      const isIncoming = message.recipientId === userId;
      const other = isIncoming ? message.sender : message.recipient;
      if (!other) continue;

      const existing = threads.get(other.id);
      if (existing) {
        if (isIncoming && !message.read) existing.unread += 1;
      } else {
        threads.set(other.id, {
          user: { id: other.id, name: other.name },
          lastMessage: message,
          unread: isIncoming && !message.read ? 1 : 0,
        });
      }
    }

    return [...threads.values()];
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.messagesRepository.count({
      where: { recipientId: userId, read: false },
    });
  }
}


