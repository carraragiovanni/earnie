import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, type AuthedRequest } from '../auth/middleware.js';

export const contactsRouter = Router();

contactsRouter.use(requireAuth);

contactsRouter.get('/', async (req: AuthedRequest, res) => {
  const query = z.string().optional().parse(req.query.q);

  const maybeNumber = query && !Number.isNaN(Number(query)) ? Number(query) : null;

  const contacts = await prisma.contact.findMany({
    where: {
      userId: req.user!.id,
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { primaryPhone: { contains: query } },
              {
                fieldValues: {
                  some: {
                    OR: [
                      { valueText: { contains: query } },
                      ...(maybeNumber === null ? [] : [{ valueNumber: { equals: maybeNumber } }])
                    ]
                  }
                }
              }
            ]
          }
        : {})
    },
    orderBy: { createdAt: 'desc' },
    include: { fieldValues: { include: { fieldDef: true } } }
  });

  return res.json({ contacts });
});

contactsRouter.post('/', async (req: AuthedRequest, res) => {
  const input = z
    .object({
      name: z.string().min(1).optional(),
      primaryPhone: z.string().min(6),
      fieldValues: z
        .array(
          z.object({
            fieldKey: z.string().min(1),
            valueText: z.string().optional(),
            valueNumber: z.number().optional(),
            valueDate: z.string().datetime().optional()
          })
        )
        .optional()
    })
    .parse(req.body);

  const defs = await prisma.contactFieldDefinition.findMany({ where: { userId: req.user!.id } });
  const defByKey = new Map(defs.map((d) => [d.key, d]));

  const contact = await prisma.contact.create({
    data: {
      userId: req.user!.id,
      name: input.name,
      primaryPhone: input.primaryPhone
    }
  });

  if (input.fieldValues?.length) {
    for (const fv of input.fieldValues) {
      const def = defByKey.get(fv.fieldKey);
      if (!def) continue;
      await prisma.contactFieldValue.upsert({
        where: { contactId_fieldDefId: { contactId: contact.id, fieldDefId: def.id } },
        update: {
          valueText: fv.valueText,
          valueNumber: fv.valueNumber,
          valueDate: fv.valueDate ? new Date(fv.valueDate) : undefined
        },
        create: {
          contactId: contact.id,
          fieldDefId: def.id,
          valueText: fv.valueText,
          valueNumber: fv.valueNumber,
          valueDate: fv.valueDate ? new Date(fv.valueDate) : undefined
        }
      });
    }
  }

  const full = await prisma.contact.findUnique({
    where: { id: contact.id },
    include: { fieldValues: { include: { fieldDef: true } } }
  });

  return res.status(201).json({ contact: full });
});

contactsRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const contactId = z.string().parse(req.params.id);
  const input = z
    .object({
      name: z.string().min(1).nullable().optional(),
      primaryPhone: z.string().min(6).optional()
    })
    .parse(req.body);

  const existing = await prisma.contact.findFirst({ where: { id: contactId, userId: req.user!.id } });
  if (!existing) return res.status(404).json({ error: 'not_found' });

  const updated = await prisma.contact.update({
    where: { id: contactId },
    data: {
      name: input.name === undefined ? undefined : input.name,
      primaryPhone: input.primaryPhone ?? undefined
    },
    include: { fieldValues: { include: { fieldDef: true } } }
  });

  return res.json({ contact: updated });
});
