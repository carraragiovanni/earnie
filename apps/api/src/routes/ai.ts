import { Router } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { requireAuth, type AuthedRequest } from '../auth/middleware.js';

export const aiRouter = Router();
aiRouter.use(requireAuth);

aiRouter.post('/conversations/:id/draft', async (req: AuthedRequest, res) => {
  if (!env.OPENAI_API_KEY) return res.status(400).json({ error: 'openai_not_configured' });

  const conversationId = z.string().parse(req.params.id);
  const input = z
    .object({
      instruction: z.string().max(500).optional()
    })
    .parse(req.body ?? {});

  const convo = await prisma.conversation.findFirst({
    where: { id: conversationId, inbox: { userId: req.user!.id } },
    include: {
      inbox: true,
      contact: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 40 }
    }
  });

  if (!convo) return res.status(404).json({ error: 'not_found' });

  const aiEnabled = convo.aiEnabled || convo.inbox.aiEnabled;
  if (!aiEnabled) return res.status(403).json({ error: 'ai_disabled' });

  const newestFirst = convo.messages;
  const recent = newestFirst.slice(0, 10).reverse();
  const older = newestFirst.slice(10).reverse();

  const olderSummary = older
    .slice(-20)
    .map((m) => {
      const who = m.direction === 'INBOUND' ? 'them' : 'me';
      return `- ${who}: ${m.body}`;
    })
    .join('\n');

  const recentTranscript = recent
    .map((m) => {
      const who = m.direction === 'INBOUND' ? 'them' : 'me';
      return `${who}: ${m.body}`;
    })
    .join('\n');

  const system =
    'You are a helpful assistant writing SMS replies. Output ONLY the message text (no quotes, no labels). ' +
    'Prioritize the most recent messages over older context.';

  const user = [
    `Contact: ${convo.contact.name ?? convo.contact.primaryPhone}`,
    olderSummary ? `Older context (less important):\n${olderSummary}` : '',
    `Most recent messages (most important):\n${recentTranscript}`,
    input.instruction ? `Instruction: ${input.instruction}` : ''
  ]
    .filter(Boolean)
    .join('\n\n');

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const completion = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });

  const draft = completion.output_text?.trim() ?? '';
  return res.json({ draft });
});
