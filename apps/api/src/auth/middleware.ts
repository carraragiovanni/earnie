import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt.js';

export type AuthedRequest = Request & {
  user?: { id: string; email: string };
};

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const auth = req.header('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : undefined;
  if (!token) return res.status(401).json({ error: 'missing_token' });

  try {
    const claims = verifyToken(token);
    req.user = { id: claims.sub, email: claims.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
}
