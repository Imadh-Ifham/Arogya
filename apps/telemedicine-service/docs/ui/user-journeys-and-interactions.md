# User Journeys and Interaction Flows

## 1. Entry Routes

Primary entry points:

1. Appointment details page -> Open telemedicine workspace.
2. Telemedicine dashboard -> Select upcoming/active consultation.

Route model (single app, role-based):

- `/telemedicine` (dashboard)
- `/telemedicine/consultations/:consultationId` (workspace)

## 2. Doctor Journey (Implementation Priority)

## 2.1 Pre-Consult

1. Doctor opens dashboard and sees consultations grouped by status.
2. Doctor opens consultation workspace.
3. UI loads consultation + room metadata.
4. Consent checkpoint is shown and must be acknowledged.
5. Jitsi panel initializes in embedded container.

Backend interactions:

- `GET /api/v1/telemedicine/consultations/:id`
- Optional room checks (if required by workspace preflight).

## 2.2 Start Consult

1. Doctor clicks Start Consultation.
2. UI sends status update to active.
3. On success, call controls become enabled and status badge updates.
4. Chat composer becomes active if room write rules allow.

Backend interaction:

- `PATCH /api/v1/telemedicine/consultations/:id/status` with `{ "status": "active" }`
- Header required for doctor action path: `x-caller-service: doctor-service` or doctor role equivalent.

## 2.3 In-Consult Collaboration

1. Doctor uses Jitsi video panel.
2. Doctor and patient exchange chat messages in real time.
3. Doctor edits/deletes own messages within allowed rules.
4. Doctor pins clinical summary in chat.
5. Doctor authors SOAP clinical notes alongside call.

Chat transport:

- Socket handshake headers:
  - `x-user-id`
  - `x-user-role`
- Room join event required before real-time send.

## 2.4 End Consult and Closeout

1. Doctor marks consultation ended.
2. Doctor finalizes note (`status=final`).
3. Doctor optionally releases note to patient.
4. Workspace shifts to post-consult summary state.

Backend interactions:

- `PATCH /api/v1/telemedicine/consultations/:id/status` -> ended
- Clinical note endpoints under `/api/v1/telemedicine/consultations/:consultationId/notes`

## 3. Patient Journey

## 3.1 Pre-Consult

1. Patient opens appointment or telemedicine dashboard.
2. Patient opens consultation workspace.
3. Consent checkpoint is shown.
4. Embedded Jitsi call panel initializes.

## 3.2 In-Consult

1. Patient participates in call.
2. Patient uses chat timeline and composer.
3. Patient may receive safety guidance cards from flagged chat content.

## 3.3 Post-Consult

1. Patient sees consultation ended state.
2. Clinical notes section behavior:
   - Before eligibility: locked placeholder + reason copy.
   - After eligibility: final notes visible.
3. Patient cannot edit clinical notes.

## 4. Chat Interaction Contract (UI)

## 4.1 Connection lifecycle

1. Enter workspace -> initialize socket.
2. Send handshake headers from JWT-derived claims.
3. Emit `chat:room.join` with `{ roomId }`.
4. On successful ACK, enable composer and message actions.

## 4.2 Events to emit

- `chat:message.send`
- `chat:message.edit`
- `chat:message.delete`
- `chat:summary.pin`
- `chat:room.state`

## 4.3 Events to subscribe

- `chat:message.new`
- `chat:message.updated`
- `chat:message.deleted`
- `chat:summary.updated`
- `chat:safety.flagged`

## 4.4 ACK handling behavior

- Show pending state for sent message.
- On ACK success: mark delivered.
- On ACK failure: mark failed + retry affordance.

## 5. Failure and Recovery Interactions

1. Socket disconnected -> show reconnect banner.
2. Auto-reconnect with backoff.
3. Rejoin room on reconnect.
4. Retry queued unsent messages with dedupe guard.
5. If write denied (409), keep timeline visible and set composer read-only with backend reason.

## 6. Consent and Safety UX

- Consent checkpoint appears before call join.
- Safety flag event renders high-priority advisory card.
- Include immediate action shortcuts in safety card (call emergency services, contact support/clinic line).

## 7. UI State Rules Matrix

1. Consultation `scheduled`:
   - Doctor can start.
   - Patient joins waiting/in-progress shell depending on backend readiness.
2. Consultation `active`:
   - Call/chat fully available within backend constraints.
3. Consultation `ended` or `cancelled`:
   - Call controls disabled.
   - Chat history visible; composer behavior based on backend write policy.
   - Notes follow visibility policy.
