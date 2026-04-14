# Implementation Roadmap

## 1. Delivery Strategy

Build in three phases with doctor-first priority, then patient parity, then hardening.

## 2. Phase A - Doctor Journey MVP

## 2.1 Goals

- Doctor can run consultation from one workspace.
- Doctor can start/end consultation.
- Doctor can use embedded Jitsi panel.
- Doctor can perform full chat + notes workflow.

## 2.2 Frontend backlog

1. Add role-based telemedicine routes in app shell.
2. Build telemedicine dashboard page and consultation workspace page.
3. Implement consultation API client and status actions.
4. Implement Jitsi panel lifecycle wrapper.
5. Implement chat panel with socket handshake/join and REST fallback history load.
6. Implement clinical notes panel (create/update/finalize/release/delete).
7. Add global connection banner and operation toasts.

## 2.3 Acceptance criteria

1. Doctor can open workspace from dashboard and load consultation details.
2. Start consultation action successfully updates status to active.
3. Chat send/edit/delete works with ACK feedback and safety flag rendering.
4. Note draft/final/release flows are functional.
5. End consultation updates status and transitions UI to post-consult state.

## 3. Phase B - Patient Experience

## 3.1 Goals

- Patient can join and participate in consultation safely.
- Patient sees role-appropriate capabilities and restrictions.

## 3.2 Frontend backlog

1. Add patient route guards and role-aware workspace controls.
2. Add locked placeholder UX for clinical notes before eligibility.
3. Add patient post-consult note visibility flow for final notes.
4. Ensure patient cannot access doctor-only controls (buttons hidden/disabled + guarded).
5. Add safety escalation card and emergency quick actions in chat panel.

## 3.3 Acceptance criteria

1. Patient can join call and chat when authorized.
2. Patient cannot trigger doctor-only actions.
3. Patient sees locked notes reason before eligibility.
4. Patient sees final notes after consultation ended and visibility conditions met.

## 4. Phase C - Reliability and Hardening

## 4.1 Goals

- Improve resilience and operational confidence.

## 4.2 Frontend backlog

1. Implement queued message retry on reconnect.
2. Add reconnect backoff strategy and deterministic resubscribe behavior.
3. Improve API/socket error copy and retries.
4. Add telemetry instrumentation for critical user journeys.
5. Add accessibility validation and keyboard coverage.

## 4.3 Acceptance criteria

1. Socket reconnect restores real-time updates without duplicate timeline entries.
2. Failed sends can be retried from UI and resolve correctly.
3. All critical failure states have recoverable UX.

## 5. Suggested File-by-File Implementation Sequence (apps/web)

1. `src/modules/telemedicine/api/rest.ts`
   - implement all telemedicine REST clients.
2. `src/modules/telemedicine/api/socket.ts`
   - implement socket adapter with handshake + event map.
3. `src/modules/telemedicine/models/*`
   - implement domain models and policy classes.
4. `src/modules/telemedicine/services/*`
   - implement orchestration services.
5. `src/modules/telemedicine/hooks/*`
   - expose view-model hooks.
6. `src/modules/telemedicine/components/*`
   - build presentation components.
7. `src/modules/telemedicine/pages/*`
   - compose pages.
8. `src/modules/telemedicine/index.ts`
   - export module API.
9. `src/app/reducers.ts`
   - register telemedicine reducer.
10. `src/app/App.tsx`
    - wire role-based routes.

## 6. QA Test Plan Summary

Functional tests:

1. Consultation status lifecycle by role.
2. Chat REST and socket parity.
3. Message edit/delete ownership and window behavior.
4. Clinical note visibility and role restrictions.

Resilience tests:

1. Disconnect/reconnect under active chat.
2. API failures and retry surfaces.
3. Session expiration and re-auth redirection.

Accessibility tests:

1. Keyboard navigation across workspace panes.
2. ARIA/live updates for connection and safety alerts.
3. Contrast and focus states.

## 7. Dependencies and Cross-team Contracts

- Backend team:
  - maintain route/event contract stability.
  - expose consistent error message text for UX mapping.
- Auth team:
  - guarantee token claims include role and user id.
- Product/clinical team:
  - approve consent copy, safety escalation copy, and note visibility language.

## 8. Definition of Done

- All phase acceptance criteria met.
- No unresolved P1/P2 defects for doctor and patient critical paths.
- Build/lint/typecheck pass in apps/web.
- Documentation updated for any contract deviations.
