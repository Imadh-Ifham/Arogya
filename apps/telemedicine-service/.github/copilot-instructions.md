# Telemedicine Service Guidelines

## Scope

- Apply these instructions only inside this service directory.
- Work only in this service unless the user explicitly asks for cross-service edits.
- Progress incrementally: implement one tele-consultation capability at a time (for example rooms, calls, chat, symptoms, requirements).

## Architecture

- Keep feature code under `src/modules/<feature>/` using the same layered structure as consultation: `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.model.ts`, `*.types.ts`.
- Keep transport concerns in controllers, business rules in services, and persistence in repositories.
- Keep shared cross-feature code in `src/shared/`.
- Follow existing API mounting in `src/routes/index.ts` under `/api/v1`.
- See `README.md` for folder rationale and service-to-service guidance.

## Build And Validate

- Install deps: `pnpm install`
- Local dev: `pnpm dev`
- Type check: `pnpm typecheck`
- Build: `pnpm build`
- Production run: `pnpm start`
- There is no test script yet; when adding tests, document the command in `package.json` and `README.md`.

## Conventions

- Preserve ESM TypeScript style: keep `.js` extensions in local imports.
- Keep strict typing; avoid `any` and avoid bypassing `tsconfig.json` strict checks.
- Use the existing response envelope shape `{ success, message?, data? }`.
- Use `HttpError` and centralized middleware in `src/shared/http/error-handler.ts` for expected failures.
- Validate request input at controller boundaries before calling services.
- Reuse `src/shared/http/service-client.ts` and `src/shared/contracts/services.ts` for downstream service communication.
- Keep logging through `src/shared/logger.ts`; include useful structured fields.

## Environment And Runtime

- Required service URLs and MongoDB settings are defined in `.env.example` and validated in `src/config/env.ts`.
- Startup currently depends on database connectivity; account for that in local troubleshooting.
- Current request payload limit is configured in `src/app.ts` via `express.json({ limit: "1mb" })`; revisit if future features require larger payloads.

## Planning Style For New Features

- Start with API contract and types, then controller validation, service logic, repository/model changes, and finally route wiring.
- Prefer additive changes that do not break existing consultation flows.
- Update `README.md` when behavior or operational requirements change.
