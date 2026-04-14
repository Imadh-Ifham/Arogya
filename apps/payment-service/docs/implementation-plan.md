# Payment Service — Implementation Plan

> **Service**: `apps/payment-service`
> **Tech**: Node.js 20 + TypeScript + Express + MongoDB + Stripe
> **Port**: 8087
> **Branch**: `feat/payment-service`
> **Tasks**: PAY-02, PAY-03, PAY-04, PAY-05, PAY-06

---

## 1. Current State

### What exists today

| File            | Purpose                                                                           |
| --------------- | --------------------------------------------------------------------------------- |
| `index.js`      | Express stub — always returns `{ paymentId, status: "SUCCESS" }` on port **3001** |
| `Dockerfile`    | Commented-out template (Node 20 multi-stage)                                      |
| `.dockerignore` | Standard node ignores                                                             |
| `README.md`     | Spec doc (partially outdated)                                                     |

### What the appointment-service expects (contract we must honour)

`PaymentServiceClient.java` calls:

```
POST /api/payments/initiate
Body:  { appointmentId: string, amount: BigDecimal, patientId: string, currency: "LKR" }
→ 201  { paymentId: string, ... }
```

It reads **only `paymentId`** from the response. Everything else is ignored.
On failure (non-2xx or network error) the appointment stays `PENDING`.

The appointment-service then stores `paymentId` on the `Appointment` entity and sets status = `CONFIRMED`.

### Port conflict

| Config file                        | Current value                                      | Correct value                 |
| ---------------------------------- | -------------------------------------------------- | ----------------------------- |
| `application-dev.properties`       | `services.payment.url=http://localhost:3001`       | `http://localhost:8087`       |
| `application-docker.properties`    | `services.payment.url=http://payment-service:3001` | `http://payment-service:8087` |
| `docker-compose.dev.yml` (stub)    | `PORT: 3001`                                       | `PORT: 8087`                  |
| `docker-compose.dev.yml` (gateway) | `PAYMENT_SERVICE_URL: http://payment-service:3001` | `http://payment-service:8087` |

Port 3001 was the stub value. The canonical port for payment-service is **8087** (matching the port table in every README). These configs will be updated in Phase 7.

### Kafka

No Kafka broker in `docker-compose.dev.yml` — only K8s manifests exist.
→ KafkaJS producer will be **optional**. If `KAFKA_BROKER` is unset, skip Kafka. Log a warning.

---

## 2. Architecture

### Flow (the real one)

```
STEP 1 — Patient books appointment

  Frontend → POST /api/appointments (via Gateway)
  Appointment-service: saves appointment, status = PENDING
  Appointment-service → notification-service: "New appointment request" (fires to doctor)
  Response to frontend: appointment object (status=PENDING, no paymentId yet)

STEP 2 — Doctor reviews + accepts

  Doctor sees notification → opens dashboard
  Doctor → PATCH /api/appointments/{id}/accept (via Gateway)
  Appointment-service: validates doctor is assigned
  Appointment-service → POST /api/payments/initiate (internal, Docker network)
    body: { appointmentId, amount (slot.fee), patientId, doctorId, currency: "LKR" }
  Payment-service: creates Stripe Checkout Session, saves PENDING record
  Payment-service → returns { paymentId, checkoutUrl }
  Appointment-service: stores paymentId on appointment, keeps status = PENDING
  Appointment-service → notification-service: "Appointment accepted — please complete payment"
  Response to frontend: appointment object (status=PENDING, paymentId set)

STEP 3 — Patient completes payment

  Patient sees notification → opens appointment
  Frontend → GET /api/payments/{paymentId} (via Gateway)
  Payment-service returns { checkoutUrl, status: "PENDING", amount, ... }
  Frontend redirects patient to Stripe Checkout page (checkoutUrl)
  Patient pays on Stripe-hosted page

STEP 4 — Stripe webhook fires

  Stripe → POST /api/payments/webhook (DIRECT to payment-service, bypasses Gateway)
  Payment-service: verifies stripe-signature
  Payment-service: finds payment by stripeSessionId
  Payment-service: status → SUCCESS, generates receipt
  Payment-service: emits Kafka payment.completed (if broker available)
  → appointment-service (future): consumes event, sets appointment CONFIRMED

STEP 5 — Patient views receipt

  Stripe redirects to FRONTEND_URL/payments/success?session_id=xxx
  Frontend → GET /api/payments/{paymentId}
  Shows receipt: { receiptNumber, paidAt, amount, doctorName, ... }
```

