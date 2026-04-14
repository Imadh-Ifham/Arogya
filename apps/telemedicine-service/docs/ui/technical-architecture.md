# Technical Architecture Plan

## 1. Frontend Architecture (apps/web)

Implement telemedicine as a feature module with OOP-oriented domain services and model classes.

Target structure:

- `src/modules/telemedicine/api/`
  - `rest.ts` (HTTP client functions)
  - `socket.ts` (Socket.IO adapter)
- `src/modules/telemedicine/models/`
  - `ConsultationSession.ts`
  - `ChatTimeline.ts`
  - `ClinicalNotePolicy.ts`
- `src/modules/telemedicine/services/`
  - `TelemedicineWorkspaceService.ts`
  - `ChatRealtimeService.ts`
  - `ClinicalNoteService.ts`
- `src/modules/telemedicine/hooks/`
  - `useTelemedicineWorkspace.ts`
  - `useChatRealtime.ts`
  - `useClinicalNotes.ts`
- `src/modules/telemedicine/components/`
  - `WorkspaceShell.tsx`
  - `JitsiPanel.tsx`
  - `ChatPanel.tsx`
  - `ClinicalNotesPanel.tsx`
  - `ConsultationStatusBar.tsx`
- `src/modules/telemedicine/pages/`
  - `TelemedicineDashboardPage.tsx`
  - `ConsultationWorkspacePage.tsx`

## 2. Identity and Auth Propagation

Identity source:

- JWT claims issued by auth-service.

Frontend mapping:

- `x-user-id` <- claim subject/user id.
- `x-user-role` <- normalized role (`doctor` or `patient`).

Apply these to:

1. All telemedicine REST requests.
2. Socket.IO handshake headers for chat connection.

## 3. REST Contract Map

Consultation:

- `GET /api/v1/telemedicine/consultations`
- `GET /api/v1/telemedicine/consultations/:id`
- `GET /api/v1/telemedicine/consultations/doctor/:doctorId`
- `GET /api/v1/telemedicine/consultations/patient/:patientId`
- `POST /api/v1/telemedicine/consultations`
- `PATCH /api/v1/telemedicine/consultations/:id/status`

Chat REST:

- `GET /api/v1/telemedicine/chats/rooms/:roomId/state`
- `PATCH /api/v1/telemedicine/chats/rooms/:roomId/summary`
- `GET /api/v1/telemedicine/chats/rooms/:roomId/messages`
- `POST /api/v1/telemedicine/chats/rooms/:roomId/messages`
- `PATCH /api/v1/telemedicine/chats/rooms/:roomId/messages/:messageId`
- `DELETE /api/v1/telemedicine/chats/rooms/:roomId/messages/:messageId`

Clinical Notes:

- `POST /api/v1/telemedicine/consultations/:consultationId/notes`
- `GET /api/v1/telemedicine/consultations/:consultationId/notes`
- `GET /api/v1/telemedicine/consultations/:consultationId/notes/:noteId`
- `PATCH /api/v1/telemedicine/consultations/:consultationId/notes/:noteId`
- `DELETE /api/v1/telemedicine/consultations/:consultationId/notes/:noteId`
- `PATCH /api/v1/telemedicine/consultations/:consultationId/notes/:noteId/release`

## 4. Socket.IO Chat Protocol

Handshake requirements:

- `x-user-id` header must exist.
- `x-user-role` must be `doctor` or `patient`.

Server-side behavior:

- Invalid handshake -> unauthorized event + disconnect.

Join flow:

1. Emit `chat:room.join` with `{ roomId }`.
2. Wait for ACK `{ success: true }` before enabling chat actions.

Client emit events:

- `chat:message.send` with `{ roomId, message }`
- `chat:message.edit` with `{ roomId, messageId, message }`
- `chat:message.delete` with `{ roomId, messageId }`
- `chat:summary.pin` with `{ roomId, summary }`
- `chat:room.state` with `{ roomId }`

Server push events:

- `chat:message.new`
- `chat:message.updated`
- `chat:message.deleted`
- `chat:summary.updated`
- `chat:safety.flagged`

ACK payload shape:

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

## 5. Jitsi Integration Plan

Integration mode:

- Embedded Jitsi component inside consultation workspace.

Inputs:

- `jitsiRoomName` and `jitsiRoomUrl` from room/consultation context.

Lifecycle:

1. Workspace mount -> initialize Jitsi panel container.
2. Consultation ended/cancelled -> call controls disabled; keep session summary visible.
3. Route leave -> destroy/unmount Jitsi instance and clean listeners.

Failure handling:

- Jitsi load timeout -> show fallback card with retry + open-link option.

## 6. State Management Strategy

Redux slices (telemedicine-focused):

- `telemedicine.session`
- `telemedicine.chat`
- `telemedicine.notes`
- `telemedicine.connection`

State constraints:

- Keep entities normalized by id for messages and notes.
- Keep pending operations list for optimistic chat sends.
- Keep connection status finite states: `connecting | connected | reconnecting | offline`.

## 7. Polling and Sync Strategy (v1)

Polling targets:

- Consultation status.
- Clinical note list/visibility changes.

Suggested intervals:

- Active workspace: 10-15s.
- Background tab: 30-60s.

Invalidation rules:

- After status change -> refresh consultation detail.
- After note mutations -> refresh notes list and detail cache.
- On reconnect -> pull latest chat history before replaying queued local actions.

## 8. Error and Edge Handling Contracts

1. 401 auth/header missing:
   - clear session and force relogin flow.
2. 403 participant mismatch:
   - show access denied + safe exit.
3. 409 write window expired:
   - set chat composer read-only with message from API.
4. 404 consultation/room/message missing:
   - show not-found view with return CTA.
5. Socket disconnect:
   - show persistent reconnect banner and retry state.

## 9. Observability and Analytics Events

Track client events:

- workspace_opened
- consultation_started
- consultation_ended
- jitsi_loaded / jitsi_failed
- chat_message_sent / failed / retried
- socket_reconnect_started / restored
- note_saved_draft / finalized / released
- patient_note_unlocked

Include metadata:

- role, consultationId, roomId, network state, operation latency.
