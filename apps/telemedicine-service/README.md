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
		consultation/
			consultation.routes.ts
			consultation.controller.ts
			consultation.service.ts
			consultation.repository.ts
			consultation.model.ts
			consultation.types.ts
	shared/
		contracts/
			services.ts
			index.ts
		http/
			error-handler.ts
			not-found.ts
			service-client.ts
		types/
			api-response.ts
```

## Why this structure

- `modules/*`: feature-based organization for business domains.
- `config/*`: runtime configuration and infrastructure wiring.
- `shared/contracts/*`: typed interfaces for external service communication.
- `shared/http/service-client.ts`: reusable HTTP client for service-to-service calls.
- `repository/service/controller/routes`: clear separation of persistence, business logic, and transport.

## Service-to-service best practices

- Keep contract interfaces in `shared/contracts` and version them when fields evolve.
- Use one client per downstream service with timeouts and clear error mapping.
- Never pass raw `req.body` into persistence layer; validate and map in controller/service.
- Keep downstream URLs in environment config (`*_SERVICE_URL`) only.
- Use correlation/request IDs in logs when you integrate distributed tracing.

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

## Room lifecycle

- One room is created per doctor and patient pair.
- A room can host multiple scheduled meetings.
- Meeting identity is appointment-based (`appointmentId` is unique).
- Only doctor callers can start a meeting (`PATCH .../status` with `active`).
- Expired rooms reject meeting scheduling/start until explicitly reopened.
