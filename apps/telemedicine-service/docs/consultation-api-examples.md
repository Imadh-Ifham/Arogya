# Telemedicine Consultation API Examples

This document provides sample HTTP requests for consultation lifecycle management.

All examples assume the service base path:

- `http://localhost:8086/api/v1/telemedicine`

---

## 1. Create Consultation (auto room lookup/create)

Creates a consultation and attaches a usable room for the doctor-patient pair.

**POST** `/consultations`

```json
{
  "appointmentId": "appt-001",
  "patientId": "patient-456",
  "doctorId": "doctor-123",
  "startsAt": "2026-05-01T13:00:00.000Z",
  "expirationHours": 2
}
```

**Sample cURL:**

```bash
curl -X POST http://localhost:8086/api/v1/telemedicine/consultations \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "appt-001",
    "patientId": "patient-456",
    "doctorId": "doctor-123",
    "startsAt": "2026-05-01T13:00:00.000Z",
    "expirationHours": 2
  }'
```

---

## 2. Create Consultation using existing roomId

Use this when you want a specific room.

**POST** `/consultations`

```json
{
  "appointmentId": "appt-002",
  "patientId": "patient-456",
  "doctorId": "doctor-123",
  "roomId": "681df5f5cb8b3f2ec43e95a1",
  "startsAt": "2026-05-01T14:00:00.000Z",
  "expirationHours": 2
}
```

---

## 3. List all consultations

**GET** `/consultations`

```bash
curl http://localhost:8086/api/v1/telemedicine/consultations
```

---

## 4. Get consultation by ID

**GET** `/consultations/{consultationId}`

```bash
curl http://localhost:8086/api/v1/telemedicine/consultations/CONSULTATION_ID
```

---

## 5. List consultations by doctor

**GET** `/consultations/doctor/{doctorId}`

```bash
curl http://localhost:8086/api/v1/telemedicine/consultations/doctor/doctor-123
```

---

## 6. List consultations by patient

**GET** `/consultations/patient/{patientId}`

```bash
curl http://localhost:8086/api/v1/telemedicine/consultations/patient/patient-456
```

---

## 7. Start consultation (doctor-only)

Only doctor actor can set status to `active`.

**PATCH** `/consultations/{consultationId}/status`

Headers:

- `x-caller-service: doctor-service` (or `x-caller-role: doctor`)

```json
{
  "status": "active"
}
```

```bash
curl -X PATCH http://localhost:8086/api/v1/telemedicine/consultations/CONSULTATION_ID/status \
  -H "Content-Type: application/json" \
  -H "x-caller-service: doctor-service" \
  -d '{ "status": "active" }'
```

---

## 8. End consultation

**PATCH** `/consultations/{consultationId}/status`

```json
{
  "status": "ended"
}
```

```bash
curl -X PATCH http://localhost:8086/api/v1/telemedicine/consultations/CONSULTATION_ID/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "ended" }'
```

---

## 9. Cancel consultation

**PATCH** `/consultations/{consultationId}/status`

```json
{
  "status": "cancelled"
}
```

---

## 10. Common failure cases

### 10.1 Missing required create fields (400)

Example invalid request body:

```json
{
  "appointmentId": "appt-001"
}
```

Expected message:

- `appointmentId, patientId, doctorId and startsAt are required`

### 10.2 Invalid startsAt (400)

```json
{
  "appointmentId": "appt-001",
  "patientId": "patient-456",
  "doctorId": "doctor-123",
  "startsAt": "not-a-date",
  "expirationHours": 2
}
```

Expected message:

- `Invalid startsAt value`

### 10.3 Invalid expirationHours (400)

`expirationHours` must be a positive integer.

Expected message:

- `expirationHours must be a positive integer`

### 10.4 Invalid status value (400)

```json
{ "status": "paused" }
```

Expected message:

- `Invalid status`

### 10.5 Non-doctor trying to start consultation (403)

Setting `status=active` with non-doctor actor header.

Expected message:

- `Only doctor can start the meeting`

### 10.6 Consultation not found (404)

Using unknown consultationId.

Expected message:

- `Consultation not found`

### 10.7 Room expired/closed during status update (409)

If linked room is unusable.

Expected messages include:

- `Room has expired. Reopen the room before scheduling`
- `Room is closed`

---

## Response envelope

All endpoints return:

```json
{
  "success": true,
  "data": {}
}
```

On failures:

```json
{
  "success": false,
  "message": "...",
  "details": {}
}
```