### Auth pattern (same as patient-service)

- **No JWT parsing** in payment-service
- API Gateway validates JWT → injects `x-user-id`, `x-user-role`, `x-user-email`
- Payment-service reads headers, trusts them
- For internal calls (appointment-service → payment-service inside Docker): no headers needed, `patientId` is in the request body
- Webhook endpoint: **no auth** — verified by Stripe signature only

### Webhook routing

Stripe sends webhooks **directly** to the payment-service, NOT through the API Gateway.

- Dev: Use `stripe listen --forward-to localhost:8087/api/payments/webhook`
- Docker: Expose port 8087, Stripe CLI or ngrok forwards to it
- Production: Public URL → payment-service webhook endpoint

The API Gateway's `/api/payments` route applies `verifyToken` — that's correct for patient-facing endpoints (`/me`, `/:id`).
The webhook needs a **separate** path that Stripe hits directly (bypasses gateway).

### Database

- **MongoDB** — uses the shared `mongodb` container (same as auth-service)
- Database name: `arogya_payments`
- Connection: `mongodb://arogya:arogya_secret@mongodb:27017/arogya_payments?authSource=admin`

Not PostgreSQL (despite what the README says). MongoDB is simpler for this service:

- Payment records are documents, not relational
- No JOINs needed
- Append-only ledger maps naturally to document inserts
- Auth-service already uses this pattern

---

## 3. MongoDB Schema

### `payments` collection

```ts
{
  _id:              ObjectId,           // Mongo default
  paymentId:        String,             // UUID v4 — this is what appointment-service stores
  appointmentId:    String,             // from appointment-service
  patientId:        String,             // from request body (passed by appointment-service)
  doctorId:         String,             // REQUIRED — passed by appointment-service, used for doctor queries
  amount:           Number,             // e.g. 3500 (in minor or major units — we use major: LKR 3500)
  currency:         String,             // "LKR"
  status:           String,             // "PENDING" | "SUCCESS" | "FAILED"
  gateway:          String,             // "stripe"
  stripeSessionId:  String,             // Stripe checkout session ID (cs_test_xxx)
  checkoutUrl:      String,             // Stripe-hosted payment page URL
  receipt: {                            // null until SUCCESS
    receiptNumber:    String,           // "RCP-20260414-A3F2"
    paidAt:           Date,             // when Stripe confirmed payment
    gatewayReference: String,           // Stripe payment_intent ID (pi_xxx)
    method:           String,           // "card" (from Stripe)
  },
  createdAt:        Date,
  updatedAt:        Date
}

Indexes:
  - { paymentId: 1 }          unique
  - { appointmentId: 1 }      unique
  - { patientId: 1 }          for GET /me queries (patient history)
  - { doctorId: 1 }           for GET /doctor/me queries (doctor history)
  - { stripeSessionId: 1 }    for webhook lookup
```

### `payment_events` collection (audit trail)

```ts
{
  _id:        ObjectId,
  paymentId:  String,
  type:       String,          // "INITIATED" | "CHECKOUT_CREATED" | "WEBHOOK_RECEIVED" | "SUCCESS" | "FAILED"
  payload:    Object,          // raw event data (Stripe event body, etc.)
  createdAt:  Date
}
```

### Immutability rules

- Once `status = "SUCCESS"` → **never** update that document again (except `updatedAt`)
- Never delete payment records
- All mutations logged in `payment_events`
- If webhook fires twice → idempotent: check `if (payment.status === "SUCCESS") return 200`

---

## 4. API Endpoints

### 4.1 `POST /api/payments/initiate` — PAY-02

**Called by**: appointment-service internally (from `acceptAppointment()`, not `bookAppointment()`)
**No gateway, no JWT** — internal Docker network call only

```
Request body:
{
  "appointmentId": "uuid-string",
  "amount": 3500,
  "patientId": "uuid-string",
  "doctorId": "uuid-string",
  "currency": "LKR"
}

Response 201:
{
  "success": true,
  "data": {
    "paymentId": "pay_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_xxx",
    "status": "PENDING",
    "amount": 3500,
    "currency": "LKR"
  },
  "message": "Payment initiated"
}
```

