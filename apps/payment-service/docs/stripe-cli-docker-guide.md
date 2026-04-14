# Stripe CLI + Docker Setup Guide

> **Purpose**: This document explains how the payment-service integrates with Stripe CLI for webhook testing, both in **local development** and **containerized (Docker)** environments.

---

## Overview

The payment-service uses **Stripe Checkout Sessions** to collect payments. Stripe sends webhook events (e.g., `checkout.session.completed`) back to your application. To test webhooks locally without deploying to a public server, you use **Stripe CLI**.

### Two Scenarios

| Scenario | How it works | Use case |
|----------|-------------|----------|
| **Local dev** | Stripe CLI runs locally, forwards `localhost:8087/webhook` → Stripe | Testing locally during development |
| **Docker dev** | Stripe CLI runs locally, forwards to Docker network hostname `http://payment-service:8087/webhook` | Testing full docker-compose stack |

---

## Local Development (without Docker)

### Prerequisites

1. **Stripe account** — [Create one](https://dashboard.stripe.com/register) (free)
2. **Stripe CLI** — [Download & install](https://stripe.com/docs/stripe-cli)
3. **Node.js 20** — Running payment-service locally
4. **MongoDB** — Atlas connection string

### Step 1: Get your Stripe keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy **Secret Key** (starts with `sk_test_`)
3. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
4. Click "Add endpoint" → select `localhost:8087/api/payments/webhook` as the URL
5. Copy the **Signing Secret** (starts with `whsec_`)

### Step 2: Set environment variables

Create/update `.env` in `apps/payment-service/`:

```env
PORT=8087
MONGODB_URI=mongodb+srv://Aman:...@nodeexpressprojects.jgwcq.mongodb.net/arogya_payments
STRIPE_SECRET_KEY=sk_test_51TM9xk...
STRIPE_WEBHOOK_SECRET=whsec_6243ff67d8811ba47a49b5fe...
FRONTEND_URL=http://localhost:5173
```

### Step 3: Start payment-service

```bash
cd apps/payment-service
npm run dev
```

Output:
```
[ts-node-dev] Starting...
[Payment Service] Connected to MongoDB
[Payment Service] Listening on http://localhost:8087
```

### Step 4: Authenticate Stripe CLI

```bash
stripe login
```

Follow the browser link, approve, and copy the token back to the terminal.

### Step 5: Listen for webhooks

In a **second terminal**:

```bash
stripe listen --forward-to localhost:8087/api/payments/webhook
```

Output:
```
> Ready! Your webhook signing secret is whsec_6243ff67d8811ba47a49b5fe... (^C to quit)
```

**Copy this secret and paste it into your `.env`** if you haven't already.

### Step 6: Test a payment

In a **third terminal**:

```bash
curl -X POST http://localhost:8087/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "apt-test-001",
    "patientId": "patient-A",
    "doctorId": "doctor-B",
    "amount": 3500,
    "currency": "LKR"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_...",
    "checkoutUrl": "https://checkout.stripe.com/c/pay/..."
  }
}
```

### Step 7: Simulate payment in Stripe CLI

In the Stripe CLI terminal, you'll see the webhook event logged:

```
<some event details>
```

Or use the dev endpoint:

```bash
curl -X POST http://localhost:8087/api/payments/dev/simulate-success/pay_... \
  -H "x-user-id: patient-A" \
  -H "x-user-role: patient"
```

---

## Docker Development (full stack)

### Why Docker?

When you run `docker compose up`, services communicate via **Docker network hostnames** (e.g., `http://payment-service:8087`), not `localhost:8087`. Stripe CLI needs to know how to reach your containerized payment-service.

### Prerequisites

1. Docker & Docker Compose
2. Stripe CLI (running on **host machine**, not in container)
3. Stripe account with keys (same as above)
4. MongoDB Atlas connection string

### Step 1: Configure docker-compose

The `infrastructure/docker/docker-compose.dev.yml` already has payment-service configured:

```yaml
payment-service:
  build:
    context: ../../apps/payment-service
    dockerfile: Dockerfile
  environment:
    PORT: 8087
    MONGODB_URI: mongodb+srv://Aman:...@nodeexpressprojects.jgwcq.mongodb.net/arogya_payments
    STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
    STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
```

### Step 2: Set environment variables

Create `.env` file in `infrastructure/docker/` directory (next to `docker-compose.dev.yml`):

```env
STRIPE_SECRET_KEY=sk_test_51TM9xk...
STRIPE_WEBHOOK_SECRET=whsec_6243ff67d8811ba47a49b5fe...
```

Or export them in your shell:

```bash
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_WEBHOOK_SECRET=whsec_...
```

### Step 3: Start Docker Compose

From repo root:

```bash
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d
```

Check payment-service is running:

```bash
docker compose -f infrastructure/docker/docker-compose.dev.yml logs payment-service
```

Output:
```
payment-service | [Payment Service] Listening on http://0.0.0.0:8087
```

### Step 4: Determine your Docker host IP

**On Windows (with Docker Desktop)**:

```bash
# Inside a running container, host IP is typically:
host.docker.internal
```

**On Linux**:

```bash
# Get Docker host IP:
docker network inspect arogya-net | grep Gateway
```

### Step 5: Start Stripe CLI with Docker webhook forwarding

The **Stripe CLI runs on your host machine, not in Docker**.

Forward webhooks to the Docker network:

```bash
stripe listen --forward-to http://host.docker.internal:8087/api/payments/webhook
```

**Windows with Docker Desktop**: `host.docker.internal` is the magic hostname that resolves to your host machine from inside Docker.

**Linux**: Replace with the actual Gateway IP from step 4.

Output:
```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

### Step 6: Test a payment inside Docker

Use the API Gateway (running at `http://localhost:3000`):

```bash
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "apt-docker-001",
    "patientId": "patient-A",
    "doctorId": "doctor-B",
    "amount": 3500,
    "currency": "LKR"
  }'
```

Or call payment-service directly (if exposed on your host):

```bash
curl -X POST http://localhost:8087/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "apt-docker-001",
    "patientId": "patient-A",
    "doctorId": "doctor-B",
    "amount": 3500,
    "currency": "LKR"
  }'
```

### Step 7: Watch webhooks in Stripe CLI

Webhooks come from Stripe → Stripe CLI → Docker → payment-service.

You'll see logs in Stripe CLI and/or `docker logs`:

```bash
docker compose -f infrastructure/docker/docker-compose.dev.yml logs -f payment-service
```

---

## Using `scripts/start-dev.ps1` (Windows PowerShell)

Instead of manually starting Stripe CLI and the payment-service, use the convenience script:

```powershell
cd apps/payment-service
.\scripts\start-dev.ps1
```

### What it does

1. Reads `.env` for Stripe credentials
2. Starts Stripe CLI as a background job listening to `localhost:8087/api/payments/webhook`
3. Starts payment-service via `npm run dev`
4. On `Ctrl+C`, kills both the server and Stripe CLI job cleanly

### Script location

- [`scripts/start-dev.ps1`](../scripts/start-dev.ps1)

### Equivalent manual commands (for reference)

```bash
# Terminal 1: Start Stripe CLI
stripe listen --forward-to localhost:8087/api/payments/webhook

# Terminal 2: Start payment-service
npm run dev
```

---

## Troubleshooting

### "Webhook signature verification failed"

**Cause**: `STRIPE_WEBHOOK_SECRET` mismatch between `.env` and Stripe CLI.

**Fix**:
1. Run `stripe listen` and copy the signing secret from its output
2. Update `.env` with the exact secret
3. Restart payment-service

### "Cannot reach webhook endpoint"

**Cause** (local): Stripe can't reach `localhost:8087` (firewall, wrong port)  
**Cause** (Docker): Stripe CLI can't resolve `host.docker.internal` or wrong gateway IP

**Fix**:
- Local: Check `docker ps` shows payment-service running, verify port 8087 is open
- Docker: Use `host.docker.internal` on Windows, or the correct gateway IP on Linux
- Test: `curl http://localhost:8087/health` (local) or `curl -H "x-user-id: test" -H "x-user-role: test" http://localhost:8087/api/payments/me` (on Docker)

### "webhook already exists"

**Cause**: You added the webhook endpoint in Stripe Dashboard earlier; adding it again via CLI fails.

**Fix**: Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks), delete the old endpoint for `localhost:8087`, then retry `stripe listen`.

---

## Key Takeaways

| Aspect | Local Dev | Docker Dev |
|--------|-----------|------------|
| **Stripe CLI runs** | On host machine | On host machine (not in container) |
| **Forward to** | `localhost:8087` | `host.docker.internal:8087` (Windows) or gateway IP |
| **Payment-service** | `npm run dev` | `docker compose up` |
| **Webhook endpoint** | Direct from Stripe to localhost | Stripe → CLI → Docker network → payment-service |
| **Quick start** | `.\scripts\start-dev.ps1` | `docker compose up` + separate Stripe CLI |
