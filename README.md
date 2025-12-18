# Twilio Inbox (iMessage-style SMS/MMS web app)

This repo contains a small full-stack app:

- `apps/api`: Express + Prisma (SQLite) + Socket.IO + Twilio webhooks/API
- `apps/web`: React + Vite + Tailwind iMessage-style UI

## Features

- **Messaging core**: inbound Twilio webhooks persist to a conversation thread; outbound messages send via Twilio Messages API; realtime updates via websockets.
- **Inboxes**: create inboxes linked to a specific Twilio configuration and one or more phone numbers.
- **Twilio credentials**: credentials are **encrypted at rest** in the DB and only decrypted server-side when needed.
- **Contacts + custom fields**: define custom fields (text/number/date) and store values per contact.
- **AI drafts (optional)**: if enabled per inbox or conversation and `OPENAI_API_KEY` is set, generate suggested replies with a recency bias. Drafts are never auto-sent.

## Quickstart (local)

### 1) Install deps

```bash
cd /workspace
npm install
```

### 2) Configure API env

Copy `apps/api/.env.example` to `apps/api/.env` and set:

- `JWT_SECRET`
- `APP_ENCRYPTION_KEY`

### 3) Initialize DB

```bash
cd /workspace
npm run db:migrate
```

### 4) Run

In one terminal:

```bash
cd /workspace/apps/api
npm run dev
```

In another terminal:

```bash
cd /workspace/apps/web
npm run dev
```

Open the web UI at `http://localhost:5173`.

## Twilio webhook configuration

Point your Twilio phone number(s) “A message comes in” webhook to:

- `http://localhost:4000/twilio/inbound`

And optionally set the message status callback to:

- `http://localhost:4000/twilio/status`

> For local testing with a public URL, use a tunneling tool and set `PUBLIC_BASE_URL` accordingly so signature validation can work reliably.

## Deploy on AWS (ECS Fargate + ALB + EFS using CDK)

This repo includes a CDK stack in `infra/` that deploys:

- **ECS Fargate** running a single container (API + built web UI)
- **ALB** in front (supports websockets for realtime chat)
- **EFS** mounted at `/data` so the SQLite DB persists across task restarts
- **Secrets Manager** for `JWT_SECRET`, `APP_ENCRYPTION_KEY`, and optional `OPENAI_API_KEY`

### Prereqs

- AWS credentials configured locally (`aws configure` or SSO)
- Docker installed (CDK builds the container image)

### Deploy

```bash
cd /workspace
npm install

cd infra
npm run build

# one-time per account/region
npx cdk bootstrap

# deploy
npx cdk deploy
```

After deploy, CDK prints `LoadBalancerUrl`. Use that URL as:

- **Web UI**: open `LoadBalancerUrl` in a browser
- **Twilio inbound webhook**: `${LoadBalancerUrl}/twilio/inbound`
- **Twilio status callback**: `${LoadBalancerUrl}/twilio/status`

### Notes

- **Persistence**: the SQLite database is stored on EFS at `/data/dev.db`.
- **CORS**: the stack sets `WEB_ORIGIN='*'` because the UI is served by the same host.
- **Twilio signature validation**: if you plan to validate signatures in production, deploy behind a stable HTTPS domain and ensure `PUBLIC_BASE_URL` matches the exact webhook URL used by Twilio.
