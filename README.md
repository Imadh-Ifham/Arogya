# Arogya — Healthcare Microservices Platform

> **This repository contains infrastructure scaffolding and architecture only.**
> No application service code exists yet. Team members must initialize their
> respective services independently following the instructions in each service's
> `README.md`.

---

## Architecture Overview

```
                          ┌─────────────────────────────────────────────────────────────┐
                          │                         CLIENTS                             │
                          │           (Web Browser / Mobile App / Third-Party)          │
                          └────────────────────────────┬────────────────────────────────┘
                                                       │  HTTPS
                                                       ▼
                          ┌────────────────────────────────────────────────────────────┐
                          │                      API GATEWAY                           │
                          │               Node.js + TypeScript : 8080                  │
                          │         JWT validation, routing, rate-limiting              │
                          └──────┬────────┬────────┬────────────┬───────────────────────┘
                                 │        │        │            │
                    ┌────────────┘   ┌────┘   ┌───┘        ┌───┘
                    ▼                ▼        ▼            ▼
          ┌─────────────────┐ ┌────────────┐ ┌──────────────┐ ┌──────────────┐
          │  user-service   │ │appointment │ │ prescription │ │ telemedicine │
          │ Spring Boot:8081│ │   service  │ │   service    │ │   service    │
          │  PostgreSQL     │ │Spring:8082 │ │ Spring:8083  │ │  Node.js:8084│
          └─────────────────┘ │PostgreSQL  │ │ PostgreSQL + │ │  MongoDB     │
                              └────────────┘ │  MongoDB     │ └──────┬───────┘
                                             └──────────────┘        │
                                                                      │
           ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ KAFKA ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─
          │                                                            │          │
          │  appointment.created  ◄─── appointment-service            │          │
          │  prescription.issued  ◄─── prescription-service           │          │
          │  consultation.started ◄─── telemedicine-service ──────────┘          │
          │                                                                        │
           ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┬─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
                                              │
                                              ▼
                          ┌─────────────────────────────────────────────────────────────┐
                          │                   notification-service                      │
                          │             Node.js + TypeScript : 8085                     │
                          │      Consumes all topics → Email / SMS dispatch             │
                          └─────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
arogya/
├── apps/
│   ├── api-gateway/              Node.js + TypeScript  (Port 8080)
│   │   ├── Dockerfile            Template — uncomment when implemented
│   │   ├── .dockerignore
│   │   └── README.md             Full implementation guide
│   │
│   ├── user-service/             Spring Boot Java 17   (Port 8081)
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   └── README.md
│   │
│   ├── appointment-service/      Spring Boot Java 17   (Port 8082)
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   └── README.md
│   │
│   ├── prescription-service/     Spring Boot Java 17   (Port 8083)
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   └── README.md
│   │
│   ├── telemedicine-service/     Node.js + TypeScript  (Port 8084)
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   └── README.md
│   │
│   └── notification-service/     Node.js + TypeScript  (Port 8085)
│       ├── Dockerfile
│       ├── .dockerignore
│       └── README.md
│
├── infrastructure/
│   ├── docker/
│   │   └── docker-compose.dev.yml    Full dev stack (Postgres, Mongo, Kafka)
│   │
│   └── kubernetes/
│       ├── base/
│       │   ├── namespace.yaml
│       │   ├── kafka.yaml
│       │   ├── postgres.yaml
│       │   └── mongodb.yaml
│       └── services/
│           └── api-gateway/
│               ├── deployment.yaml
│               └── service.yaml
│
├── scripts/
│   ├── start-dev.sh          Start infrastructure services
│   ├── stop-dev.sh           Stop services (keep data)
│   ├── reset-dev.sh          Full teardown including volumes
│   └── create-topics.sh      Create all Kafka topics
│
├── Makefile                  Shortcut commands
└── README.md                 This file
```

---

## Infrastructure Explanation

### PostgreSQL

