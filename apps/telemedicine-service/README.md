# Telemedicine Service

Express + TypeScript microservice for telemedicine room and meeting lifecycle.

## Stack

- Node.js + Express 5
- TypeScript
- MongoDB (Mongoose)
- Pino logger

## Folder Structure

```text
src/
	app.ts
	server.ts
	config/
		env.ts
		database.ts
	routes/
		index.ts
	modules/
		clinical-notes/
			clinical-notes.routes.ts
			clinical-notes.controller.ts
			clinical-notes.service.ts
			clinical-notes.repository.ts
			clinical-notes.model.ts
			clinical-notes.types.ts
		consultation/
			consultation.routes.ts
			consultation.controller.ts
			consultation.service.ts
			consultation.repository.ts
			consultation.model.ts
			consultation.types.ts
	shared/
		http/
			error-handler.ts
			not-found.ts
		types/
			api-response.ts
```

## Why this structure

- `modules/*`: feature-based organization for business domains.
- `config/*`: runtime configuration and infrastructure wiring.
- This service is intentionally self-contained and does not call other services.
- `repository/service/controller/routes`: clear separation of persistence, business logic, and transport.

## Environment variables

See `.env.example` for all required values.

For Jitsi integration, configure `JITSI_BASE_URL` (default `https://meet.jit.si`). Room creation returns Jitsi metadata (`roomKey`, `jitsiRoomName`, `jitsiRoomUrl`) for frontend use.

## Run locally

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## Build and start

```bash
pnpm build
pnpm start
```

## API base path

- Health: `GET /api/v1/health`
- Room routes:
  - `POST /api/v1/consultations/rooms`
  - `PATCH /api/v1/consultations/rooms/:roomKey/reopen`
- Meeting routes:
  - `GET /api/v1/consultations`
  - `GET /api/v1/consultations/:id`
  - `POST /api/v1/consultations`
  - `PATCH /api/v1/consultations/:id/status`
- Clinical notes routes:
  - `POST /api/v1/telemedicine/consultations/:consultationId/notes`
  - `GET /api/v1/telemedicine/consultations/:consultationId/notes`
  - `GET /api/v1/telemedicine/consultations/:consultationId/notes/:noteId`
  - `PATCH /api/v1/telemedicine/consultations/:consultationId/notes/:noteId`
  - `PATCH /api/v1/telemedicine/consultations/:consultationId/notes/:noteId/release`
  - `DELETE /api/v1/telemedicine/consultations/:consultationId/notes/:noteId`

## API Example Docs

- `docs/room-api-examples.md`
- `docs/consultation-api-examples.md`
- `docs/chat-api-examples.md`
- `docs/clinical-notes-api-examples.md`

## UI Blueprint Docs

- `docs/ui/README.md`
- `docs/ui/business-and-product-plan.md`
- `docs/ui/user-journeys-and-interactions.md`
- `docs/ui/technical-architecture.md`
- `docs/ui/implementation-roadmap.md`

## Room lifecycle

- One room is created per doctor and patient pair.
- A room can host multiple scheduled meetings.
- Meeting identity is appointment-based (`appointmentId` is unique).
- Only doctor callers can start a meeting (`PATCH .../status` with `active`).
- Expired rooms reject meeting scheduling/start until explicitly reopened.
