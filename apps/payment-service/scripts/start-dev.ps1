$ErrorActionPreference = "Stop"

# =============================================================================
# Payment Service — start-dev.ps1
# Starts BOTH the payment-service and Stripe webhook listener in one go.
# =============================================================================
# Run from anywhere:
#   d:\Arogya\apps\payment-service\scripts\start-dev.ps1
# Or from scripts folder:
#   .\start-dev.ps1
#
# What this script does:
#   1. Starts Stripe CLI webhook forwarding in a background job
#   2. Starts payment-service with ts-node-dev (hot reload)
#   3. On Ctrl+C, stops both processes cleanly
#
# Prerequisites:
#   - Stripe CLI installed and authenticated (stripe login)
#   - npm install already run in apps/payment-service
#   - .env file populated with STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
# =============================================================================

$serviceRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Set-Location $serviceRoot

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Arogya Payment Service — Dev Startup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ─── 1. Start Stripe webhook listener ────────────────────────────────────────
Write-Host "[1/2] Starting Stripe webhook listener..." -ForegroundColor Yellow

$stripeJob = Start-Job -ScriptBlock {
    stripe listen --forward-to localhost:8087/api/payments/webhook 2>&1
}

# Give Stripe CLI a moment to connect
$ready = $false
for ($i = 0; $i -lt 10; $i++) {
    $output = Receive-Job $stripeJob -ErrorAction SilentlyContinue
    if ($output -match "Ready!") {
        $ready = $true
        break
    }
    Start-Sleep -Milliseconds 500
}

if ($ready) {
    Write-Host "[Stripe] Webhook listener is ready" -ForegroundColor Green
} else {
    Write-Host "[Stripe] Listener started (may take a moment to connect)" -ForegroundColor DarkYellow
}

Write-Host ""

# ─── 2. Start payment-service ────────────────────────────────────────────────
Write-Host "[2/2] Starting payment-service on port 8087..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Health:  http://localhost:8087/health" -ForegroundColor DarkGray
Write-Host "  Initiate: POST http://localhost:8087/api/payments/initiate" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Press Ctrl+C to stop both services" -ForegroundColor DarkGray
Write-Host "------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

try {
    npx ts-node-dev --respawn --transpile-only src/main.ts
}
finally {
    # ─── Cleanup ──────────────────────────────────────────────────────────────
    Write-Host ""
    Write-Host "[Cleanup] Stopping Stripe webhook listener..." -ForegroundColor Yellow
    Stop-Job $stripeJob -ErrorAction SilentlyContinue
    Remove-Job $stripeJob -Force -ErrorAction SilentlyContinue
    Write-Host "[Cleanup] All processes stopped" -ForegroundColor Green
}
