# Redux Store Guidelines

This directory contains all Redux state management for the web app. Keep everything feature-based and predictable so new modules are easy to add and maintain.

## Folder Structure

- One folder per feature domain: e.g., `appointment/`, `doctor/`
- Each feature may include:
  - `*.slice.ts` for state, reducers, and actions
  - `*.thunk.ts` for async logic (API calls, side effects)
  - `*.types.ts` for domain types (optional)

## Best Practices

- Prefer Redux Toolkit (`createSlice`, `createAsyncThunk`) over handwritten reducers.
- Keep thunks small and focused on one API call or async action.
- Store only UI-safe, serializable data in state (no class instances, no functions).
- Keep slice state minimal; compute derived values in selectors when possible.
- Use `loading` and `error` fields for async state handling.
- Avoid cross-slice imports; share types via a common `types` module if needed.

## Adding a New Feature

1. Create a new folder under `src/store/<feature>/`.
2. Add `<feature>.slice.ts` and `<feature>.thunk.ts`.
3. Export the reducer from the slice file.
4. Register the reducer in `src/app/reducers.ts`.
5. Use typed hooks from `src/app/hooks.ts` when wiring components.

## Conventions

- Slice name should match folder name (e.g., `appointment`).
- Action names should be explicit and scoped to the slice.
- Prefer `selectX` and `clearXError` naming for reducers.

## Example File Naming

- `src/store/appointment/appointment.slice.ts`
- `src/store/appointment/appointment.thunk.ts`
- `src/store/doctor/doctor.slice.ts`
- `src/store/doctor/doctor.thunk.ts`
