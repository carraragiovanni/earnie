import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth/middleware.js';
import { getTwilioClient } from '../twilio/client.js';
import { decryptString } from '../crypto/encryption.js';
import { env } from '../env.js';
import type { Server } from 'socket.io';
import { emitToConversation, emitToUser } from '../events.js';

export function messagesRouter(io: Server) {
  const router = Router();
  router.use(requireAuth);

  router.post('/conversations/:id/messages', async (req: AuthedRequest, res) => {
    const conversationId = z.string().parse(req.params.id);
    const input = z
      .object({
        body: z.string().min(1),
        fromE164: z.string().min(6).optional()
      })
      .parse(req.body);

    const convo = await prisma.conversation.findFirst({
      where: { id: conversationId, inbox: { userId: req.user!.id } },
      include: {
        inbox: {
          include: {
            phoneNumbers: true,
            twilioConfig: true
          }
        },
        contact: true
      }
    });

    if (!convo) return res.status(404).json({ error: 'not_found' });

    const from =
      input.fromE164 ??
      convo.inbox.phoneNumbers[0]?.e164 ??
      (() => {
        throw new Error('Inbox has no phone numbers');
      })();

    const to = convo.contact.primaryPhone;

    const created = await prisma.message.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        from,
        to,
        body: input.body,
        status: 'queued'
      }
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: created.createdAt }
    });

    emitToConversation(io, conversationId, 'message:new', created);
    emitToUser(io, req.user!.id, 'conversation:updated', { conversationId, lastMessageAt: created.createdAt });

    const client = getTwilioClient(convo.inbox.twilioConfig);

    const messagingServiceSid = convo.inbox.twilioConfig.messagingServiceSidEnc
      ? decryptString(convo.inbox.twilioConfig.messagingServiceSidEnc, env.APP_ENCRYPTION_KEY)
      : undefined;

    try {
      const msg = await client.messages.create({
        to,
        body: input.body,
        ...(messagingServiceSid ? { messagingServiceSid } : { from }),
        statusCallback: `${env.PUBLIC_BASE_URL}/twilio/status`
      });

      const updated = await prisma.message.update({
        where: { id: created.id },
        data: { twilioSid: msg.sid, status: msg.status }
      });

      emitToConversation(io, conversationId, 'message:updated', updated);
      return res.status(201).json({ message: updated });
    } catch {
      const updated = await prisma.message.update({
        where: { id: created.id },
        data: { status: 'failed' }
      });

      emitToConversation(io, conversationId, 'message:updated', updated);
      return res.status(502).json({ error: 'twilio_send_failed' });
    }
  });

  return router;
}
