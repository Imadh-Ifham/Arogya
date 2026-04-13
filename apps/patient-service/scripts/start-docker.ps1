$ErrorActionPreference = "Stop"

# =============================================================================
# Patient Service - start-docker.ps1
# Start the patient-service as a Docker container together with its PostgreSQL
# dependency.
# =============================================================================
# Run from:
#   - Anywhere in PowerShell, for example:
#     D:\Arogya\apps\patient-service\scripts\start-docker.ps1
#   - Or from this folder:
#     .\start-docker.ps1
# What this script does:
#   1. Changes to the repo root.
#   2. Starts PostgreSQL and patient-service with:
#      docker compose -f infrastructure/docker/docker-compose.dev.yml up -d postgres patient-service
# Notes:
#   - patient-service runs inside Docker on port 8082
#   - inside Docker it connects to postgres:5432
# =============================================================================

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serviceRoot = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent (Split-Path -Parent $serviceRoot)

Set-Location $repoRoot

docker compose -f infrastructure/docker/docker-compose.dev.yml up -d postgres patient-service
