import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth/middleware.js';

export const contactFieldsRouter = Router();

contactFieldsRouter.use(requireAuth);

contactFieldsRouter.get('/', async (req: AuthedRequest, res) => {
  const fields = await prisma.contactFieldDefinition.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'asc' }
  });
  return res.json({ fields });
});

contactFieldsRouter.post('/', async (req: AuthedRequest, res) => {
  const input = z
    .object({
      key: z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
      label: z.string().min(1),
      type: z.enum(['TEXT', 'NUMBER', 'DATE'])
    })
    .parse(req.body);

  try {
    const field = await prisma.contactFieldDefinition.create({
      data: {
        userId: req.user!.id,
        key: input.key,
        label: input.label,
        type: input.type
      }
    });

    return res.status(201).json({ field });
  } catch {
    return res.status(409).json({ error: 'field_key_taken' });
  }
});

contactFieldsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const id = z.string().parse(req.params.id);
  const existing = await prisma.contactFieldDefinition.findFirst({ where: { id, userId: req.user!.id } });
  if (!existing) return res.status(404).json({ error: 'not_found' });

  await prisma.contactFieldDefinition.delete({ where: { id } });
  return res.json({ ok: true });
});
