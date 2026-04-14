# Docker-Only Testing Guide

> **Purpose**: This guide explains how to test the complete payment flow **entirely in Docker** without installing Stripe CLI, Node.js, or any local tools.

---

## Why Docker-Only Testing?

| Aspect                 | Local Dev + Stripe CLI                           | Docker-Only                           |
| ---------------------- | ------------------------------------------------ | ------------------------------------- |
| **Setup time**         | 15-20 min (install Stripe CLI, Node, setup keys) | 2-3 min (just Docker)                 |
| **Tools needed**       | Stripe CLI, Node.js, npm, bash/PowerShell        | Docker Desktop only                   |
| **Network complexity** | Manage localhost + Docker hostname               | Everything inside Docker network      |
| **Stripe webhook**     | Real Stripe → localhost (requires CLI tunnel)    | Simulated via `/dev/simulate-success` |
| **Ideal for**          | Production-like testing                          | Quick flow validation, team testing   |

**If you just want to verify the payment flow works**: Use Docker-only testing. ✅

---

## Prerequisites

- **Docker Desktop** installed ([download](https://www.docker.com/products/docker-desktop))
- **git** to clone the repo
- **curl** or Postman (for API calls) — usually pre-installed

That's it. No Stripe CLI, no Node.js, no npm.

---

## Step 1: Clone and Setup

```bash
git clone https://github.com/Imadh-Ifham/Arogya.git
cd Arogya
```

---

## Step 2: Set Stripe Credentials (Optional)

The payment-service will work fine **without real Stripe keys** for testing. But if you want to use real keys:

Create `infrastructure/docker/.env`:

```env
STRIPE_SECRET_KEY=sk_test_51TM9xk...
STRIPE_WEBHOOK_SECRET=whsec_...
ANTHROPIC_API_KEY=sk-ant-...
```

If `.env` is missing, the service starts with empty strings (safe for dev testing).

---

## Step 3: Start Docker Compose

From the repo root:

```bash
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d --build
```

This starts all services: PostgreSQL, MongoDB, payment-service, appointment-service, API Gateway, etc.

**Check payment-service is running**:

```bash
docker compose -f infrastructure/docker/docker-compose.dev.yml logs payment-service
```

Output:

```
payment-service | [Payment Service] Connected to MongoDB
payment-service | [Payment Service] Listening on http://0.0.0.0:8087
```

---

## Step 4: Initiate a Payment

Use the **API Gateway** (runs at `http://localhost:3000`):

```bash
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -H "x-user-id: patient-alice" \
  -H "x-user-role: patient" \
  -d '{
    "appointmentId": "apt-docker-001",
    "patientId": "patient-alice",
    "doctorId": "doctor-bob",
    "amount": 3500,
    "currency": "LKR"
  }'
```

**Response**:

```json
{
  "success": true,
  "message": "Payment initiated",
  "data": {
    "paymentId": "pay_abc123xyz...",
    "checkoutUrl": "https://checkout.stripe.com/c/pay/..."
  }
}
```

**Copy the `paymentId`** — you'll need it in the next step.

---

## Step 5: Simulate Stripe Webhook (Mark Payment SUCCESS)

In a real scenario, Stripe sends a webhook (checkout.session.completed). Here we simulate it.

Use the **payment-service dev endpoint**:

```bash
curl -X POST http://localhost:8087/api/payments/dev/simulate-success/pay_abc123xyz \
  -H "x-user-id: patient-alice" \
  -H "x-user-role: patient"
```

Replace `pay_abc123xyz` with the actual `paymentId` from Step 4.

**Response**:

```json
{
  "success": true,
  "message": "Payment marked SUCCESS",
  "data": {
    "paymentId": "pay_abc123xyz",
    "status": "SUCCESS",
    "receipt": {
      "receiptNumber": "RCP-20260415-H7F2",
      "paidAt": "2026-04-15T...",
      "method": "card"
    }
  }
}
```

**The payment is now SUCCESS with a receipt.** ✅

---

## Step 6: View Payment History (Dashboard)

### Patient Dashboard

Get all payments for patient-alice:

```bash
curl http://localhost:8087/api/payments/me \
  -H "x-user-id: patient-alice" \
  -H "x-user-role: patient"
```

**Response** (paginated):

```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "paymentId": "pay_abc123xyz",
        "appointmentId": "apt-docker-001",
        "amount": 3500,
        "status": "SUCCESS",
        "receipt": {
          "receiptNumber": "RCP-20260415-H7F2",
          "paidAt": "2026-04-15T12:34:56Z"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

### Doctor Dashboard

Get summary for doctor-bob:

```bash
curl http://localhost:8087/api/payments/doctor/me \
  -H "x-user-id: doctor-bob" \
  -H "x-user-role: doctor"
```

**Response** (with summary):

```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "paymentId": "pay_abc123xyz",
        "appointmentId": "apt-docker-001",
        "patientId": "patient-alice",
        "amount": 3500,
        "status": "SUCCESS"
      }
    ],
    "summary": {
      "totalPending": 0,
      "totalSuccess": 1,
      "totalFailed": 0,
      "totalReceived": 3500
    },
    "total": 1
  }
}
```

---

## Step 7: View Single Payment / Receipt

Get a specific payment with full receipt:

```bash
curl http://localhost:8087/api/payments/pay_abc123xyz \
  -H "x-user-id: patient-alice" \
  -H "x-user-role: patient"
