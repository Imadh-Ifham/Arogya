#!/usr/bin/env bash
# =============================================================================
# Arogya — stop-dev.sh
# Stop all running Arogya development Docker services.
# Data volumes are preserved.
# =============================================================================
# Usage: bash scripts/stop-dev.sh
# =============================================================================

set -euo pipefail

COMPOSE_FILE="infrastructure/docker/docker-compose.dev.yml"
PROJECT_NAME="arogya"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC}  $*"; }
log_ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }

# -- Resolve repo root --
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

log_info "Stopping Arogya local dev environment..."
log_info "Volumes and data will NOT be removed."
echo ""

docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" stop

echo ""
log_ok "All services stopped. Data volumes are intact."
log_info "To start again:      bash scripts/start-dev.sh"
log_info "To remove all data:  bash scripts/reset-dev.sh"
