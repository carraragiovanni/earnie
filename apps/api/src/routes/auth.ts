import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { signToken } from '../auth/jwt.js';
import { requireAuth, type AuthedRequest } from '../auth/middleware.js';

export const authRouter = Router();

authRouter.post('/signup', async (req, res) => {
  const input = z
    .object({ email: z.string().email(), password: z.string().min(8) })
    .parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) return res.status(409).json({ error: 'email_taken' });

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({ data: { email: input.email, passwordHash } });

  const token = signToken({ sub: user.id, email: user.email });
  return res.json({ token });
});

authRouter.post('/login', async (req, res) => {
  const input = z
    .object({ email: z.string().email(), password: z.string().min(1) })
    .parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const token = signToken({ sub: user.id, email: user.email });
  return res.json({ token });
});

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  return res.json({ id: req.user!.id, email: req.user!.email });
});
