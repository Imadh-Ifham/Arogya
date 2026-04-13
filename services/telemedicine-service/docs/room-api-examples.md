# Telemedicine Room & Meeting API Examples

This document provides sample HTTP requests for testing the telemedicine room and meeting lifecycle using Postman or similar tools.

Room creation now returns Jitsi-ready metadata (`roomKey`, `jitsiRoomName`, `jitsiRoomUrl`) that frontend can use directly.

---

## 1. Create a Room

Creates a room for a doctor-patient pair. Returns the roomKey and expiry.

**POST** `/api/v1/consultations/rooms`

```json
{
  "doctorId": "doctor-123",
  "patientId": "patient-456",
  "expiresAt": "2026-05-01T12:00:00.000Z" // optional, defaults to env config
}
```

**Expected response fields inside `data`:**

- `roomKey`: Jitsi-safe unique meeting key.
- `meetingProvider`: always `jitsi`.
- `jitsiRoomName`: room name to pass to Jitsi SDK.
- `jitsiRoomUrl`: fully qualified join URL.

**Sample cURL:**

```bash
curl -X POST http://localhost:8086/api/v1/consultations/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "doctor-123",
    "patientId": "patient-456",
    "expiresAt": "2026-05-01T12:00:00.000Z"
  }'
```

---

## 2. Schedule a Meeting in a Room

Schedules a meeting (consultation) in an existing room. Appointment must exist in appointment service.

**POST** `/api/v1/consultations`

```json
{
  "appointmentId": "appt-001",
  "doctorId": "doctor-123",
  "patientId": "patient-456",
  "startsAt": "2026-05-01T13:00:00.000Z"
}
```

**Sample cURL:**

```bash
curl -X POST http://localhost:8086/api/v1/consultations \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "appt-001",
    "doctorId": "doctor-123",
    "patientId": "patient-456",
    "startsAt": "2026-05-01T13:00:00.000Z"
  }'
```

---

## 3. List All Meetings

**GET** `/api/v1/consultations`

**Sample cURL:**

```bash
curl http://localhost:8086/api/v1/consultations
```

---

## 4. Get Meeting by ID

**GET** `/api/v1/consultations/{meetingId}`

**Sample cURL:**

```bash
curl http://localhost:8086/api/v1/consultations/MEETING_ID
```

---

## 5. Start a Meeting (Doctor Only)

Only the doctor can start a meeting. Pass `x-caller-service: doctor-service` header.

**PATCH** `/api/v1/consultations/{meetingId}/status`

```json
{
  "status": "active"
}
```

**Sample cURL:**

```bash
curl -X PATCH http://localhost:8086/api/v1/consultations/MEETING_ID/status \
  -H "Content-Type: application/json" \
  -H "x-caller-service: doctor-service" \
  -d '{ "status": "active" }'
```

---

## 6. End or Cancel a Meeting

**PATCH** `/api/v1/consultations/{meetingId}/status`

```json
{
  "status": "ended" // or "cancelled"
}
```

**Sample cURL:**

```bash
curl -X PATCH http://localhost:8086/api/v1/consultations/MEETING_ID/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "ended" }'
```

---

## 7. Reopen an Expired Room

**PATCH** `/api/v1/consultations/rooms/{roomKey}/reopen`

```json
{
  "expiresAt": "2026-06-01T12:00:00.000Z"
}
```

**Sample cURL:**

```bash
curl -X PATCH http://localhost:8086/api/v1/consultations/rooms/ROOM_KEY/reopen \
  -H "Content-Type: application/json" \
  -d '{ "expiresAt": "2026-06-01T12:00:00.000Z" }'
```

---

## Notes

- All endpoints return `{ success, data, message? }` envelopes.
- Meeting creation requires the room to exist and not be expired.
- Only doctor callers can start a meeting (status: active).
- Expired rooms must be reopened before scheduling new meetings.
- Appointment IDs must be valid in the appointment service.
