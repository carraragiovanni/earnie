import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth/middleware.js';

export const conversationsRouter = Router();

conversationsRouter.use(requireAuth);

conversationsRouter.post('/inbox/:inboxId/start', async (req: AuthedRequest, res) => {
  const inboxId = z.string().parse(req.params.inboxId);
  const input = z
    .object({
      toPhone: z.string().min(6),
      name: z.string().min(1).optional()
    })
    .parse(req.body);

  const inbox = await prisma.inbox.findFirst({ where: { id: inboxId, userId: req.user!.id } });
  if (!inbox) return res.status(404).json({ error: 'not_found' });

  const contact =
    (await prisma.contact.findFirst({ where: { userId: req.user!.id, primaryPhone: input.toPhone } })) ??
    (await prisma.contact.create({
      data: { userId: req.user!.id, primaryPhone: input.toPhone, name: input.name ?? null }
    }));

  const conversation = await prisma.conversation.upsert({
    where: { inboxId_contactId: { inboxId, contactId: contact.id } },
    update: {},
    create: { inboxId, contactId: contact.id }
  });

  const full = await prisma.conversation.findUnique({
    where: { id: conversation.id },
    include: {
      contact: { include: { fieldValues: { include: { fieldDef: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 }
    }
  });

  return res.status(201).json({ conversation: full });
});

conversationsRouter.get('/inbox/:inboxId', async (req: AuthedRequest, res) => {
  const inboxId = z.string().parse(req.params.inboxId);

  const inbox = await prisma.inbox.findFirst({ where: { id: inboxId, userId: req.user!.id } });
  if (!inbox) return res.status(404).json({ error: 'not_found' });

  const conversations = await prisma.conversation.findMany({
    where: { inboxId },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      contact: { include: { fieldValues: { include: { fieldDef: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 }
    }
  });

  return res.json({ conversations });
});

conversationsRouter.get('/:id/messages', async (req: AuthedRequest, res) => {
  const conversationId = z.string().parse(req.params.id);

  const convo = await prisma.conversation.findFirst({
    where: { id: conversationId, inbox: { userId: req.user!.id } }
  });
  if (!convo) return res.status(404).json({ error: 'not_found' });

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' }
  });

  return res.json({ messages });
});

conversationsRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const conversationId = z.string().parse(req.params.id);
  const input = z.object({ aiEnabled: z.boolean().optional() }).parse(req.body);

  const convo = await prisma.conversation.findFirst({
    where: { id: conversationId, inbox: { userId: req.user!.id } }
  });
  if (!convo) return res.status(404).json({ error: 'not_found' });

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: { aiEnabled: input.aiEnabled ?? undefined }
  });

  return res.json({ conversation: updated });
});