**Logic:**

1. Validate body (appointmentId, amount > 0, patientId, doctorId required)
2. Check no existing payment for this appointmentId (idempotency — if doctor re-accepts, skip)
3. Create Stripe Checkout Session
   - `mode: "payment"`
   - `line_items: [{ price_data: { currency, unit_amount: amount * 100, product_data: { name: "Consultation Fee" } }, quantity: 1 }]`
   - `success_url: FRONTEND_URL/payments/success?session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url: FRONTEND_URL/payments/cancel?session_id={CHECKOUT_SESSION_ID}`
   - `metadata: { appointmentId, patientId, doctorId, paymentId }`
4. Generate `paymentId` (UUID v4 prefixed: `pay_xxx`)
5. Save payment doc with `doctorId` (status = PENDING)
6. Log `INITIATED` event
7. Return `{ paymentId, checkoutUrl }`

**Contract with appointment-service:**
It reads `response.getBody().get("paymentId")` — we return that. It stores it on the appointment. The appointment stays `PENDING` until Kafka `payment.completed` fires (future) or doctor manually confirms. The `checkoutUrl` is available to the frontend via `GET /api/payments/:id`.

### 4.2 `POST /api/payments/webhook` — PAY-03 + PAY-04

**Called by**: Stripe (direct, NOT through API Gateway)

```
Request: raw body (NOT JSON-parsed)
Header: stripe-signature

Response 200: { received: true }
```

**Logic:**

1. Verify signature: `stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET)`
2. Handle `checkout.session.completed`:
   a. Extract `session.id` (= stripeSessionId)
   b. Find payment by `stripeSessionId`
   c. If not found → log warning, return 200
   d. If already SUCCESS → return 200 (idempotent, Stripe retries)
   e. Update: `status = "SUCCESS"`, generate receipt:
   - `receiptNumber = "RCP-" + YYYYMMDD + "-" + random4hex`
   - `paidAt = new Date()`
   - `gatewayReference = session.payment_intent`
   - `method = session.payment_method_types[0]`
     f. Log `SUCCESS` event
     g. Emit Kafka `payment.completed` (if broker available)
3. Handle `checkout.session.expired` or `payment_intent.payment_failed`:
   a. Find payment by stripeSessionId
   b. Update: `status = "FAILED"`
   c. Log `FAILED` event
4. Return 200 (Stripe expects 200 for all handled events)

**Security:**

- Signature verification is MANDATORY — without it, anyone can fake payments
- Raw body required (not JSON-parsed) for HMAC verification

### 4.3 `GET /api/payments/me` — PAY-06 (patient payment history)

**Called by**: Frontend (through API Gateway, patient role)

```
Headers: x-user-id (injected by gateway, must be patient)
Query params: ?status=PENDING|SUCCESS|FAILED&page=1&limit=20

Response 200:
{
  "success": true,
  "data": {
    "payments": [ ...PaymentDocument[] ],
    "total": 42,
    "page": 1,
    "limit": 20
  },
  "message": "Payment history retrieved"
}
```

**Logic:**

1. Read `patientId` from `x-user-id` header
2. Validate header exists (400 if missing)
3. Build filter: `{ patientId }` + optional `status` filter
4. Query with pagination: `.sort({ createdAt: -1 }).skip().limit()`
5. Return payments array + total count

**What the patient sees:**

- `PENDING` — doctor accepted, payment link available (show "Complete Payment" CTA with `checkoutUrl`)
- `SUCCESS` — paid, receipt available
- `FAILED` — payment failed, can retry

---

### 4.4 `GET /api/payments/doctor/me` — doctor payment dashboard

**Called by**: Frontend (through API Gateway, doctor role)

