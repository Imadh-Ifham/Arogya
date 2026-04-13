#!/usr/bin/env bash
# =============================================================================
# Arogya — reset-dev.sh
# Completely tear down the dev environment, removing containers AND volumes.
# WARNING: All database data will be permanently deleted.
# =============================================================================
# Usage: bash scripts/reset-dev.sh
# =============================================================================

set -euo pipefail

COMPOSE_FILE="infrastructure/docker/docker-compose.dev.yml"
PROJECT_NAME="arogya"

RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# -- Resolve repo root --
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

echo ""
log_warn "============================================================"
log_warn "  WARNING: This will delete ALL containers and ALL volumes."
log_warn "  PostgreSQL, MongoDB, and Kafka data will be ERASED."
log_warn "============================================================"
echo ""

# -- Confirmation prompt --
read -r -p "Are you sure you want to reset the dev environment? [y/N] " confirm
if [[ "${confirm}" != "y" && "${confirm}" != "Y" ]]; then
  log_info "Reset cancelled. No changes made."
  exit 0
fi

echo ""
log_info "Stopping and removing all containers..."
docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" down --remove-orphans 2>/dev/null || true

log_info "Removing named volumes..."
docker volume rm \
  arogya-postgres-data \
  arogya-mongodb-data \
  arogya-kafka-data \
  arogya-zookeeper-data \
  arogya-zookeeper-log \
  2>/dev/null || log_warn "Some volumes were already removed or did not exist — continuing."

log_info "Pruning dangling images (optional cleanup)..."
docker image prune -f --filter "label=com.docker.compose.project=${PROJECT_NAME}" 2>/dev/null || true

echo ""
log_ok "Dev environment has been completely reset."
log_info "To start fresh: bash scripts/start-dev.sh"
