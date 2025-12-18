import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth/middleware.js';
import { env } from '../env.js';
import { encryptString } from '../crypto/encryption.js';

export const twilioConfigsRouter = Router();

twilioConfigsRouter.use(requireAuth);

twilioConfigsRouter.get('/', async (req: AuthedRequest, res) => {
  const configs = await prisma.twilioConfig.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true }
  });
  return res.json({ configs });
});

twilioConfigsRouter.post('/', async (req: AuthedRequest, res) => {
  const input = z
    .object({
      name: z.string().min(1),
      accountSid: z.string().min(10),
      authToken: z.string().min(10),
      messagingServiceSid: z.string().min(10).optional()
    })
    .parse(req.body);

  const created = await prisma.twilioConfig.create({
    data: {
      userId: req.user!.id,
      name: input.name,
      accountSidEnc: encryptString(input.accountSid, env.APP_ENCRYPTION_KEY),
      authTokenEnc: encryptString(input.authToken, env.APP_ENCRYPTION_KEY),
      messagingServiceSidEnc: input.messagingServiceSid
        ? encryptString(input.messagingServiceSid, env.APP_ENCRYPTION_KEY)
        : null
    },
    select: { id: true, name: true, createdAt: true }
  });

  return res.status(201).json({ config: created });
});

twilioConfigsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const id = z.string().parse(req.params.id);
  const existing = await prisma.twilioConfig.findFirst({ where: { id, userId: req.user!.id } });
  if (!existing) return res.status(404).json({ error: 'not_found' });

  await prisma.twilioConfig.delete({ where: { id } });
  return res.json({ ok: true });
});
