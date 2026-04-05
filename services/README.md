`Auther - Imadh`

`Date - 5th April 2026`

## Services Directory

This directory is intended to house all backend microservices for the Arogya project. Each microservice is organized as a separate subfolder within this directory, following a modular architecture to ensure maintainability and scalability.

### Structure

- Each microservice (e.g., `auth-service`, `patient-service`, `doctor-service`, etc.) is contained in its own folder, with its own codebase, Dockerfile, and documentation.
- Shared backend utilities or libraries, if any, should also reside here or in a dedicated shared folder within `services`.

### Purpose

The `services` directory is distinct from the `apps` directory:

- **services/**: Contains all backend microservices (APIs, business logic, integrations, etc.).
- **apps/**: Contains frontend applications, such as the web app and mobile app, which interact with the backend services via APIs.

This separation ensures a clear distinction between frontend and backend code, making the project easier to develop, test, and deploy.

### Migration and Git History

During the migration of microservices into this directory, all commit history and individual contributions will be preserved. The migration process will follow best practices with Git to ensure:

- Complete retention of each microservice's commit history
- Accurate attribution of all past contributions
- No loss or corruption of historical data

This approach guarantees that the project's development history remains intact, supporting transparency and proper credit for all contributors.
