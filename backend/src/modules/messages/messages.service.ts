import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../../entities/index.js';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
  ) {}

  async create(message: Partial<Message>): Promise<Message> {
    const newMessage = this.messagesRepository.create(message);
    return this.messagesRepository.save(newMessage);
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


