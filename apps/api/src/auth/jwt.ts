import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export type JwtClaims = {
  sub: string;
  email: string;
};

export function signToken(claims: JwtClaims): string {
  return jwt.sign(claims, env.JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): JwtClaims {
  return jwt.verify(token, env.JWT_SECRET) as JwtClaims;
}