- **Image:** `postgres:16-alpine`
- **Internal address:** `postgres:5432`
- **Host address:** `localhost:5432`
- **Credentials:** user `arogya` / password `arogya_secret`
- **Databases to create manually:**
  - `arogya_users` — for user-service
  - `arogya_appointments` — for appointment-service
  - `arogya_prescriptions` — for prescription-service

### MongoDB

- **Image:** `mongo:7.0`
- **Internal address:** `mongodb:27017`
- **Host address:** `localhost:27017`
- **Credentials:** user `arogya` / password `arogya_secret`
- **Used by:** prescription-service, telemedicine-service

### Apache Kafka

- **Image:** `confluentinc/cp-kafka:7.6.0`
- **Internal address (service-to-service):** `kafka:9092`
- **Host address (from your machine):** `localhost:9093`
- **Single-node dev config** — not suitable for production
- **Zookeeper:** `zookeeper:2181`

### Kafka UI

- **Image:** `provectuslabs/kafka-ui:latest`
- **Access:** [http://localhost:8090](http://localhost:8090)
- Use this to browse topics, inspect messages, monitor consumer groups

---

## How to Start the Local Environment

### Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose plugin)
- Git
- `make` (available in Git Bash, WSL, macOS, Linux)

### Start infrastructure

```bash
# Option 1: Using Makefile (recommended)
make dev

# Option 2: Using the shell script directly
bash scripts/start-dev.sh
```

### Create Kafka topics

```bash
# Option 1
make topics

# Option 2
bash scripts/create-topics.sh
```

### Stop infrastructure

```bash
# Stop containers, keep data
make down

# Full reset — removes all data volumes
make reset
```

### Check status

```bash
make status
make logs
```

---

## How to Create a New Service

Each service directory in `apps/` contains a `README.md` with complete,
step-by-step instructions. Follow the guide below for a quick reference.

### Spring Boot Service (Java 17)

1. **Run Spring Initializr** at [https://start.spring.io](https://start.spring.io):
   - Project: Maven
   - Language: Java 17
   - Spring Boot: 3.x
   - Group: `com.arogya`
   - Artifact: `<service-name>`

2. **Add dependencies:**
   - Spring Web, Spring Data JPA, Spring Security
   - PostgreSQL Driver, Spring for Apache Kafka
   - Lombok, Spring Boot Actuator, Validation

3. **Extract** the ZIP into `apps/<service-name>/` so `pom.xml` is at the root.

4. **Create** `src/main/resources/application.yml` with environment variables.

5. **Build:**

   ```bash
   mvn clean package -DskipTests
   ```

6. **Uncomment the Dockerfile** template in `apps/<service-name>/Dockerfile`.

7. **Build the Docker image:**

   ```bash
   docker build -t arogya/<service-name>:latest apps/<service-name>/
   ```

8. **Uncomment the service block** in `infrastructure/docker/docker-compose.dev.yml`.

### Node.js + TypeScript Service

1. **Initialize** in `apps/<service-name>/`:

   ```bash
   npm init -y
   npm install typescript ts-node @types/node fastify kafkajs dotenv
   npm install --save-dev ts-node-dev nodemon
   npx tsc --init
   ```

2. **Add scripts** to `package.json`:

   ```json
   {
     "scripts": {
       "dev": "ts-node-dev --respawn src/main.ts",
       "build": "tsc -p tsconfig.json",
       "start": "node dist/main.js"
     }
   }
   ```

3. **Create** `src/main.ts` as the entry point.

4. **Uncomment the Dockerfile** template in `apps/<service-name>/Dockerfile`.

5. **Build the Docker image:**

   ```bash
   docker build -t arogya/<service-name>:latest apps/<service-name>/
   ```

6. **Uncomment the service block** in `infrastructure/docker/docker-compose.dev.yml`.

---

## Kafka Topic Naming Conventions

All Kafka topics follow the format:

```
<domain>.<event>
```

Rules:

- Always **lowercase**
- Dot-separated: `domain.event`
- No hyphens, no underscores in the topic name
- Domain matches the bounded context (not the service name)

### Registered Topics

| Topic                  | Domain       | Produced By          | Consumed By          |
| ---------------------- | ------------ | -------------------- | -------------------- |
| `appointment.created`  | appointment  | appointment-service  | notification-service |
| `prescription.issued`  | prescription | prescription-service | notification-service |
| `consultation.started` | consultation | telemedicine-service | notification-service |

### Adding a New Topic

1. Add a `create_topic "<domain>.<event>"` line to `scripts/create-topics.sh`
2. Document it in the table above
3. Run `make topics`

---

## Port Assignment Table

All services follow a sequential port scheme starting at `8080`.

| Service              | Technology          | Port | Database             |
| -------------------- | ------------------- | ---- | -------------------- |
| api-gateway          | Node.js TypeScript  | 8080 | —                    |
| user-service         | Spring Boot Java 17 | 8081 | PostgreSQL           |
| appointment-service  | Spring Boot Java 17 | 8082 | PostgreSQL           |
| prescription-service | Spring Boot Java 17 | 8083 | PostgreSQL + MongoDB |
| telemedicine-service | Node.js TypeScript  | 8084 | MongoDB              |
| notification-service | Node.js TypeScript  | 8085 | —                    |

### Infrastructure ports (host machine)

| Service    | Host Port | Notes                  |
| ---------- | --------- | ---------------------- |
| PostgreSQL | 5432      |                        |
| MongoDB    | 27017     |                        |
| Kafka      | 9093      | Internal: `kafka:9092` |
| Zookeeper  | 2181      |                        |
| Kafka UI   | 8090      | http://localhost:8090  |

---

## Rules for Team Collaboration

### Git Workflow

1. **Never commit directly to `main`.** Use feature branches.
2. Branch naming: `feat/<service>/<short-description>` or `infra/<short-description>`
3. Open a pull request and get at least one review before merging.
4. Keep commits atomic — one logical change per commit.

### Service Ownership

- Each service is the responsibility of one team.
- Infrastructure changes (`infrastructure/`) require cross-team review.
- Do not modify another team's service directory without their knowledge.

### Docker Image Naming

All images must follow: `arogya/<service-name>:<tag>`

Examples:

- `arogya/user-service:latest`
- `arogya/user-service:1.0.0`

### Environment Variables

- Never commit `.env` files or secrets.
- All secrets must be injected at runtime via Docker, Kubernetes Secrets, or a vault.
- Document every new environment variable in the service's `README.md`.

### Makefile and Scripts

- All infrastructure commands must be executable through `make`.
- Scripts must be safe: use `set -euo pipefail` and validate prerequisites.
- Destructive operations must include a confirmation prompt.

### Code Quality

- Spring Boot services must pass `mvn verify` before a PR can be merged.
- Node.js services must pass TypeScript compilation with `tsc --noEmit`.
- No commented-out application code in committed files (Dockerfiles exempt as templates).

---

## No Application Code Exists Yet

This repository is **infrastructure-first**. As of its creation:

- No `src/` directories exist in any service folder.
- No `pom.xml` or `package.json` files exist.
- The `Dockerfile` in each service is a **commented template** — it will not build until the service is implemented.
- The `docker-compose.dev.yml` has all application service blocks **commented out**.

**To begin implementing a service:**

1. Navigate to `apps/<service-name>/`
2. Read the `README.md` in that directory fully
3. Initialize the project using the instructions provided
4. When ready to containerize, uncomment and complete the `Dockerfile`
5. Uncomment the service block in `infrastructure/docker/docker-compose.dev.yml`
6. Submit a pull request

---

## Quick Reference

```bash
# Start the full dev infrastructure
make dev

# Create all Kafka topics
make topics

# Open Kafka UI in browser (Linux/macOS)
open http://localhost:8090

# Stop everything (keep data)
make down

# Wipe everything clean
make reset

# View running containers
make status

# Follow all logs
make logs
```
