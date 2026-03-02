# =============================================================================
# Arogya — Makefile
# Infrastructure shortcuts for local development.
# =============================================================================
# Usage:
#   make dev      — Start all infrastructure services
#   make down     — Stop all infrastructure services (preserve data)
#   make reset    — Full teardown including all volumes (data lost!)
#   make topics   — Create all required Kafka topics
#   make status   — Show status of all running containers
#   make logs     — Tail logs for all infrastructure containers
#   make help     — Show this help message
# =============================================================================

.DEFAULT_GOAL := help

COMPOSE_FILE := infrastructure/docker/docker-compose.dev.yml
PROJECT_NAME := arogya
SHELL        := /usr/bin/env bash

.PHONY: dev down reset topics status logs help

# ---------------------------------------------------------------------------
# dev — Start local development infrastructure
# ---------------------------------------------------------------------------
dev:
	@echo ""
	@echo "==> Starting Arogya development infrastructure..."
	@bash scripts/start-dev.sh

# ---------------------------------------------------------------------------
# down — Stop services without removing volumes
# ---------------------------------------------------------------------------
down:
	@echo ""
	@echo "==> Stopping Arogya development infrastructure..."
	@bash scripts/stop-dev.sh

# ---------------------------------------------------------------------------
# reset — Full teardown: removes containers AND volumes (destructive!)
# ---------------------------------------------------------------------------
reset:
	@echo ""
	@echo "==> Resetting Arogya development environment (ALL DATA WILL BE LOST)..."
	@bash scripts/reset-dev.sh

# ---------------------------------------------------------------------------
# topics — Create Kafka topics required by all Arogya services
# ---------------------------------------------------------------------------
topics:
	@echo ""
	@echo "==> Creating Arogya Kafka topics..."
	@bash scripts/create-topics.sh

# ---------------------------------------------------------------------------
# status — Show container status
# ---------------------------------------------------------------------------
status:
	@echo ""
	@echo "==> Arogya container status:"
	@docker compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) ps

# ---------------------------------------------------------------------------
# logs — Tail logs for all infrastructure containers
# ---------------------------------------------------------------------------
logs:
	@docker compose -f $(COMPOSE_FILE) -p $(PROJECT_NAME) logs -f --tail=50

# ---------------------------------------------------------------------------
# help — Display available targets
# ---------------------------------------------------------------------------
help:
	@echo ""
	@echo "Arogya Makefile — available targets:"
	@echo ""
	@echo "  make dev      Start all infrastructure services (Postgres, Mongo, Kafka, etc.)"
	@echo "  make down     Stop all infrastructure services (data volumes preserved)"
	@echo "  make reset    Full teardown — removes containers AND all data volumes"
	@echo "  make topics   Create all required Kafka topics in the running broker"
	@echo "  make status   Show status of all Arogya Docker containers"
	@echo "  make logs     Tail logs for all infrastructure containers"
	@echo "  make help     Show this help message"
	@echo ""