```
Headers:
  x-user-id  (doctor's userId, injected by gateway)
  x-user-role: "doctor"

Query params: ?status=PENDING|SUCCESS|FAILED&page=1&limit=20

Response 200:
{
  "success": true,
  "data": {
    "payments": [
      {
        "paymentId": "pay_xxx",
        "appointmentId": "uuid",
        "patientId": "uuid",
        "doctorId": "uuid",
        "amount": 3500,
        "currency": "LKR",
        "status": "PENDING",      ← patient hasn't paid yet
        "checkoutUrl": "...",
        "receipt": null,
        "createdAt": "..."
      },
      {
        ...
        "status": "SUCCESS",     ← received
        "receipt": { "receiptNumber": "RCP-...", "paidAt": "...", ... }
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 20,
    "summary": {
      "totalPending": 2,
      "totalSuccess": 3,
      "totalFailed": 0,
      "totalReceived": 10500
    }
  },
  "message": "Payment dashboard retrieved"
}
```

**Logic:**

1. Read `doctorId` from `x-user-id` header
2. Validate `x-user-role === "doctor"` OR `x-user-role === "admin"` (403 otherwise)
3. Build filter: `{ doctorId }` + optional `status` filter
4. Query with pagination: `.sort({ createdAt: -1 }).skip().limit()`
5. Calculate `summary` (aggregation: count by status, sum of SUCCESS amounts)
6. Return payments array + summary

**What the doctor sees:**

- `PENDING` — awaiting payment from patient (show "Awaiting Payment" badge)
- `SUCCESS` — payment received (show "Received" badge + amount)
- `FAILED` — payment failed (show "Payment Failed" badge)

> Note: The doctor does not receive money directly — they see the transaction status for their consultations only.

### 4.5 `GET /api/payments/:id` — PAY-05 (single payment / receipt)

**Called by**: Frontend (through API Gateway, patient or doctor)

```
Headers: x-user-id, x-user-role

Response 200:
{
  "success": true,
  "data": {
    "paymentId": "pay_xxx",
    "appointmentId": "uuid",
    "patientId": "uuid",
    "doctorId": "uuid",
    "amount": 3500,
    "currency": "LKR",
    "status": "SUCCESS",
    "gateway": "stripe",
    "checkoutUrl": "https://...",
    "receipt": {
      "receiptNumber": "RCP-20260414-A3F2",
      "paidAt": "2026-04-14T09:30:00.000Z",
      "gatewayReference": "pi_3xxx",
      "method": "card"
    },
    "createdAt": "2026-04-14T09:28:00.000Z",
    "updatedAt": "2026-04-14T09:30:00.000Z"
  },
  "message": "Payment details retrieved"
}
```

**Logic:**

1. Find payment by `paymentId` (NOT `_id`)
2. Authorization check:
   - `payment.patientId === x-user-id` (patient viewing their own), OR
   - `payment.doctorId === x-user-id` (doctor viewing their consultation payment), OR
   - `x-user-role === "admin"`
   - 403 if none match
3. Return full payment document (this IS the receipt — frontend renders it)
4. If `status === "PENDING"` — include `checkoutUrl` so patient can still pay

### 4.6 `GET /health`

```json
{ "success": true, "service": "payment-service", "status": "healthy" }
```

### 4.7 `POST /api/payments/simulate-webhook` (dev only)

**Only available when `NODE_ENV !== "production"`**.
Simulates a Stripe webhook for testing without Stripe CLI.

```
Body: { paymentId: "pay_xxx" }
→ triggers the same SUCCESS flow as a real webhook
```

---

## 5. Project Structure

```
apps/payment-service/
├── src/
│   ├── config/
│   │   ├── env.ts              ← env validation + defaults
│   │   ├── database.ts         ← Mongoose connection
│   │   ├── stripe.ts           ← Stripe client init
│   │   └── kafka.ts            ← KafkaJS producer (optional)
│   ├── models/
│   │   ├── payment.model.ts    ← Mongoose schema + model
│   │   └── paymentEvent.model.ts
│   ├── services/
│   │   ├── payment.service.ts  ← all business logic
│   │   └── kafka.service.ts    ← produce events (graceful if no broker)
│   ├── controllers/
│   │   └── payment.controller.ts
│   ├── routes/
│   │   └── payment.routes.ts
│   ├── middleware/
│   │   └── auth.middleware.ts  ← extract x-user-id / x-user-role from headers
│   ├── types/
│   │   └── payment.types.ts
│   ├── utils/
│   │   ├── apiResponse.ts      ← { success, data, message } helpers
│   │   └── receipt.ts          ← receipt number generator
│   └── main.ts                 ← Express server entry point
├── package.json
├── tsconfig.json
├── .env.example
├── .dockerignore               (already exists)
├── Dockerfile                  (uncomment template)
└── README.md                   (update)
```

