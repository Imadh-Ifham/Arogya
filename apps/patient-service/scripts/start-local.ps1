$ErrorActionPreference = "Stop"

# =============================================================================
# Patient Service - start-local.ps1
# Start the patient-service locally on Windows, while ensuring its Docker
# PostgreSQL dependency is running first.
# =============================================================================
# Run from:
#   - Anywhere in PowerShell, for example:
#     D:\Arogya\apps\patient-service\scripts\start-local.ps1
#   - Or from this folder:
#     .\start-local.ps1
# What this script does:
#   1. Changes to the repo root.
#   2. Starts PostgreSQL only with:
#      docker compose -f infrastructure/docker/docker-compose.dev.yml up -d postgres
#   3. Changes to apps/patient-service.
#   4. Clears datasource/Kafka env vars in the current shell so application.yaml
#      defaults are used.
#   5. Runs the service locally with:
#      .\mvnw.cmd spring-boot:run
# Result:
#   - Postgres runs in Docker
#   - patient-service runs on your host machine at http://localhost:8082
# =============================================================================

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serviceRoot = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent (Split-Path -Parent $serviceRoot)

Set-Location $repoRoot

docker compose -f infrastructure/docker/docker-compose.dev.yml up -d postgres

Set-Location $serviceRoot

Remove-Item Env:SPRING_DATASOURCE_URL -ErrorAction Ignore
Remove-Item Env:SPRING_DATASOURCE_USERNAME -ErrorAction Ignore
Remove-Item Env:SPRING_DATASOURCE_PASSWORD -ErrorAction Ignore
Remove-Item Env:SPRING_KAFKA_BOOTSTRAP_SERVERS -ErrorAction Ignore

& .\mvnw.cmd spring-boot:run
