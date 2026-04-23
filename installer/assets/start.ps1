#Requires -Version 5.1
<#
    start.ps1 — launches the Funeral Home Prototype Stripe Integration demo.
    - Starts Stripe CLI forwarder (captures webhook signing secret from its output).
    - Starts the Node API (which also serves the built web app).
    - Opens the browser to the demo URL.
    Intended to be invoked from the installed Start Menu / Desktop shortcut.
#>

$ErrorActionPreference = 'Stop'

$AppRoot   = $PSScriptRoot
$ConfigPs1 = Join-Path $AppRoot 'app.config.ps1'
$NodeExe   = Join-Path $AppRoot 'node\node.exe'
$StripeExe = Join-Path $AppRoot 'stripe\stripe.exe'
$ApiEntry  = Join-Path $AppRoot 'app\api\dist\index.js'
$WebDist   = Join-Path $AppRoot 'app\web\dist'

$DataRoot  = Join-Path $env:LOCALAPPDATA 'Insight AI\Funeral Home Prototype'
$DataDir   = Join-Path $DataRoot 'data'
$LogDir    = Join-Path $DataRoot 'logs'
$PidFile   = Join-Path $DataRoot 'run.pids'

$ApiPort   = 3001
$AppUrl    = "http://localhost:$ApiPort"

function Write-Step { param([string]$msg) Write-Host "[start] $msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$msg) Write-Host "[start] $msg" -ForegroundColor Green }
function Write-Err  { param([string]$msg) Write-Host "[start] $msg" -ForegroundColor Red }

function Test-PortInUse {
    param([int]$Port)
    try {
        $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop
        return $listeners.Count -gt 0
    } catch {
        return $false
    }
}

function Wait-ForHealth {
    param([int]$Port, [int]$TimeoutSec = 30)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -eq 200) { return $true }
        } catch {}
        Start-Sleep -Milliseconds 500
    }
    return $false
}

New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir  | Out-Null

# Idempotent launch — if the API is already up, just open the browser.
if (Test-PortInUse -Port $ApiPort) {
    Write-Ok "Already running on port $ApiPort. Opening browser."
    Start-Process $AppUrl
    Start-Sleep -Seconds 2
    exit 0
}

if (-not (Test-Path $ConfigPs1)) {
    Write-Err "Missing $ConfigPs1. The installer did not complete correctly."
    Read-Host 'Press Enter to exit'; exit 1
}
. $ConfigPs1   # defines $script:StripeSecretKey

if (-not $script:StripeSecretKey -or $script:StripeSecretKey -notlike 'sk_test_*') {
    Write-Err "Stripe secret key is missing or not a test-mode key. Aborting."
    Read-Host 'Press Enter to exit'; exit 1
}

foreach ($p in @($NodeExe, $StripeExe, $ApiEntry)) {
    if (-not (Test-Path $p)) { Write-Err "Missing required file: $p"; Read-Host 'Press Enter to exit'; exit 1 }
}

# --- 1) Start the Stripe CLI forwarder ---------------------------------------
Write-Step 'Starting Stripe CLI webhook forwarder...'
$stripeOut = Join-Path $LogDir 'stripe.out.log'
$stripeErr = Join-Path $LogDir 'stripe.err.log'
Remove-Item $stripeOut, $stripeErr -ErrorAction SilentlyContinue

$stripeArgs = @(
    'listen',
    '--api-key', $script:StripeSecretKey,
    '--forward-to', "$AppUrl/webhook"
)

$stripeProc = Start-Process -FilePath $StripeExe `
    -ArgumentList $stripeArgs `
    -WorkingDirectory $AppRoot `
    -NoNewWindow `
    -RedirectStandardOutput $stripeOut `
    -RedirectStandardError $stripeErr `
    -PassThru

Write-Step 'Waiting for webhook signing secret...'
$whsec = $null
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Milliseconds 500
    foreach ($f in @($stripeErr, $stripeOut)) {
        if (Test-Path $f) {
            $content = Get-Content $f -Raw -ErrorAction SilentlyContinue
            if ($content -and ($content -match '(whsec_[A-Za-z0-9]+)')) {
                $whsec = $Matches[1]; break
            }
        }
    }
    if ($whsec) { break }
    if ($stripeProc.HasExited) {
        Write-Err "Stripe CLI exited unexpectedly. See $stripeErr."
        Read-Host 'Press Enter to exit'; exit 1
    }
}

if (-not $whsec) {
    Write-Err "Timed out waiting for Stripe webhook secret. Check $stripeErr."
    try { Stop-Process -Id $stripeProc.Id -Force -ErrorAction SilentlyContinue } catch {}
    Read-Host 'Press Enter to exit'; exit 1
}

Write-Ok "Webhook secret captured."

# --- 2) Start the Node API (also serves the built web app) -------------------
Write-Step "Starting API on port $ApiPort..."
$apiOut = Join-Path $LogDir 'api.out.log'
$apiErr = Join-Path $LogDir 'api.err.log'
Remove-Item $apiOut, $apiErr -ErrorAction SilentlyContinue

$apiEnv = @{
    STRIPE_SECRET_KEY     = $script:StripeSecretKey
    STRIPE_WEBHOOK_SECRET = $whsec
    PORT                  = "$ApiPort"
    DATA_DIR              = $DataDir
    WEB_DIST_DIR          = $WebDist
}
foreach ($k in $apiEnv.Keys) { Set-Item -Path "env:$k" -Value $apiEnv[$k] }

$apiProc = Start-Process -FilePath $NodeExe `
    -ArgumentList @('dist\index.js') `
    -WorkingDirectory (Join-Path $AppRoot 'app\api') `
    -NoNewWindow `
    -RedirectStandardOutput $apiOut `
    -RedirectStandardError $apiErr `
    -PassThru

# Record PIDs so stop.ps1 can find them.
@{ StripePid = $stripeProc.Id; ApiPid = $apiProc.Id } |
    ConvertTo-Json | Out-File -FilePath $PidFile -Encoding utf8 -Force

if (-not (Wait-ForHealth -Port $ApiPort -TimeoutSec 30)) {
    Write-Err "API did not become healthy. Check $apiErr."
    try { Stop-Process -Id $stripeProc.Id -Force -ErrorAction SilentlyContinue } catch {}
    try { Stop-Process -Id $apiProc.Id    -Force -ErrorAction SilentlyContinue } catch {}
    Read-Host 'Press Enter to exit'; exit 1
}

Write-Ok "API is healthy on port $ApiPort."

# --- 3) Open the browser ------------------------------------------------------
Start-Process $AppUrl
Write-Ok "Opened $AppUrl in your default browser."
Write-Host ""
Write-Host "The demo is now running. Close this window or use 'Stop Funeral Home Prototype' to shut it down." -ForegroundColor Yellow
Write-Host ""
Write-Host "Logs: $LogDir"
Write-Host "Data: $DataDir"
Write-Host ""

# Keep the window open so the user sees status. Closing it does NOT stop the
# background services — use the Stop shortcut for a clean shutdown.
Read-Host 'Press Enter to close this window'