### Why Express, not Fastify

The README says Fastify, but:

- `auth-service` uses Express
- `notification-service` uses Express
- `api-gateway` uses Express
- Same middleware patterns, same `apiResponse` shape
- Less context switching for the team

If you prefer Fastify, say so before Phase 1.

---

## 6. Dependencies

```json
{
  "dependencies": {
    "express": "^5.2.1",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "mongoose": "^9.3.3",
    "stripe": "^18.0.0",
    "kafkajs": "^2.2.4",
    "uuid": "^11.1.0",
    "express-rate-limit": "^8.3.1"
  },
  "devDependencies": {
    "typescript": "^6.0.2",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "nodemon": "^3.1.14",
    "@types/node": "^25.5.0",
    "@types/express": "^5.0.6",
    "@types/cors": "^2.8.19",
    "@types/uuid": "^10.0.0"
  }
}
```

### What's NOT included

- `@fastify/jwt` — no JWT parsing in this service
- `pg` — using MongoDB, not PostgreSQL
- `express-validator` — manual validation is sufficient for 4 endpoints

---

## 7. Environment Variables

```env
# Server
PORT=8087
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://arogya:arogya_secret@localhost:27017/arogya_payments?authSource=admin

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# URLs
FRONTEND_URL=http://localhost:5173

# Kafka (optional — if unset, Kafka events are skipped)
KAFKA_BROKER=
KAFKA_TOPIC_PAYMENT_COMPLETED=payment.completed
```

---

## 7a. Stripe Sandbox Setup (MANUAL)

> These steps are done once and are required before Phase 4 (webhook handling).

### Already done

- Stripe account created and sandbox mode active
- Secret key (`sk_test_...`) added to `.env`
- `POST /api/payments/initiate` creates Stripe Checkout Sessions successfully

### Before Phase 4 — Webhook setup

You need to tell Stripe where to send payment events (webhooks). Two options:

#### Option A: Stripe CLI (for local development — recommended)

1. **Install Stripe CLI**: https://docs.stripe.com/stripe-cli

   ```
   # Windows (via scoop)
   scoop install stripe

   # Or download from https://github.com/stripe/stripe-cli/releases
   ```

2. **Login**:
   ```
   stripe login
   ```
3. **Forward webhooks to your local server**:
   ```
   stripe listen --forward-to localhost:8087/api/payments/webhook
   ```
4. The CLI will print a webhook signing secret (`whsec_...`). **Copy it into `.env`**:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxx
   ```
5. **Test a payment flow**:
   - Call `POST /api/payments/initiate` → get `checkoutUrl`
   - Open `checkoutUrl` in browser
   - Use test card: `4242 4242 4242 4242`, any future expiry, any CVC
   - Stripe will fire `checkout.session.completed` → your webhook handles it

#### Option B: Stripe Dashboard (for deployed environments)

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. URL: `https://your-domain.com/api/payments/webhook`
4. Events to listen for:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET` in `.env`

### Test card numbers (Stripe sandbox)

| Card Number           | Result    |
| --------------------- | --------- |
| `4242 4242 4242 4242` | Success   |
| `4000 0000 0000 0002` | Declined  |
| `4000 0000 0000 3220` | 3D Secure |

Use any future expiry date and any 3-digit CVC.

### Phase 1 — Project scaffolding ✅ DONE

**What**: `package.json`, `tsconfig.json`, `.env.example`, folder structure, `src/main.ts` (Express server skeleton with health endpoint only)

**Deliverable**: `npm run dev` starts server on :8087, `GET /health` returns 200

**Files created**:

- `package.json`
- `tsconfig.json`
- `.env.example`
- `src/main.ts`
- `src/config/env.ts`
- `src/utils/apiResponse.ts`

---

### Phase 2 — MongoDB models + connection ✅ DONE

**What**: Mongoose connection, Payment + PaymentEvent schemas

**Deliverable**: Server connects to MongoDB on startup, models ready

**Files created**:

- `src/config/database.ts`
- `src/models/payment.model.ts`
- `src/models/paymentEvent.model.ts`

---

### Phase 3 — `POST /api/payments/initiate` (PAY-02 + PAY-03) ✅ DONE

**What**: Stripe client init, payment initiation endpoint

**Deliverable**: Appointment-service can call this endpoint, gets back `paymentId`. Stripe Checkout Session created. Payment saved as PENDING.

**Files created**:

- `src/config/stripe.ts`
- `src/types/payment.types.ts`
- `src/services/payment.service.ts` (initiatePayment method)
- `src/controllers/payment.controller.ts`
- `src/routes/payment.routes.ts`
- `src/middleware/auth.middleware.ts`

**Test**: `curl -X POST http://localhost:8087/api/payments/initiate -H "Content-Type: application/json" -d '{"appointmentId":"test-123","amount":3500,"patientId":"patient-456","currency":"LKR"}'`

