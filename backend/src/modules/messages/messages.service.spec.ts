import { describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import { Message, User } from '../../entities/index.js';
import type { ServiceOrder } from '../../entities/service-order.entity.js';
import type { EmailService } from '../email/email.service.js';
import { MessagesService } from './messages.service.js';

function createService(options: { emailFails?: boolean } = {}) {
  const savedMessage = {
    id: 'message-1',
    senderId: 'sender-1',
    recipientId: 'recipient-1',
    content: 'Bonjour, votre commande est prête.',
    fileUrls: [],
  } as unknown as Message;

  const messagesRepository = {
    create: vi.fn().mockImplementation((message) => message),
    save: vi.fn().mockResolvedValue(savedMessage),
  } as Partial<Record<keyof Repository<Message>, any>>;

  const serviceOrdersRepository = {} as Partial<Record<keyof Repository<ServiceOrder>, any>>;

  const usersRepository = {
    findOne: vi.fn()
      .mockResolvedValueOnce({ id: 'recipient-1', email: 'client@example.test', name: 'Client' } as User)
      .mockResolvedValueOnce({ id: 'sender-1', email: 'artisan@example.test', name: 'Artisan' } as User),
  } as Partial<Record<keyof Repository<User>, any>>;

  const emailService = {
    sendNewMessageEmail: options.emailFails
      ? vi.fn().mockRejectedValue(new Error('SMTP down'))
      : vi.fn().mockResolvedValue(true),
  } as Partial<EmailService>;

  return {
    service: new MessagesService(
      messagesRepository as Repository<Message>,
      serviceOrdersRepository as Repository<ServiceOrder>,
      usersRepository as Repository<User>,
      emailService as EmailService,
    ),
    messagesRepository,
    emailService,
    savedMessage,
  };
}

describe('MessagesService', () => {
  it('envoie un e-mail au destinataire après création du message', async () => {
    const { service, emailService, savedMessage } = createService();

    await expect(service.create({ senderId: 'sender-1', recipientId: 'recipient-1', content: savedMessage.content })).resolves.toBe(savedMessage);

    expect(emailService.sendNewMessageEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'client@example.test',
      recipientName: 'Client',
      senderName: 'Artisan',
      content: savedMessage.content,
    }));
  });

  it('conserve le message interne même si l’e-mail échoue', async () => {
    const { service, emailService, savedMessage } = createService({ emailFails: true });

    await expect(service.create({ senderId: 'sender-1', recipientId: 'recipient-1', content: savedMessage.content })).resolves.toBe(savedMessage);

    expect(emailService.sendNewMessageEmail).toHaveBeenCalledOnce();
  });
});
