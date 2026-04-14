# Business and Product Plan

## 1. Problem Statement

Telemedicine experience currently has backend capabilities for rooms, consultations, chat, and clinical notes, but no unified UI operating model. This causes fragmented workflows and inconsistent user outcomes for doctors and patients.

## 2. Product Vision

Deliver a single, role-based telemedicine workspace where doctor and patient can complete the entire consultation lifecycle in one flow:

1. Join consultation.
2. Communicate over video and chat.
3. Capture and review clinical notes.
4. Complete consultation with clear post-visit outcomes.

## 3. Business Outcomes

### Doctor-facing outcomes

- Reduce time-to-start consultation.
- Reduce context switching between tools.
- Improve clinical documentation completion (SOAP notes finalized per consultation).
- Improve operational reliability for real-time communication.

### Patient-facing outcomes

- Faster, clearer join experience.
- Better confidence during care interaction (call + chat + guided states).
- Better continuity after visit through accessible final notes and summaries.

## 4. KPI Framework

### Adoption and efficiency

- Consultation join success rate: target >= 98%.
- Median time from workspace open to call connected: target <= 45s.
- Doctor completion rate for consultation status transition to ended: target >= 95%.

### Communication quality

- Chat send ACK success rate: target >= 99%.
- Socket reconnect recovery within 10 seconds: target >= 95%.
- Message delivery continuity after reconnect (no duplicates/loss in visible timeline): target 100% at UI layer.

### Clinical quality

- Final note completion rate per ended consultation: target >= 90%.
- Patient visibility of final notes after allowed conditions: target >= 99% reliability.

## 5. Personas and Core Jobs-to-be-Done

### Doctor

- Need to quickly begin a scheduled teleconsultation.
- Need a reliable call surface and synchronized chat.
- Need structured note authoring and release control.

### Patient

- Need simple and low-friction consultation entry.
- Need understandable in-consult messaging and status indicators.
- Need post-consult visibility of released/final notes.

## 6. Product Scope (v1)

Included:

- Telemedicine dashboard and consultation workspace routes.
- Embedded Jitsi call panel.
- Room-scoped real-time chat.
- Clinical notes UX with role-aware access.
- Consent checkpoint before joining call.
- Safety alert UX for chat safety flags.

Excluded:

- Multi-party consultations.
- Recording storage/playback workflows.
- Notification bus beyond polling.
- Advanced analytics dashboards.

## 7. Policy and Rule Alignment

- Doctor-only actions in UI must mirror backend enforcement:
  - Start consultation (`active`) via consultation status endpoint.
  - Create/update/delete/release clinical notes.
  - Pin room summary in chat.
- Patient restrictions must be transparent in UI via locked states and explanatory copy.
- Chat timeline remains visible at all times; write restrictions are backend-authoritative based on room lifecycle.

## 8. Risks and Mitigations

1. User expectation mismatch for always-open chat vs backend write window.
   - Mitigation: timeline remains visible; composer shows read-only reason on 409 responses.
2. Real-time instability on weak network.
   - Mitigation: reconnect strategy, queued pending sends, explicit connection banners.
3. Confusion around note visibility timing.
   - Mitigation: locked placeholders with explicit rule text and status-based unlocking cues.

## 9. Release Milestones

- M1: Doctor consultation workspace MVP.
- M2: Patient role experience parity.
- M3: Reliability and UX hardening.
