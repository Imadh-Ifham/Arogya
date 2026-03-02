#!/usr/bin/env bash
# =============================================================================
# Arogya — create-topics.sh
# Create all required Kafka topics in the running local Kafka broker.
# =============================================================================
# Usage: bash scripts/create-topics.sh
# Prerequisites: Kafka container (arogya-kafka) must be running.
#   Run: bash scripts/start-dev.sh  first.
# =============================================================================

set -euo pipefail

KAFKA_CONTAINER="arogya-kafka"
KAFKA_BOOTSTRAP="kafka:9092"

# Topic configuration (dev values — single partition, replication factor 1)
PARTITIONS=3
REPLICATION_FACTOR=1
RETENTION_MS=604800000  # 7 days in milliseconds

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# -- Resolve repo root --
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

# -- Check Kafka container is running --
if ! docker inspect --format='{{.State.Status}}' "${KAFKA_CONTAINER}" 2>/dev/null | grep -q "running"; then
  log_error "Kafka container '${KAFKA_CONTAINER}' is not running."
  log_error "Start the dev environment first: bash scripts/start-dev.sh"
  exit 1
fi

# -- Wait for Kafka to be ready --
log_info "Verifying Kafka broker is reachable..."
MAX_WAIT=30
WAITED=0
until docker exec "${KAFKA_CONTAINER}" kafka-broker-api-versions \
  --bootstrap-server "${KAFKA_BOOTSTRAP}" &>/dev/null; do
  if [ "${WAITED}" -ge "${MAX_WAIT}" ]; then
    log_error "Kafka broker did not become ready within ${MAX_WAIT}s."
    exit 1
  fi
  echo -n "."
  sleep 2
  WAITED=$((WAITED + 2))
done
echo ""
log_ok "Kafka broker is ready."
echo ""

# -- Helper function to create a topic --
create_topic() {
  local topic="$1"
  log_info "Creating topic: ${topic}"

  # Check if topic already exists
  if docker exec "${KAFKA_CONTAINER}" kafka-topics \
    --bootstrap-server "${KAFKA_BOOTSTRAP}" \
    --list 2>/dev/null | grep -q "^${topic}$"; then
    log_warn "Topic '${topic}' already exists — skipping."
    return 0
  fi

  docker exec "${KAFKA_CONTAINER}" kafka-topics \
    --bootstrap-server "${KAFKA_BOOTSTRAP}" \
    --create \
    --topic "${topic}" \
    --partitions "${PARTITIONS}" \
    --replication-factor "${REPLICATION_FACTOR}" \
    --config "retention.ms=${RETENTION_MS}" \
    --if-not-exists

  log_ok "Created: ${topic}  (partitions=${PARTITIONS}, replication=${REPLICATION_FACTOR})"
}

# =============================================================================
# CREATE AROGYA KAFKA TOPICS
# Naming convention: <domain>.<event>  (always lowercase, dot-separated)
# =============================================================================

echo "Creating Arogya Kafka topics..."
echo ""

# Appointment domain
create_topic "appointment.created"

# Prescription domain
create_topic "prescription.issued"

# Consultation / Telemedicine domain
create_topic "consultation.started"

echo ""
log_info "Listing all topics in broker:"
docker exec "${KAFKA_CONTAINER}" kafka-topics \
  --bootstrap-server "${KAFKA_BOOTSTRAP}" \
  --list 2>/dev/null | sort | sed 's/^/  /'

echo ""
log_ok "All Kafka topics created successfully."
log_info "View them in Kafka UI: http://localhost:8090"