---

### Phase 4 — Webhook handling (PAY-04) ✅ DONE

**What**: Stripe webhook endpoint with signature verification, payment status update, receipt generation

**Deliverable**: Stripe CLI `stripe listen --forward-to localhost:8087/api/payments/webhook` triggers SUCCESS flow. Payment updated to SUCCESS with receipt. Dev simulate endpoint available.

**Also created**: `scripts/start-dev.ps1` — one-command startup that runs both Stripe CLI listener and payment-service, cleans up on Ctrl+C. `POST /api/payments/dev/simulate-success/:paymentId` — dev-only endpoint to skip Stripe checkout and mark payment SUCCESS.

**Files created/updated**:

- `src/utils/receipt.ts`
- `src/services/payment.service.ts` (handleWebhook, generateReceipt methods)
- `src/controllers/payment.controller.ts` (webhook handler)
- `src/routes/payment.routes.ts` (webhook route with raw body parser)

**Key detail**: Webhook route uses `express.raw({ type: 'application/json' })` — NOT `express.json()`. All other routes use `express.json()`.

---

### Phase 5 — Payment history + receipt (PAY-05 + PAY-06) ✅ DONE

**What**: `GET /api/payments/me` (patient history, paginated) + `GET /api/payments/doctor/me` (doctor dashboard with summary) + `GET /api/payments/:id` (single payment / receipt, accessible by patient or doctor)

**Deliverable**: Patient can fetch their payment history (PENDING/SUCCESS/FAILED with CTAs). Doctor can see all payment statuses for their consultations with totals summary. Both can view individual receipt.

**Verified**: All 3 endpoints tested — patient history with pagination + status filter, doctor dashboard with summary aggregation (totalPending/totalSuccess/totalFailed/totalReceived), single payment with authorization (patient owner, doctor, admin allowed; others get 403).

**Files updated**:

- `src/services/payment.service.ts` (getPaymentHistory, getDoctorPayments, getPaymentById methods)
- `src/controllers/payment.controller.ts`
- `src/routes/payment.routes.ts`

---

### Phase 6 — Kafka producer (optional)

**What**: KafkaJS producer that emits `payment.completed` after SUCCESS webhook. Gracefully disabled if `KAFKA_BROKER` is unset.

**Deliverable**: If Kafka is running, event published. If not, warning logged.

**Files created**:

- `src/config/kafka.ts`
- `src/services/kafka.service.ts`

---

### Phase 7 — Dockerfile + infrastructure + appointment-service updates

**What**: Uncomment Dockerfile, update docker-compose.dev.yml, fix port references, AND apply the 3 required Java code changes in appointment-service.

**Deliverable**: `docker compose up` starts payment-service on :8087. Booking flow ends at PENDING (no premature payment). Doctor accept triggers payment. Both ports corrected.

**Files updated**:

- `apps/payment-service/Dockerfile` (uncomment + adjust port to 8087)
- `infrastructure/docker/docker-compose.dev.yml` (replace commented stub with real service block)
- `apps/appointment-service/src/main/resources/application-dev.properties` (port 3001 → 8087)
- `apps/appointment-service/src/main/resources/application-docker.properties` (port 3001 → 8087)
- API Gateway env in docker-compose (port 3001 → 8087)

**Java code changes in appointment-service** (3 files):

- `PaymentServiceClient.java` — add `doctorId` parameter to `initiatePayment()`
- `AppointmentService.java` — remove payment call from `bookAppointment()`, add to `acceptAppointment()`

