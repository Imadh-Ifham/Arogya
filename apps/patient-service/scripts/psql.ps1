$ErrorActionPreference = "Stop"

# =============================================================================
# Patient Service - psql.ps1
# Open an interactive psql session inside the running Docker PostgreSQL
# container.
# =============================================================================
# Run from:
#   - Anywhere in PowerShell, for example:
#     D:\Arogya\apps\patient-service\scripts\psql.ps1
#   - Or from this folder:
#     .\psql.ps1
#   - To open a different database:
#     .\psql.ps1 postgres
# What this script does:
#   1. Uses the first argument as the database name, defaulting to:
#      arogya_patients
#   2. Runs:
#      docker exec -it arogya-postgres psql -U arogya -d <database>
# Notes:
#   - PostgreSQL container must already be running.
# =============================================================================

$database = if ($args.Length -gt 0 -and $args[0]) { $args[0] } else { "arogya_patients" }

docker exec -it arogya-postgres psql -U arogya -d $database
