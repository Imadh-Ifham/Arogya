# Modules Directory Guidelines

This directory contains feature modules for the web app. Each module encapsulates its UI, API access, domain logic, and internal helpers so features remain isolated and easy to evolve.

## Recommended Structure (per module)

- `api/` HTTP clients and request/response mapping
- `components/` reusable, feature-specific UI components
- `pages/` route-level views
- `services/` domain services (classes) that orchestrate business logic
- `models/` domain models and value objects (classes and types)
- `hooks/` feature-specific hooks
- `utils/` small pure helpers (no side effects)
- `index.ts` public module exports

## OOP Principles (Required)

Use OOP where domain logic is involved (models, services, adapters). Keep UI components functional, and move business logic into classes.

- **Single Responsibility**: each class handles one concern only.
- **Encapsulation**: keep fields private, expose behavior via methods.
- **Abstraction**: depend on interfaces for services, not concrete implementations.
- **Open/Closed**: extend via new classes; avoid modifying existing logic unnecessarily.
- **Dependency Inversion**: inject dependencies into services (constructor parameters).

## Patterns to Follow

- Create a service class per feature that coordinates data flow.
- Use model classes for domain rules and validation.
- Keep API clients thin; map API DTOs into models before use.
- Avoid cross-module imports; communicate via public exports only.

## Example (Service + Model)

```ts
// modules/appointment/models/Appointment.ts
export class Appointment {
  constructor(
    private readonly id: string,
    private status: "scheduled" | "completed" | "canceled",
  ) {}

  getId() {
    return this.id;
  }

  isActive() {
    return this.status === "scheduled";
  }
}
```

```ts
// modules/appointment/services/AppointmentService.ts
import type { AppointmentApi } from "../api/AppointmentApi";
import { Appointment } from "../models/Appointment";

export class AppointmentService {
  constructor(private readonly api: AppointmentApi) {}

  async list() {
    const dto = await this.api.list();
    return dto.map((item) => new Appointment(item.id, item.status));
  }
}
```

## Developer Checklist

- Keep module boundaries clean.
- Add new folders only if the module truly needs them.
- Keep business logic out of React components.
- Update the module `index.ts` exports when adding new public types.