> These are small, targeted changes documented in full in section 11.

---

### Phase 8 — Delete stub + cleanup

**What**: Remove `index.js` (the old Express stub). Update README.

**Files deleted**:

- `apps/payment-service/index.js`

---

## 9. Response Format

All endpoints return the same shape (consistent with auth-service and patient-service):

```ts
{
  success: boolean;
  data?: T;
  message: string;
}
```

Error responses:

```ts
{
  success: false;
  message: "Descriptive error message";
}
```

HTTP status codes:

- 200 — success (GET, webhook)
- 201 — created (POST /initiate)
- 400 — bad request (validation)
- 401 — unauthorized (missing x-user-id)
- 403 — forbidden (wrong patient)
- 404 — not found
- 409 — conflict (duplicate payment for same appointment)
- 500 — unexpected error

---

## 10. Things We Are NOT Doing

| Feature                        | Why not                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| Refund endpoint                | Not in task list. Can add later.                                           |
| PDF receipt generation         | Not needed. Receipt is a JSON document rendered by frontend.               |
| Subscription/recurring billing | Out of scope. Consultation-fee only.                                       |
| Multiple payment gateways      | Stripe sandbox only. PayHere can be added later behind an adapter.         |
| Kafka consumer                 | Payment-service only produces. Appointment-service would consume (future). |
| JWT parsing                    | Gateway handles it. We trust `x-user-id` / `x-user-role` headers.          |
| Database migrations            | MongoDB is schemaless. Mongoose handles validation.                        |

---

## 11. Integration Notes

### Corrected appointment → payment flow

**OLD (wrong)**: `bookAppointment()` → payment initiated immediately at booking time
**NEW (correct)**: `acceptAppointment()` → payment initiated only after doctor accepts

This requires **two changes in `AppointmentService.java`**:

**Change 1 — `bookAppointment()`**: Remove the `paymentClient.initiatePayment()` block entirely.
Appointment is saved as `PENDING`. No payment created yet. Notification fires to doctor only.

```java
// REMOVE this entire block from bookAppointment():
if (request.getAppointmentType() == AppointmentType.PHYSICAL) {
    try {
        String paymentId = paymentClient.initiatePayment(...);
        saved.setPaymentId(paymentId);
        saved.setStatus(AppointmentStatus.CONFIRMED);
        saved = appointmentRepository.save(saved);
    } catch (RuntimeException e) { ... }
}
```

**Change 2 — `acceptAppointment()`**: After validating the doctor, fetch the slot for fee, then call payment:

```java
// In acceptAppointment(), before setting CONFIRMED:
AppointmentSlot slot = slotRepository.findById(appointment.getSlotId()).orElse(null);
if (slot != null) {
    try {
        String paymentId = paymentClient.initiatePayment(
            appointment.getId(), slot.getFee(), appointment.getPatientId(), appointment.getDoctorId()
        );
        appointment.setPaymentId(paymentId);
        // Status stays PENDING — will move to CONFIRMED after payment success (future Kafka)
    } catch (RuntimeException e) {
        log.warn("Payment initiation failed for appointment {} — continuing: {}",
            appointment.getId(), e.getMessage());
    }
}
```

**Change 3 — `PaymentServiceClient.initiatePayment()`**: Add `doctorId` parameter:

```java
// Add doctorId to the method signature and request body
public String initiatePayment(String appointmentId, BigDecimal amount, String patientId, String doctorId) {
    Map<String, Object> body = Map.of(
        "appointmentId", appointmentId,
        "amount", amount,
        "patientId", patientId,
        "doctorId", doctorId,   // NEW
        "currency", "LKR"
    );
    ...
}
```

These 3 changes will be implemented in **Phase 7** alongside the port and docker-compose fixes.

---

### How the frontend gets the checkoutUrl

**Full flow after this change**:

