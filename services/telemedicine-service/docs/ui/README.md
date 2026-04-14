# Telemedicine UI Blueprint

This folder contains the implementation blueprint for the full telemedicine UI across doctor and patient roles, aligned with the current telemedicine-service backend.

## Scope

- Role-based single web app (doctor + patient).
- Journey entry via appointment details and telemedicine dashboard.
- Embedded Jitsi consultation experience.
- Socket.IO chat with authenticated handshake and real-time updates.
- Clinical notes with doctor-authoring and patient visibility rules.
- Product/business goals, UX flows, technical contracts, and phased implementation plan.

## Documents

1. [business-and-product-plan.md](./business-and-product-plan.md)
   - Business case, product goals, KPIs, and role outcomes.
2. [user-journeys-and-interactions.md](./user-journeys-and-interactions.md)
   - Doctor and patient journeys with step-level UI/API behavior.
3. [technical-architecture.md](./technical-architecture.md)
   - Frontend architecture, REST/socket contracts, Jitsi integration, state model, and error handling.
4. [implementation-roadmap.md](./implementation-roadmap.md)
   - Sprint plan, backlog, acceptance criteria, and test strategy.

## Backend Alignment Sources

- Consultation routes: `src/modules/consultation/consultation.routes.ts`
- Room routes: `src/modules/rooms/room.routes.ts`
- Chat routes: `src/modules/chat/chat.routes.ts`
- Chat socket contract: `src/modules/chat/chat.socket.ts`
- Chat business constraints: `src/modules/chat/chat.service.ts`
- Clinical notes routes: `src/modules/clinical-notes/clinical-notes.routes.ts`
- Clinical notes business constraints: `src/modules/clinical-notes/clinical-notes.service.ts`

## Decision Snapshot (Locked)

- One app with role-based routes.
- Video calls: embedded Jitsi in consultation workspace.
- Chat: Socket.IO with handshake headers (`x-user-id`, `x-user-role`).
- Realtime resilience: auto-reconnect + banner + retry queue.
- Non-chat realtime: polling in v1.
- Clinical notes: doctor-only authoring; patient sees locked placeholders until allowed.
- Implementation order: doctor journey first, then patient journey.
