#!/usr/bin/env bash
# =============================================================================
# Arogya — start-dev.sh
# Start the full local development infrastructure.
# =============================================================================
# Usage: bash scripts/start-dev.sh
# Requires: Docker, Docker Compose
# What this script runs:
#   1. docker compose -f infrastructure/docker/docker-compose.dev.yml -p arogya pull --ignore-pull-failures
#   2. docker compose -f infrastructure/docker/docker-compose.dev.yml -p arogya up -d \
#        postgres mongodb zookeeper kafka kafka-ui
#   3. docker inspect --format='{{.State.Health.Status}}' arogya-<service>
# Notes:
#   - This starts shared infrastructure only.
#   - It does not start patient-service or any other application container.
# =============================================================================

set -euo pipefail

COMPOSE_FILE="infrastructure/docker/docker-compose.dev.yml"
PROJECT_NAME="arogya"

# -- Colour helpers --
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }

# -- Check prerequisites --
if ! command -v docker &>/dev/null; then
  echo "[ERROR] Docker is not installed or not in PATH. Aborting."
  exit 1
fi

if ! docker info &>/dev/null; then
  echo "[ERROR] Docker daemon is not running. Start Docker and retry."
  exit 1
fi

# -- Resolve script to repo root --
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

log_info "Starting Arogya local dev environment..."
log_info "Compose file: ${COMPOSE_FILE}"
echo ""

# -- Pull latest images silently --
# Exact command:
# docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" pull --ignore-pull-failures
log_info "Pulling latest infrastructure images..."
docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" pull --ignore-pull-failures 2>/dev/null || true

# -- Start infrastructure --
# Exact command:
# docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" up -d \
#   postgres mongodb zookeeper kafka kafka-ui
log_info "Starting infrastructure services..."
docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" up -d \
  postgres \
  mongodb \
  zookeeper \
  kafka \
  kafka-ui

echo ""
log_info "Waiting for services to become healthy (up to 60s)..."

wait_for_healthy() {
  local service=$1
  local max_attempts=30
  local attempt=0
  while [ $attempt -lt $max_attempts ]; do
    # Exact command:
    # docker inspect --format='{{.State.Health.Status}}' "arogya-${service}"
    local health
    health=$(docker inspect --format='{{.State.Health.Status}}' "arogya-${service}" 2>/dev/null || echo "not-found")
    if [ "${health}" = "healthy" ]; then
      log_ok "${service} is healthy."
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  log_warn "${service} did not become healthy in time. Check logs: docker logs arogya-${service}"
}

wait_for_healthy "postgres"
wait_for_healthy "mongodb"
wait_for_healthy "zookeeper"
wait_for_healthy "kafka"

echo ""
log_ok "Infrastructure is up!"
echo ""
echo "  PostgreSQL  : localhost:5432  (user: arogya / pass: arogya_secret)"
echo "  MongoDB     : localhost:27017 (user: arogya / pass: arogya_secret)"
echo "  Kafka       : localhost:9093  (from host) | kafka:9092 (inside Docker)"
echo "  Kafka UI    : http://localhost:8090"
echo ""
log_info "To create Kafka topics, run: bash scripts/create-topics.sh"
log_info "To stop everything, run:     bash scripts/stop-dev.sh"