1. Patient: `POST /api/appointments` → appointment created, `status=PENDING`, no `paymentId` yet
2. Doctor: notified → reviews → `PATCH /api/appointments/{id}/accept`
3. Appointment-service → `POST /api/payments/initiate` → payment-service
4. Payment-service creates Stripe session → returns `{ paymentId, checkoutUrl }`
5. Appointment-service stores `paymentId`, appointment stays `PENDING`
6. Patient: notified "Doctor accepted — complete your payment"
7. Patient: opens appointment → sees `paymentId`
8. Frontend → `GET /api/payments/{paymentId}` → gets `checkoutUrl`
9. Frontend redirects to Stripe Checkout page
10. Patient pays → Stripe fires webhook → payment-service records `SUCCESS` + receipt
11. Patient: `GET /api/payments/{paymentId}` → shows receipt

### Stripe Checkout redirect URLs

```
success_url: FRONTEND_URL/payments/success?session_id={CHECKOUT_SESSION_ID}
cancel_url:  FRONTEND_URL/payments/cancel?session_id={CHECKOUT_SESSION_ID}
```

The frontend routes `/payments/success` and `/payments/cancel` need to exist. They can:

- Show a "Payment successful" message
- Call `GET /api/payments/{paymentId}` to display receipt details
- Link back to the appointment

### Appointment status vs payment status

| Appointment status | Payment status        | Meaning                                                  |
| ------------------ | --------------------- | -------------------------------------------------------- |
| PENDING            | _(no payment record)_ | Appointment just booked, waiting for doctor              |
| PENDING            | PENDING               | Doctor accepted, patient hasn't paid yet                 |
| PENDING            | FAILED                | Payment attempted but failed on Stripe                   |
| CONFIRMED          | SUCCESS               | Fully paid and confirmed (future: set by Kafka consumer) |

> **Current behaviour**: appointment-service sets `CONFIRMED` only after doctor manually accepts (the `acceptAppointment()` call). The Kafka-driven transition from PENDING→CONFIRMED after payment success is a future iteration (Kafka consumer in appointment-service).

### What each role sees on the payment dashboard

**Patient dashboard (`GET /api/payments/me`):**

- PENDING — "Complete Payment" button (use `checkoutUrl`)
- SUCCESS — "View Receipt" button
- FAILED — "Retry Payment" (re-creates Stripe session, future feature)

**Doctor dashboard (`GET /api/payments/doctor/me`):**

- PENDING — "Awaiting Payment" badge (patient needs to pay)
- SUCCESS — "Received" badge with amount and date
- FAILED — "Payment Failed" badge (patient was unable to pay)

---

## 12. Quick Reference

### Endpoints summary

| Method | Path                             | Auth                            | Called by                       | Task           |
| ------ | -------------------------------- | ------------------------------- | ------------------------------- | -------------- |
| `POST` | `/api/payments/initiate`         | Body has patientId + doctorId   | appointment-service (on accept) | PAY-02         |
| `POST` | `/api/payments/webhook`          | Stripe signature                | Stripe                          | PAY-03, PAY-04 |
| `GET`  | `/api/payments/me`               | `x-user-id` (patient)           | Frontend                        | PAY-06         |
| `GET`  | `/api/payments/doctor/me`        | `x-user-id` (doctor)            | Frontend                        | PAY-06         |
| `GET`  | `/api/payments/:id`              | `x-user-id` (patient or doctor) | Frontend                        | PAY-05         |
| `GET`  | `/health`                        | None                            | Docker healthcheck              | —              |
| `POST` | `/api/payments/simulate-webhook` | None (dev only)                 | Developer                       | Testing        |

### Stripe Checkout flow (tl;dr)

```
1.  patient books appointment  →  appointment created, status=PENDING, no payment yet
2.  doctor is notified  →  doctor reviews  →  PATCH /api/appointments/{id}/accept
3.  appointment-service  →  POST /api/payments/initiate  →  payment-service
4.  payment-service  →  stripe.checkout.sessions.create()  →  Stripe
5.  payment-service  →  saves PENDING + returns { paymentId, checkoutUrl }
6.  appointment-service stores paymentId  →  appointment stays PENDING
7.  patient notified: "complete your payment"
8.  frontend  →  GET /api/payments/{paymentId}  →  gets checkoutUrl
9.  frontend  →  redirects to checkoutUrl  →  Stripe Checkout page
10. user pays  →  Stripe  →  POST /api/payments/webhook  →  payment-service
11. payment-service  →  verifies signature, updates SUCCESS, generates receipt
12. frontend  →  GET /api/payments/{paymentId}  →  shows receipt
```