```

**Response**:

```json
{
  "success": true,
  "data": {
    "paymentId": "pay_abc123xyz",
    "appointmentId": "apt-docker-001",
    "patientId": "patient-alice",
    "doctorId": "doctor-bob",
    "amount": 3500,
    "currency": "LKR",
    "status": "SUCCESS",
    "receipt": {
      "receiptNumber": "RCP-20260415-H7F2",
      "paidAt": "2026-04-15T12:34:56.123Z",
      "gatewayReference": "dev_simulated",
      "method": "card"
    },
    "createdAt": "2026-04-15T12:34:00Z",
    "updatedAt": "2026-04-15T12:34:56Z"
  }
}
```

---

## Complete Flow Example (All Steps)

Copy-paste this into a terminal to run the full flow:

```bash
#!/bin/bash

# Step 1: Start Docker Compose (in background)
echo "Starting Docker Compose..."
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d --build

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Step 2: Initiate payment
echo ""
echo "=== STEP 1: Initiate Payment ==="
RESPONSE=$(curl -s -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -H "x-user-id: patient-alice" \
  -H "x-user-role: patient" \
  -d '{
    "appointmentId": "apt-docker-001",
    "patientId": "patient-alice",
    "doctorId": "doctor-bob",
    "amount": 3500,
    "currency": "LKR"
  }')

echo "$RESPONSE" | jq .

# Extract paymentId
PAYMENT_ID=$(echo "$RESPONSE" | jq -r '.data.paymentId')
echo "Payment ID: $PAYMENT_ID"

# Step 3: Simulate webhook
echo ""
echo "=== STEP 2: Simulate Stripe Webhook ==="
curl -s -X POST http://localhost:8087/api/payments/dev/simulate-success/$PAYMENT_ID \
  -H "x-user-id: patient-alice" \
  -H "x-user-role: patient" | jq .

# Step 4: View patient history
echo ""
echo "=== STEP 3: Patient Payment History ==="
curl -s http://localhost:8087/api/payments/me \
  -H "x-user-id: patient-alice" \
  -H "x-user-role: patient" | jq .

# Step 5: View doctor dashboard
echo ""
echo "=== STEP 4: Doctor Dashboard ==="
curl -s http://localhost:8087/api/payments/doctor/me \
  -H "x-user-id: doctor-bob" \
  -H "x-user-role: doctor" | jq .

echo ""
echo "✅ Full payment flow completed!"
```

Save as `test-payment-flow.sh` and run:

```bash
chmod +x test-payment-flow.sh
./test-payment-flow.sh
```

---

## Troubleshooting

### "Cannot connect to payment-service"

**Cause**: Services not started yet.

**Fix**:

```bash
docker compose -f infrastructure/docker/docker-compose.dev.yml logs payment-service
```

Wait for the "Listening on" message, then retry.

### "401 Unauthorized"

**Cause**: Missing `x-user-id` or `x-user-role` headers.

**Fix**: Both headers are required on all endpoints:

```bash
curl http://localhost:8087/api/payments/me \
  -H "x-user-id: patient-alice" \
  -H "x-user-role: patient"
```

### "403 Forbidden - Not authorized to view this payment"

**Cause**: User trying to view another user's payment.

**Fix**: Only the patient owner, the doctor, or admin can view a payment. Use matching IDs:

```bash
# This works if patient-alice is the payment owner
curl http://localhost:8087/api/payments/pay_abc123xyz \
  -H "x-user-id: patient-alice" \
  -H "x-user-role: patient"

# This fails
curl http://localhost:8087/api/payments/pay_abc123xyz \
  -H "x-user-id: patient-bob" \
  -H "x-user-role: patient"
```

### "Cannot find payment" (404)

**Cause**: Wrong `paymentId` or payment not created.

**Fix**:

1. Make sure payment was initiated (Step 4)
2. Copy the exact `paymentId` from the initiate response
3. Check logs: `docker compose logs payment-service | grep "pay_"`

---

## Verify Payments in MongoDB

If you want to inspect MongoDB directly:

```bash
# Connect to MongoDB in Docker
docker exec -it arogya-mongodb mongosh \
  -u arogya -p arogya_secret \
  --authenticationDatabase admin \
  arogya_payments
```

Then query:

```javascript
db.payments.find().pretty();
db.payments.findOne({ paymentId: "pay_abc123xyz" });
```

---

## API Endpoints Reference

| Method | Route                              | Headers                                                  | Purpose                                |
| ------ | ---------------------------------- | -------------------------------------------------------- | -------------------------------------- |
| `POST` | `/api/payments/initiate`           | `x-user-id`, `x-user-role`                               | Create payment (via API Gateway)       |
| `POST` | `/dev/simulate-success/:paymentId` | `x-user-id`, `x-user-role`                               | Simulate Stripe webhook (**dev only**) |
| `GET`  | `/api/payments/me`                 | `x-user-id`, `x-user-role`                               | Patient payment history                |
| `GET`  | `/api/payments/doctor/me`          | `x-user-id`, `x-user-role` (must be "doctor" or "admin") | Doctor dashboard                       |
| `GET`  | `/api/payments/:paymentId`         | `x-user-id`, `x-user-role`                               | Single payment / receipt               |

---

## Stop Services

When done, stop Docker Compose:

```bash
docker compose -f infrastructure/docker/docker-compose.dev.yml down
```

To also remove volumes (reset database):

```bash
docker compose -f infrastructure/docker/docker-compose.dev.yml down -v
```

---

## Summary

✅ **Start**: `docker compose ... up -d`  
✅ **Initiate**: `curl POST /initiate` via API Gateway (get `paymentId`)  
✅ **Confirm**: `curl POST /dev/simulate-success/:paymentId` (marks SUCCESS)  
✅ **Verify**: `curl GET /me` and `GET /doctor/me` (view dashboards)  
✅ **Stop**: `docker compose ... down`

**No Stripe CLI. No local tools. Just Docker.** 🐳
