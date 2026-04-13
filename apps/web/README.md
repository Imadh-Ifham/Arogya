# Project Structure & Guidelines – Summary

## 1. App Directory (`src/app/`)

- Contains application-level wiring: root component, global providers (Redux, Router), store config, reducers, and typed hooks.
- **Rules:**
  - No feature logic in `App.tsx`; route to modules.
  - Centralize store setup.
  - Use `useAppDispatch` and `useAppSelector` from `hooks.ts`.
  - Only app-wide concerns belong here.
- **Routing:** Use React Router in `App.tsx`, mapping paths to module pages. Keep route elements minimal.

---

## 2. Store Directory (`src/store/`)

- All Redux state management lives here, organized by feature.
- **Structure:**
  - One folder per feature (e.g., `appointment/`, `doctor/`).
  - Each feature: `*.slice.ts` (state/actions), `*.thunk.ts` (async logic), `*.types.ts` (optional).
- **Best Practices:**
  - Use Redux Toolkit (`createSlice`, `createAsyncThunk`).
  - Keep thunks focused and state serializable.
  - Use `loading`/`error` fields for async state.
  - Avoid cross-slice imports.
- **Adding Features:** Create a new folder, add slice/thunk, export reducer, register in `reducers.ts`, use typed hooks.

---

## 3. Modules Directory (`src/modules/`)

- Each feature module encapsulates UI, API, domain logic, and helpers.
- **Recommended Structure:**
  - `api/`, `components/`, `pages/`, `services/`, `models/`, `hooks/`, `utils/`, `index.ts`
- **OOP Principles:**
  - Use classes for domain logic (models, services).
  - Follow SOLID: single responsibility, encapsulation, abstraction, open/closed, dependency inversion.
- **Patterns:**
  - Service class per feature, model classes for domain rules, thin API clients, no cross-module imports.
- **Checklist:** Keep boundaries clean, add folders only as needed, keep business logic out of React components, update `index.ts` exports.

---

## General Recommendations

- Keep each layer focused on its responsibility.
- Use OOP for business/domain logic, functional components for UI.
- Maintain clean boundaries between app, store, and modules.
- Follow naming and structure conventions for easy onboarding and maintenance.
