# Telemedicine Chat API Examples

This document covers chat REST APIs and Socket.IO events used for room-scoped doctor-patient communication.

All examples assume:

- REST base path: `http://localhost:8086/api/v1/telemedicine/chats`
- Required headers for REST and socket handshake:
  - `x-user-id`
  - `x-user-role` (`doctor` or `patient`)

---

## REST APIs

## 1. Get chat room state

Returns pinned summary metadata for the room.

**GET** `/rooms/{roomId}/state`

```bash
curl http://localhost:8086/api/v1/telemedicine/chats/rooms/ROOM_ID/state \
  -H "x-user-id: doctor-123" \
  -H "x-user-role: doctor"
```

---

## 2. Update pinned summary (doctor-only)

**PATCH** `/rooms/{roomId}/summary`

```json
{
  "pinnedSummary": "Patient improving clinically. Continue medication and monitor fever."
}
```

```bash
curl -X PATCH http://localhost:8086/api/v1/telemedicine/chats/rooms/ROOM_ID/summary \
  -H "Content-Type: application/json" \
  -H "x-user-id: doctor-123" \
  -H "x-user-role: doctor" \
  -d '{ "pinnedSummary": "Patient improving clinically. Continue medication and monitor fever." }'
```

---

## 3. List room messages

Supports pagination:

- `limit` in range 1..100 (default 50)
- `before` as ISO date for cursor-based backward pagination

**GET** `/rooms/{roomId}/messages?limit=20&before=2026-04-14T09:30:00.000Z`

```bash
curl "http://localhost:8086/api/v1/telemedicine/chats/rooms/ROOM_ID/messages?limit=20" \
  -H "x-user-id: patient-456" \
  -H "x-user-role: patient"
```

---

## 4. Send message

**POST** `/rooms/{roomId}/messages`

```json
{
  "content": "I am having chest pain and shortness of breath.",
  "triageTags": ["symptom", "follow-up"],
  "attachments": [
    {
      "type": "report",
      "url": "https://files.example.com/reports/lab-001.pdf",
      "name": "Lab Report"
    }
  ],
  "consentMarker": {
    "type": "treatment-consent",
    "acknowledgedAt": "2026-04-14T09:20:00.000Z"
  }
}
```

```bash
curl -X POST http://localhost:8086/api/v1/telemedicine/chats/rooms/ROOM_ID/messages \
  -H "Content-Type: application/json" \
  -H "x-user-id: patient-456" \
  -H "x-user-role: patient" \
  -d '{
    "content": "I am having chest pain and shortness of breath.",
    "triageTags": ["symptom", "follow-up"],
    "attachments": [
      {
        "type": "report",
        "url": "https://files.example.com/reports/lab-001.pdf",
        "name": "Lab Report"
      }
    ],
    "consentMarker": {
      "type": "treatment-consent",
      "acknowledgedAt": "2026-04-14T09:20:00.000Z"
    }
  }'
```

If safety keywords are detected, response may include `escalationGuidance`.

---

## 5. Edit message (sender-only, within 5 minutes)

**PATCH** `/rooms/{roomId}/messages/{messageId}`

```json
{
  "content": "Correction: mild chest discomfort after climbing stairs.",
  "triageTags": ["symptom"]
}
```

---

## 6. Delete message (sender-only, soft delete)

**DELETE** `/rooms/{roomId}/messages/{messageId}`

```bash
curl -X DELETE http://localhost:8086/api/v1/telemedicine/chats/rooms/ROOM_ID/messages/MESSAGE_ID \
  -H "x-user-id: patient-456" \
  -H "x-user-role: patient"
```

---

## Socket.IO Events

## 1. Connect with required headers

Socket handshake must include:

- `x-user-id`
- `x-user-role` (`doctor` or `patient`)

If missing/invalid, socket is disconnected with unauthorized error.

---

## 2. Join chat room

Client emits:

- `chat:room.join` with `{ roomId }`

Ack success:

```json
{ "success": true, "data": { "roomId": "ROOM_ID" } }
```

---

## 3. Send message in real-time

Client emits:

- `chat:message.send` with `{ roomId, message }`

Server emits to room:

- `chat:message.new`
- `chat:safety.flagged` (when safety keywords are detected)

---

## 4. Edit message in real-time

Client emits:

- `chat:message.edit` with `{ roomId, messageId, message }`

Server emits:

- `chat:message.updated`
- `chat:safety.flagged` (if edited content triggers safety)

---

## 5. Delete message in real-time

Client emits:

- `chat:message.delete` with `{ roomId, messageId }`

Server emits:

- `chat:message.deleted`

---

## 6. Pin summary in real-time

Client emits:

- `chat:summary.pin` with `{ roomId, summary: { pinnedSummary } }`

Server emits:

- `chat:summary.updated`

---

## 7. Fetch room state in real-time

Client emits:

- `chat:room.state` with `{ roomId }`

Ack contains room state payload.

---

## Common failure cases

1. Missing auth headers (401)

- Message: `Missing x-user-id or x-user-role header`

2. Invalid role header (401)

- Message: `Invalid x-user-role header`

3. Actor not room participant (403)

- Doctor case: `Doctor is not a participant of this room`
- Patient case: `Patient is not a participant of this room`

4. Empty message content (400)

- Message: `Message content is required`

5. Message too long (400)

- Message: `Message content exceeds 2000 characters`

6. Invalid triage tag (400)

- Message: `Invalid triage tag: <value>`

7. Edit not allowed (403/409)

- Non-owner edit: `You can only edit your own messages`
- Edit window exceeded: `Message edit window has expired`
- Deleted message edit: `Deleted messages cannot be edited`

8. Delete not allowed (403)

- Message: `You can only delete your own messages`

9. Chat write window expired (409)

- Message: `Chat is read-only for this room. Write window has expired.`

10. Pinned summary validation (400/403/409)

- Non-doctor: `Only doctor can update pinned summary`
- Empty summary: `Pinned summary is required`
- Summary too long: `Pinned summary exceeds 3000 characters`
- Room write window expired: `Summary is read-only for this room. Write window has expired.`

---

## Response envelope

REST and socket ACK payloads follow success/message shape:

```json
{
  "success": true,
  "data": {}
}
```

or

```json
{
  "success": false,
  "message": "..."
}
```
