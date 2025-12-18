import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default('file:./prisma/dev.db'),
  JWT_SECRET: z.string().min(16),
  APP_ENCRYPTION_KEY: z.string().min(20),
  // Set to '*' in single-host deployments (ALB -> API serves web UI) to allow same-origin and simple setups.
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  PUBLIC_BASE_URL: z.string().default('http://localhost:4000'),
  TWILIO_WEBHOOK_SKIP_SIGNATURE: z.string().optional(),
  OPENAI_API_KEY: z.string().optional()
});

export const env = schema.parse(process.env);
