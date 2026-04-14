$ErrorActionPreference = "Stop"

# =============================================================================
# Patient Service - stop-docker.ps1
# Stop the Docker containers used by the patient-service helper flow.
# =============================================================================
# Run from:
#   - Anywhere in PowerShell, for example:
#     D:\Arogya\apps\patient-service\scripts\stop-docker.ps1
#   - Or from this folder:
#     .\stop-docker.ps1
# What this script does:
#   1. Changes to the repo root.
#   2. Stops these services with:
#      docker compose -f infrastructure/docker/docker-compose.dev.yml stop patient-service postgres
# Notes:
#   - This stops containers only.
#   - It does not remove containers, networks, or volumes.
# =============================================================================

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serviceRoot = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent (Split-Path -Parent $serviceRoot)

Set-Location $repoRoot

docker compose -f infrastructure/docker/docker-compose.dev.yml stop patient-service postgres
