import 'dotenv/config';
import 'express-async-errors';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';

import { env } from './env.js';
import { prisma } from './db.js';
import { authRouter } from './routes/auth.js';
import { twilioConfigsRouter } from './routes/twilioConfigs.js';
import { inboxesRouter } from './routes/inboxes.js';
import { conversationsRouter } from './routes/conversations.js';
import { contactsRouter } from './routes/contacts.js';
import { contactFieldsRouter } from './routes/contactFields.js';
import { aiRouter } from './routes/ai.js';
import { createSocketServer } from './socket.js';
import { messagesRouter } from './routes/messages.js';
import { twilioWebhooksRouter } from './routes/twilioWebhooks.js';

const app = express();

app.set('trust proxy', 1);

const corsOrigin =
  env.WEB_ORIGIN === '*'
    ? true
    : env.WEB_ORIGIN;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true
  })
);

// JSON for app APIs
app.use('/api', express.json({ limit: '2mb' }));

// Twilio uses urlencoded payloads.
app.use('/twilio', express.urlencoded({ extended: false }));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/twilio-configs', twilioConfigsRouter);
app.use('/api/inboxes', inboxesRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/contact-fields', contactFieldsRouter);
app.use('/api/ai', aiRouter);

const httpServer = http.createServer(app);
const io = createSocketServer(httpServer);

app.use('/api', messagesRouter(io));
app.use('/twilio', twilioWebhooksRouter(io));

// Serve built web app (when present) for single-host deploys.
const publicDir = path.resolve(process.cwd(), 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/twilio')) return next();
    return res.sendFile(path.join(publicDir, 'index.html'));
  });
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  return res.status(500).json({ error: 'internal_error' });
});

async function main() {
  await prisma.$connect();
  httpServer.listen(env.PORT, () => {
    console.log(`API listening on ${env.PUBLIC_BASE_URL}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
