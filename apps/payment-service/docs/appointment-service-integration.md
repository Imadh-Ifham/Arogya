# Appointment-Service Integration Guide

> **Purpose**: This document describes the changes required in the **appointment-service** (and its config) to fully integrate with the new payment-service. These changes are **not yet applied** — they are documented here so they can be done in a separate PR or by the appointment-service owner.

---

## Summary of Changes

| # | File | Type | Description |
|---|------|------|-------------|
| 1 | `application-dev.properties` | Config | Change payment URL port `3001` → `8087` |
| 2 | `application-docker.properties` | Config | Change payment URL port `3001` → `8087` |
| 3 | `PaymentServiceClient.java` | Code | Add `doctorId` parameter to `initiatePayment()` |
| 4 | `AppointmentService.java` | Code | Move payment call from `bookAppointment()` to `acceptAppointment()` |

---

## Change 1 — `application-dev.properties` (port update)

**File**: `apps/appointment-service/src/main/resources/application-dev.properties`

**Current**:
```properties
services.payment.url=http://localhost:3001
```

**Change to**:
```properties
services.payment.url=http://localhost:8087
```

**Why**: The payment-service now runs on port **8087** (not 3001). This applies when running the appointment-service locally in `dev` profile.

---

## Change 2 — `application-docker.properties` (port update)

**File**: `apps/appointment-service/src/main/resources/application-docker.properties`

**Current**:
```properties
services.payment.url=http://payment-service:3001
```

**Change to**:
```properties
services.payment.url=http://payment-service:8087
```

**Why**: Same port change, but for the `docker` profile where services communicate via Docker network hostnames.

---

## Change 3 — `PaymentServiceClient.java` (add `doctorId` parameter)

**File**: `apps/appointment-service/src/main/java/com/arogya/appointment_service/client/PaymentServiceClient.java`

### Current signature

```java
public String initiatePayment(String appointmentId, BigDecimal amount, String patientId)
```

### Current request body

```json
{
  "appointmentId": "...",
  "amount": 3500,
  "patientId": "patient-456",
  "currency": "LKR"
}
```

### New signature

```java
public String initiatePayment(String appointmentId, BigDecimal amount, String patientId, String doctorId)
```

### New request body

```json
{
  "appointmentId": "...",
  "amount": 3500,
  "patientId": "patient-456",
  "doctorId": "doctor-789",
  "currency": "LKR"
}
```

### What to change in the method body

Add `doctorId` to the `requestBody` map:

```java
Map<String, Object> requestBody = new HashMap<>();
requestBody.put("appointmentId", appointmentId);
requestBody.put("amount", amount);
requestBody.put("patientId", patientId);
requestBody.put("doctorId", doctorId);       // ← ADD THIS LINE
requestBody.put("currency", "LKR");
```

### Why

The payment-service needs `doctorId` to:
- Store it on the payment record so the doctor can see their earnings via `GET /api/payments/doctor/me`
- Associate the payment with the correct doctor for the dashboard summary (totalReceived, etc.)

Without `doctorId`, the payment will still be created but the doctor dashboard endpoints won't return it.

---

## Change 4 — `AppointmentService.java` (move payment trigger)

**File**: `apps/appointment-service/src/main/java/com/arogya/appointment_service/service/AppointmentService.java`

### Current flow (payment at booking time)

```
Patient books appointment
  → bookAppointment()
    → slot validated & marked BOOKED
    → appointment saved as PENDING
    → paymentClient.initiatePayment(id, fee, patientId)   ← HERE
    → on success: status → CONFIRMED, paymentId stored
    → on failure: stays PENDING
```

### Desired flow (payment after doctor accepts)

```
Patient books appointment
  → bookAppointment()
    → slot validated & marked BOOKED
    → appointment saved as PENDING
    → (NO payment call)

Doctor accepts appointment
  → acceptAppointment()
    → status → ACCEPTED (or AWAITING_PAYMENT)
    → paymentClient.initiatePayment(id, fee, patientId, doctorId)   ← MOVED HERE
    → checkoutUrl returned to frontend
    → patient completes payment on Stripe
    → webhook confirms → appointment CONFIRMED
```

### Step-by-step changes

#### 4a. Remove payment call from `bookAppointment()`

In the `bookAppointment()` method, find this block (approximately lines 72–83):

```java
// Initiate payment
try {
    String paymentId = paymentClient.initiatePayment(
        saved.getId().toString(),
        slot.getFee(),
        patientId
    );
    saved.setPaymentId(paymentId);
    saved.setStatus(AppointmentStatus.CONFIRMED);
    saved = appointmentRepository.save(saved);
} catch (RuntimeException e) {
    // Payment failed — appointment stays PENDING, can be retried
    logger.warn("Payment initiation failed for appointment {}: {}", saved.getId(), e.getMessage());
}
```

**Remove** or comment out this entire block. The appointment should remain `PENDING` after booking — the patient is just reserving the slot.

#### 4b. Add payment call to `acceptAppointment()`

In the `acceptAppointment()` method (currently just flips status to CONFIRMED), add the payment initiation:

```java
public AppointmentResponse acceptAppointment(UUID appointmentId, String doctorId) {
    Appointment appointment = findAppointmentById(appointmentId);

    // Validate the doctor owns this appointment
    if (!appointment.getDoctorId().equals(doctorId)) {
        throw new UnauthorizedException("Not authorized to accept this appointment");
    }

    // Initiate payment now that doctor has accepted
    try {
        String paymentId = paymentClient.initiatePayment(
            appointment.getId().toString(),
            appointment.getSlot().getFee(),
            appointment.getPatientId(),
            doctorId                          // ← new parameter
        );
        appointment.setPaymentId(paymentId);
        appointment.setStatus(AppointmentStatus.AWAITING_PAYMENT); // or keep CONFIRMED
    } catch (RuntimeException e) {
        logger.warn("Payment initiation failed for appointment {}: {}", appointmentId, e.getMessage());
        // Doctor accepted but payment failed — appointment can stay ACCEPTED
        appointment.setStatus(AppointmentStatus.ACCEPTED);
    }

    appointment = appointmentRepository.save(appointment);
    return mapToResponse(appointment);
}
```

### Why this flow change matters

| Aspect | Old (pay at booking) | New (pay after accept) |
|--------|---------------------|----------------------|
| **When patient pays** | Immediately on booking | After doctor confirms they'll see the patient |
| **Refund risk** | High — doctor may reject after payment | Low — doctor already accepted |
| **Patient experience** | Pays upfront, might get rejected | Books for free, pays only when confirmed |
| **Doctor dashboard** | doctorId not sent | doctorId included, dashboard works |

---

## Payment-Service Response Format

When the appointment-service calls `POST /api/payments/initiate`, it will receive:

```json
{
  "success": true,
  "message": "Payment initiated",
  "data": {
    "paymentId": "pay_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_..."
  }
}
```

The `checkoutUrl` should be sent back to the frontend so the patient can complete payment on Stripe's hosted checkout page.

---

## Docker-Compose Changes (Already Applied)

These changes have **already been made** in the payment-service PR:

- `docker-compose.dev.yml`: payment-service uncommented, port updated to `8087`
- `docker-compose.dev.yml`: API Gateway `PAYMENT_SERVICE_URL` updated to `http://payment-service:8087`

The appointment-service properties (Changes 1 & 2 above) still need to be updated separately.
