import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth/middleware.js';

export const inboxesRouter = Router();

inboxesRouter.use(requireAuth);

inboxesRouter.get('/', async (req: AuthedRequest, res) => {
  const inboxes = await prisma.inbox.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    include: { phoneNumbers: true, twilioConfig: { select: { id: true, name: true } } }
  });
  return res.json({ inboxes });
});

inboxesRouter.post('/', async (req: AuthedRequest, res) => {
  const input = z
    .object({
      name: z.string().min(1),
      twilioConfigId: z.string().min(1),
      aiEnabled: z.boolean().optional()
    })
    .parse(req.body);

  const cfg = await prisma.twilioConfig.findFirst({
    where: { id: input.twilioConfigId, userId: req.user!.id }
  });
  if (!cfg) return res.status(400).json({ error: 'invalid_twilio_config' });

  const created = await prisma.inbox.create({
    data: {
      userId: req.user!.id,
      name: input.name,
      twilioConfigId: input.twilioConfigId,
      aiEnabled: input.aiEnabled ?? false
    },
    include: { phoneNumbers: true, twilioConfig: { select: { id: true, name: true } } }
  });

  return res.status(201).json({ inbox: created });
});

inboxesRouter.post('/:id/phone-numbers', async (req: AuthedRequest, res) => {
  const inboxId = z.string().parse(req.params.id);
  const input = z.object({ e164: z.string().min(6) }).parse(req.body);

  const inbox = await prisma.inbox.findFirst({ where: { id: inboxId, userId: req.user!.id } });
  if (!inbox) return res.status(404).json({ error: 'not_found' });

  try {
    const created = await prisma.inboxPhoneNumber.create({
      data: { inboxId, e164: input.e164 }
    });
    return res.status(201).json({ phoneNumber: created });
  } catch {
    return res.status(409).json({ error: 'phone_number_taken' });
  }
});

inboxesRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const inboxId = z.string().parse(req.params.id);
  const input = z
    .object({ name: z.string().min(1).optional(), aiEnabled: z.boolean().optional() })
    .parse(req.body);

  const inbox = await prisma.inbox.findFirst({ where: { id: inboxId, userId: req.user!.id } });
  if (!inbox) return res.status(404).json({ error: 'not_found' });

  const updated = await prisma.inbox.update({
    where: { id: inboxId },
    data: {
      name: input.name ?? undefined,
      aiEnabled: input.aiEnabled ?? undefined
    },
    include: { phoneNumbers: true, twilioConfig: { select: { id: true, name: true } } }
  });

  return res.json({ inbox: updated });
});
