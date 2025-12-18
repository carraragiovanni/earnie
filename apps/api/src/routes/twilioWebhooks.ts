import { Router } from 'express';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { validateTwilioWebhookSignature } from '../twilio/signature.js';
import { decryptAuthToken } from '../twilio/client.js';
import type { Server } from 'socket.io';
import { emitToConversation, emitToUser } from '../events.js';

function toStringMap(body: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!body || typeof body !== 'object') return out;
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
    else if (typeof v === 'number') out[k] = String(v);
  }
  return out;
}

function extractMedia(params: Record<string, string>) {
  const num = Number(params.NumMedia ?? '0');
  if (!Number.isFinite(num) || num <= 0) return [];
  const items: Array<{ url: string; contentType?: string }> = [];
  for (let i = 0; i < num; i++) {
    const url = params[`MediaUrl${i}`];
    if (!url) continue;
    items.push({ url, contentType: params[`MediaContentType${i}`] });
  }
  return items;
}

export function twilioWebhooksRouter(io: Server) {
  const router = Router();

  // Twilio uses application/x-www-form-urlencoded; body parsing is configured in index.ts.
  router.post('/inbound', async (req, res) => {
    const params = toStringMap(req.body);
    const to = params.To;
    const from = params.From;
    const body = params.Body ?? '';

    if (!to || !from) return res.status(400).send('Missing To/From');

    const phone = await prisma.inboxPhoneNumber.findFirst({
      where: { e164: to },
      include: { inbox: { include: { user: true, twilioConfig: true } } }
    });

    if (!phone) return res.status(404).send('Unknown number');

    if (!env.TWILIO_WEBHOOK_SKIP_SIGNATURE) {
      const signature = req.header('x-twilio-signature');
      const authToken = decryptAuthToken(phone.inbox.twilioConfig.authTokenEnc);
      const url = `${env.PUBLIC_BASE_URL}/twilio/inbound`;
      const ok = validateTwilioWebhookSignature({
        authToken,
        twilioSignatureHeader: signature,
        url,
        params
      });
      if (!ok) return res.status(401).send('Invalid signature');
    }

    const userId = phone.inbox.userId;
    const inboxId = phone.inboxId;

    const contact =
      (await prisma.contact.findFirst({ where: { userId, primaryPhone: from } })) ??
      (await prisma.contact.create({ data: { userId, primaryPhone: from, name: null } }));

    const conversation = await prisma.conversation.upsert({
      where: { inboxId_contactId: { inboxId, contactId: contact.id } },
      update: { lastMessageAt: new Date() },
      create: { inboxId, contactId: contact.id, lastMessageAt: new Date() }
    });

    const media = extractMedia(params);

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'INBOUND',
        from,
        to,
        body,
        mediaJson: media.length ? JSON.stringify(media) : null,
        twilioSid: params.MessageSid,
        status: params.SmsStatus ?? params.MessageStatus
      }
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: message.createdAt }
    });

    emitToConversation(io, conversation.id, 'message:new', message);
    emitToUser(io, userId, 'conversation:updated', {
      conversationId: conversation.id,
      lastMessageAt: message.createdAt
    });

    // Twilio expects 200 quickly.
    return res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  });

  router.post('/status', async (req, res) => {
    const params = toStringMap(req.body);
    const sid = params.MessageSid;
    const status = params.MessageStatus ?? params.SmsStatus;
    if (!sid || !status) return res.status(200).send('ok');

    const msg = await prisma.message.findFirst({ where: { twilioSid: sid } });
    if (!msg) return res.status(200).send('ok');

    const updated = await prisma.message.update({
      where: { id: msg.id },
      data: { status }
    });

    emitToConversation(io, msg.conversationId, 'message:updated', updated);
    return res.status(200).send('ok');
  });

  return router;
}
