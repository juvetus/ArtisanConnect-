import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailService, type EmailMessage } from './email.service.js';

const message: EmailMessage = {
  to: 'Recipient <recipient@example.com>',
  subject: 'Test',
  text: 'Plain text',
  html: '<p>HTML</p>',
};

function createService(overrides: Record<string, string> = {}) {
  return new EmailService(new ConfigService({
    SMTP_ENABLED: 'true',
    SMTP_FROM: 'ArtisanConnect <sender@example.com>',
    BREVO_EMAIL_API_KEY: 'test-email-key',
    ...overrides,
  }));
}

describe('EmailService transports', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const sendMail = vi.fn().mockResolvedValue({ messageId: 'smtp-message' });

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ messageId: 'brevo-message' }), { status: 201 }));
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail } as ReturnType<typeof nodemailer.createTransport>);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    sendMail.mockClear();
  });

  it('prefers the dedicated HTTPS key and preserves content, addresses and attachments', async () => {
    await expect(createService().send({
      ...message,
      replyTo: '"Support Team" <support@example.com>',
      attachments: [{ filename: 'invoice.pdf', content: Buffer.from('PDF'), contentType: 'application/pdf' }],
    })).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': 'test-email-key' },
      signal: expect.any(AbortSignal),
      body: JSON.stringify({
        sender: { email: 'sender@example.com', name: 'ArtisanConnect' },
        to: [{ email: 'recipient@example.com', name: 'Recipient' }],
        replyTo: { email: 'support@example.com', name: 'Support Team' },
        subject: 'Test',
        textContent: 'Plain text',
        htmlContent: '<p>HTML</p>',
        attachment: [{ name: 'invoice.pdf', content: Buffer.from('PDF').toString('base64') }],
      }),
    });
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('supports bare addresses and text-only email', async () => {
    await expect(createService({ SMTP_FROM: 'sender@example.com' }).send({
      to: 'recipient@example.com', subject: 'Text', text: 'Hello',
    })).resolves.toBe(true);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      sender: { email: 'sender@example.com' }, to: [{ email: 'recipient@example.com' }],
      subject: 'Text', textContent: 'Hello',
    });
  });

  it('does not send over either transport when disabled', async () => {
    await expect(createService({ SMTP_ENABLED: 'false' }).send(message)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('keeps SMTP when the dedicated key is absent, without using the SMS key', async () => {
    const service = createService({
      BREVO_EMAIL_API_KEY: '', BREVO_API_KEY: 'sms-key', SMTP_HOST: 'smtp.example.com',
    });
    await expect(service.send(message)).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'ArtisanConnect <sender@example.com>', to: message.to,
      subject: message.subject, text: message.text, html: message.html,
    }));
  });

  it('reports SMTP failures', async () => {
    sendMail.mockRejectedValueOnce(new Error('SMTP unavailable'));
    await expect(createService({ BREVO_EMAIL_API_KEY: '', SMTP_HOST: 'smtp.example.com' }).send(message)).resolves.toBe(false);
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it.each([401, 403, 429, 500])('reports HTTP %s without fallback or leaking provider content', async (status) => {
    fetchMock.mockResolvedValue(new Response('sensitive-provider-detail', { status }));
    await expect(createService().send(message)).resolves.toBe(false);
    expect(Logger.prototype.error).toHaveBeenCalledWith(`Brevo email API refused delivery (HTTP ${status})`);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it.each(['{}', '{"messageId":""}', '{"messageId":123}', 'invalid json'])('does not report success for %s', async (body) => {
    fetchMock.mockResolvedValue(new Response(body, { status: 201 }));
    await expect(createService().send(message)).resolves.toBe(false);
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it('bounds the HTTPS request to 15 seconds and reports timeouts without retrying', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    fetchMock.mockRejectedValue(new DOMException('sensitive detail', 'TimeoutError'));
    await expect(createService().send(message)).resolves.toBe(false);
    expect(timeout).toHaveBeenCalledWith(15_000);
    expect(Logger.prototype.error).toHaveBeenCalledWith('Brevo email API request failed (TimeoutError)');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it.each(['', 'invalid', 'a@example.com,b@example.com', 'Name\r\nInjected <a@example.com>'])('rejects invalid sender %j explicitly', async (sender) => {
    await expect(createService({ SMTP_FROM: sender }).send(message)).resolves.toBe(false);
    expect(Logger.prototype.error).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid reply-to explicitly', async () => {
    await expect(createService().send({ ...message, replyTo: 'invalid' })).resolves.toBe(false);
    expect(Logger.prototype.error).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('routes verification and reset templates through HTTPS', async () => {
    const service = createService();
    await expect(service.sendVerificationEmail({
      to: 'recipient@example.com', userName: '<User>', verificationUrl: 'https://example.com/verify?token=test',
    })).resolves.toBe(true);
    await expect(service.sendPasswordResetEmail({
      to: 'recipient@example.com', userName: '<User>', resetUrl: 'https://example.com/reset?token=test',
    })).resolves.toBe(true);
    const bodies = fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
    expect(bodies[0].htmlContent).toContain('&lt;User&gt;');
    expect(bodies[0].textContent).toContain('https://example.com/verify?token=test');
    expect(bodies[1].htmlContent).toContain('https://example.com/reset?token=test');
  });
});
