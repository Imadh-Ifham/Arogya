# Patient Service Database Guide

## Purpose

This document explains the database setup for `patient-service` only:

- what was implemented
- how the schema is managed
- how Flyway is used
- what commands to run locally
- how to reset the database safely
- how to create future schema changes

This guide is scoped to:

- `D:\Arogya\apps\patient-service`

It does not cover auth-service or any other microservice.

---

## Current Setup

The patient service uses:

- PostgreSQL
- Spring Boot
- Spring Data JPA
- Flyway for schema migrations
- SQL-first schema management

The database owned by this service is:

- `arogya_patients`

The local host connection used by the service is:

- `jdbc:postgresql://localhost:5433/arogya_patients`

The Docker container connection used inside Docker is:

- `jdbc:postgresql://postgres:5432/arogya_patients`

---

## Why This Approach Was Chosen

We are using:

- Flyway + SQL migrations + JPA entities

This gives:

- direct SQL control over schema
- repeatable and versioned migrations
- no Prisma setup
- no hidden Hibernate schema generation
- safe startup behavior when the app restarts

Hibernate is configured to validate the schema, not create or mutate it.

That means:

- Flyway creates/updates schema
- JPA checks that Java entities match the real database structure

---

## Implemented Files

### Configuration

- [application.yaml](/D:/Arogya/apps/patient-service/src/main/resources/application.yaml)
- [pom.xml](/D:/Arogya/apps/patient-service/pom.xml)

### First migration

- [V1__init_patient_schema.sql](/D:/Arogya/apps/patient-service/src/main/resources/db/migration/V1__init_patient_schema.sql)

### Matching JPA entities

- [Patient.java](/D:/Arogya/apps/patient-service/src/main/java/com/arogya/patient/domain/Patient.java)
- [PatientProfile.java](/D:/Arogya/apps/patient-service/src/main/java/com/arogya/patient/domain/PatientProfile.java)
- [PatientDocument.java](/D:/Arogya/apps/patient-service/src/main/java/com/arogya/patient/domain/PatientDocument.java)

### Helper scripts

- [start-local.ps1](/D:/Arogya/apps/patient-service/scripts/start-local.ps1)
- [start-docker.ps1](/D:/Arogya/apps/patient-service/scripts/start-docker.ps1)
- [stop-docker.ps1](/D:/Arogya/apps/patient-service/scripts/stop-docker.ps1)
- [psql.ps1](/D:/Arogya/apps/patient-service/scripts/psql.ps1)

---

## Dependencies Used

These are the important database-related dependencies in `pom.xml`:

- `spring-boot-starter-data-jpa`
- `postgresql`
- `flyway-core`
- `flyway-database-postgresql`

What each one does:

- `spring-boot-starter-data-jpa`
  - gives JPA/Hibernate support
- `postgresql`
  - PostgreSQL JDBC driver
- `flyway-core`
  - migration engine
- `flyway-database-postgresql`
  - PostgreSQL-specific Flyway support

---

## application.yaml Behavior

Current important config:

```yaml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5433/arogya_patients}
    username: ${SPRING_DATASOURCE_USERNAME:arogya}
    password: ${SPRING_DATASOURCE_PASSWORD:arogya_secret}

  jpa:
    hibernate:
      ddl-auto: validate

  flyway:
    enabled: true
```

What this means:

- Spring connects to the patient database
- Flyway runs migrations automatically on startup
- Hibernate validates the schema after Flyway runs
- Hibernate does not auto-create or alter tables

This is intentional.

---

## Database Design

The current schema is split into 3 tables.

### 1. `patients`

Purpose:

- stores the patient identity inside this service
- links the patient to the auth-service user

Key fields:

- `id`
- `auth_user_id`
- `created_at`

### 2. `patient_profiles`

Purpose:

- stores profile details and medical summary

Key fields:

- `date_of_birth`
- `gender`
- `blood_group`
- `height_cm`
- `weight_kg`
- `street_address`
- `city`
- `emergency_contact_name`
- `emergency_contact_phone`
- `emergency_contact_relationship`
- `known_allergies`
- `medical_conditions`
- `current_medications`

Relationship:

- one profile per patient

### 3. `patient_documents`

Purpose:

- stores uploaded document metadata
- supports zero, one, or many documents per patient

Key fields:

- `patient_id`
- `file_url`
- `description`
- `uploaded_at`

Relationship:

- many documents per patient

---

## Why The Schema Is Split

This matches the patient flow:

1. auth-service creates the auth user
2. patient-service creates the patient record with `auth_user_id`
3. patient profile is created or updated
4. documents can be uploaded later

This avoids:

- putting documents in the profile table
- forcing optional uploads during profile creation
- making one large table harder to maintain

---

## How Flyway Works Here

Flyway scans:

- `src/main/resources/db/migration`

Migration file naming pattern:

```text
V1__init_patient_schema.sql
V2__something.sql
V3__something_else.sql
```

Rules:

- start with `V`
- use an increasing version number
- use double underscore `__`
- keep names descriptive

On service startup, Flyway:

1. checks `flyway_schema_history`
2. finds migrations not applied yet
3. runs them in order
4. records success

This means:

- the same migration does not run again once already applied
- you do not manually rerun old migrations

---

## What Happens On Startup

When you run `patient-service`:

1. Spring connects to `arogya_patients`
2. Flyway runs pending migrations
3. Hibernate validates entities against the database
4. application starts if schema matches

If schema does not match entity definitions:

- startup fails

That is good. It catches schema drift early.

---

## First-Time Setup

Use this when you want a clean local setup.

### 1. Reset Docker DB state

From repo root:

```powershell
cd D:\Arogya
docker compose -f infrastructure/docker/docker-compose.dev.yml down -v
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d postgres
```

What this does:

