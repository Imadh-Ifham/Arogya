# App Directory Guidelines

This directory contains application-level wiring for the web app. Keep this layer small and focused on configuration and integration.

## Responsibilities

- App root component (`App.tsx`)
- Global providers (Redux, Router, theme providers)
- Store configuration (`store.ts`)
- Root reducers (`reducers.ts`)
- Typed hooks (`hooks.ts`)

## Rules

- Avoid feature logic in `App.tsx`; route to modules instead.
- Keep the store setup centralized and stable.
- Use `useAppDispatch` and `useAppSelector` from `hooks.ts`.
- Only put shared, app-wide concerns here.

## Adding Routes

- Use React Router in `App.tsx`.
- Route paths should map to feature module pages.
- Keep route elements minimal and delegate logic to modules.

## Example Route

```tsx
<Route path="/appointments" element={<AppointmentsPage />} />
```