- stops containers
- removes volumes
- recreates PostgreSQL cleanly

### 2. Start patient-service locally

From the service root:

```powershell
cd D:\Arogya\apps\patient-service
.\mvnw.cmd spring-boot:run
```

Or use the helper script:

```powershell
D:\Arogya\apps\patient-service\scripts\start-local.ps1
```

### 3. Verify tables

Open `psql`:

```powershell
D:\Arogya\apps\patient-service\scripts\psql.ps1
```

Then run:

```sql
\dt
```

Expected tables:

- `patients`
- `patient_profiles`
- `patient_documents`
- `flyway_schema_history`

---

## Daily Workflow

### Start DB + run service locally

```powershell
D:\Arogya\apps\patient-service\scripts\start-local.ps1
```

This:

- starts Docker Postgres
- clears conflicting DB env vars
- runs Spring Boot locally

### Start service in Docker instead

```powershell
D:\Arogya\apps\patient-service\scripts\start-docker.ps1
```

This:

- starts PostgreSQL
- starts `patient-service` as a Docker container

### Stop patient-service Docker flow

```powershell
D:\Arogya\apps\patient-service\scripts\stop-docker.ps1
```

### Open database console

Default patient DB:

```powershell
D:\Arogya\apps\patient-service\scripts\psql.ps1
```

Another DB:

```powershell
D:\Arogya\apps\patient-service\scripts\psql.ps1 postgres
```

---

## How To Create Future Schema Changes

Never edit an old migration that has already been applied in a shared or persistent environment.

Instead:

1. create a new migration file
2. write the SQL change there
3. restart the service
4. Flyway applies the new migration automatically

### Example: add a profile image URL

Create:

```text
src/main/resources/db/migration/V2__add_profile_image_url.sql
```

Example content:

```sql
ALTER TABLE patient_profiles
ADD COLUMN profile_image_url TEXT;
```

Then restart:

```powershell
cd D:\Arogya\apps\patient-service
.\mvnw.cmd spring-boot:run
```

Flyway will apply `V2`.

Then update the matching JPA entity:

- add the field in `PatientProfile.java`

---

## Rules For Future Migrations

### Do this

- create a new `Vx__...sql` file for every schema change
- keep migrations small and specific
- update JPA entities to match the SQL
- restart the app and let Flyway run

### Do not do this

- do not modify `V1__init_patient_schema.sql` after it has already been used on an active DB
- do not rely on `ddl-auto: update`
- do not manually create tables in `psql` unless you are debugging
- do not mix schema changes into Docker init scripts

---

## When You Need A Full Reset

Only do this when:

- local schema got messy
- you want to replay migrations from zero
- you changed an early migration locally before anyone else depends on it

Commands:

```powershell
cd D:\Arogya
docker compose -f infrastructure/docker/docker-compose.dev.yml down -v
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d postgres
cd apps\patient-service
.\mvnw.cmd spring-boot:run
```

This gives you:

- fresh DB
- fresh Flyway history
- all migrations replayed from scratch

---

## When You Do Not Need A Reset

If you only added a new migration like `V2`, `V3`, or `V4`, do not destroy the database.

Just:

```powershell
cd D:\Arogya\apps\patient-service
.\mvnw.cmd spring-boot:run
```

Flyway will apply only the new migrations.

---

## How To Inspect Flyway State

Open the DB:

```powershell
D:\Arogya\apps\patient-service\scripts\psql.ps1
```

Check migration history:

```sql
SELECT installed_rank, version, description, success
FROM flyway_schema_history
ORDER BY installed_rank;
```

This tells you:

- which migrations ran
- in what order
- whether they succeeded

---

## How To Inspect Tables

Inside `psql`:

List tables:

```sql
\dt
```

Describe a table:

```sql
\d patients
\d patient_profiles
\d patient_documents
```

---

## Auth ID Handling

`patient-service` does not generate the auth ID.

Expected flow:

1. auth-service creates the user
2. auth-service or gateway passes the auth user ID to patient-service
3. patient-service stores that value in:
   - `patients.auth_user_id`

So this service must receive `auth_user_id` from the request layer later.

This document covers schema only, not the controller/service implementation for that flow.

---

## Current Limitations

What is implemented now:

- database schema
- Flyway migration system
- matching JPA entities
- startup validation

What is not implemented yet:

- repositories
- service layer
- controllers
- DTOs
- document upload storage integration
- auth/JWT extraction

So the database is ready, but the business API still needs to be built.

---

## Recommended Safe Process

### For normal development

1. keep PostgreSQL running
2. add new migration files for schema changes
3. update entities
4. rerun service

### For major local cleanup

1. stop containers
2. remove volumes
3. restart Postgres
4. rerun service

---

## Quick Command Reference

### Start Postgres only

```powershell
cd D:\Arogya
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d postgres
```

### Start patient-service locally

```powershell
cd D:\Arogya\apps\patient-service
.\mvnw.cmd spring-boot:run
```

### Start patient-service locally with helper

```powershell
D:\Arogya\apps\patient-service\scripts\start-local.ps1
```

### Start patient-service in Docker

```powershell
D:\Arogya\apps\patient-service\scripts\start-docker.ps1
```

### Stop patient-service Docker flow

```powershell
D:\Arogya\apps\patient-service\scripts\stop-docker.ps1
```

### Open patient DB in psql

```powershell
D:\Arogya\apps\patient-service\scripts\psql.ps1
```

### Full local DB reset

```powershell
cd D:\Arogya
docker compose -f infrastructure/docker/docker-compose.dev.yml down -v
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d postgres
```

---

## Final Rule

For this service:

- SQL owns the schema
- Flyway owns schema changes
- JPA validates the mapping
- PostgreSQL stores the data

Do not put schema ownership anywhere else.
