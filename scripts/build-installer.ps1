#Requires -Version 5.1
<#
    Build the Funeral Home Prototype Stripe Integration Windows installer.

    Usage:
        pwsh .\scripts\build-installer.ps1                  # full build
        pwsh .\scripts\build-installer.ps1 -SkipBuild       # reuse existing api/web builds
        pwsh .\scripts\build-installer.ps1 -SkipDownload    # reuse cached Node + Stripe CLI
        pwsh .\scripts\build-installer.ps1 -SkipInstaller   # stop after staging (skip iscc)

    Produces: dist-installer\FuneralHomePrototype-Setup-<version>.exe
#>

[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [switch]$SkipDownload,
    [switch]$SkipInstaller,
    [string]$NodeVersion    = '20.18.0',
    [string]$StripeVersion  = '1.22.0'
)

$ErrorActionPreference = 'Stop'

# --- Paths -------------------------------------------------------------------
$RepoRoot       = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

# Single source of truth for the app version: the root package.json.
# Bump that file and every artifact this script produces (the standalone API
# package.json, the README banner, and the installer filename) follows.
$RootPkgPath = Join-Path $RepoRoot 'package.json'
if (-not (Test-Path $RootPkgPath)) { Die "Cannot find $RootPkgPath" }
$AppVersion = ((Get-Content $RootPkgPath -Raw | ConvertFrom-Json).version)
if (-not $AppVersion) { Die 'Root package.json has no version field' }
if ($AppVersion -notmatch '^\d+\.\d+\.\d+$') { Die "Root package.json version '$AppVersion' is not a valid semver MAJOR.MINOR.PATCH" }
Write-Host "  App version: $AppVersion (from package.json)" -ForegroundColor Cyan
$InstallerDir   = Join-Path $RepoRoot 'installer'
$AssetsDir      = Join-Path $InstallerDir 'assets'
$StagingDir     = Join-Path $InstallerDir 'staging'
$CacheDir       = Join-Path $RepoRoot '.build-cache'
$IssFile        = Join-Path $InstallerDir 'funeral-home-demo.iss'
$OutputDir      = Join-Path $RepoRoot 'dist-installer'
$EnvLocalFile   = Join-Path $RepoRoot 'apps\api\.env.local'

$NodeZipName    = "node-v$NodeVersion-win-x64.zip"
$NodeUrl        = "https://nodejs.org/dist/v$NodeVersion/$NodeZipName"
$NodeZip        = Join-Path $CacheDir $NodeZipName
$NodeExtractDir = Join-Path $CacheDir "node-v$NodeVersion-win-x64"

$StripeZipName  = "stripe_${StripeVersion}_windows_x86_64.zip"
$StripeUrl      = "https://github.com/stripe/stripe-cli/releases/download/v$StripeVersion/$StripeZipName"
$StripeZip      = Join-Path $CacheDir $StripeZipName
$StripeExtract  = Join-Path $CacheDir "stripe-$StripeVersion"

function Write-Section { param([string]$t) Write-Host ""; Write-Host "=== $t ===" -ForegroundColor Cyan }
function Write-Step    { param([string]$t) Write-Host "  > $t" -ForegroundColor Gray }
function Write-Ok      { param([string]$t) Write-Host "  OK $t" -ForegroundColor Green }
function Die           { param([string]$t) Write-Host "  ERR $t" -ForegroundColor Red; exit 1 }

# --- Prerequisites -----------------------------------------------------------
Write-Section 'Checking prerequisites'

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Die 'npm is not on PATH. Install Node.js on the build machine and try again.'
}
Write-Ok "npm: $(npm --version)"

$IsccCmd = Get-Command iscc.exe -ErrorAction SilentlyContinue
$Iscc = $null
if ($IsccCmd) { $Iscc = $IsccCmd.Source }
if (-not $Iscc) {
    $candidates = @(
        "${env:ProgramFiles(x86)}\Inno Setup 6\iscc.exe",
        "$env:ProgramFiles\Inno Setup 6\iscc.exe"
    )
    $Iscc = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $Iscc -and -not $SkipInstaller) {
    Die 'Inno Setup 6 not found. Install from https://jrsoftware.org/isdl.php and rerun.'
}
if ($Iscc) { Write-Ok "Inno Setup: $Iscc" } else { Write-Step "Inno Setup: skipping (- SkipInstaller)" }

if (-not (Test-Path $EnvLocalFile)) {
    Die "Missing $EnvLocalFile. Needed to extract STRIPE_SECRET_KEY."
}

$envText = Get-Content $EnvLocalFile -Raw
if ($envText -notmatch '(?m)^\s*STRIPE_SECRET_KEY\s*=\s*(sk_test_\S+)') {
    Die "Could not find a sk_test_... STRIPE_SECRET_KEY in $EnvLocalFile."
}
$StripeSecretKey = $Matches[1]
Write-Ok "Stripe test key: $($StripeSecretKey.Substring(0,12))..."

New-Item -ItemType Directory -Force -Path $CacheDir, $OutputDir | Out-Null

# --- Download portable Node + Stripe CLI ------------------------------------
Write-Section 'Fetching portable runtimes'

function Get-CachedZip {
    param([string]$Url, [string]$ZipPath, [string]$ExtractDir)
    if ($SkipDownload -and (Test-Path $ExtractDir)) {
        Write-Step "Using cached $ExtractDir"; return
    }
    if (-not (Test-Path $ZipPath)) {
        Write-Step "Downloading $Url"
        Invoke-WebRequest -Uri $Url -OutFile $ZipPath -UseBasicParsing
    } else {
        Write-Step "Zip already cached: $ZipPath"
    }
    if (Test-Path $ExtractDir) { Remove-Item -Recurse -Force $ExtractDir }
    New-Item -ItemType Directory -Force -Path $ExtractDir | Out-Null
    Write-Step "Extracting to $ExtractDir"
    Expand-Archive -Path $ZipPath -DestinationPath $ExtractDir -Force
}

Get-CachedZip -Url $NodeUrl -ZipPath $NodeZip -ExtractDir $NodeExtractDir
# The Node zip contains a top-level node-vX.Y.Z-win-x64\ directory inside ExtractDir.
$NodeInner = Get-ChildItem -Path $NodeExtractDir -Directory | Select-Object -First 1
if (-not $NodeInner) { Die "Node archive extraction did not produce a directory." }
$NodePortableRoot = $NodeInner.FullName
if (-not (Test-Path (Join-Path $NodePortableRoot 'node.exe'))) {
    Die "node.exe not found at $NodePortableRoot"
}
Write-Ok "Node portable: $NodePortableRoot"

Get-CachedZip -Url $StripeUrl -ZipPath $StripeZip -ExtractDir $StripeExtract
$StripeExePath = Join-Path $StripeExtract 'stripe.exe'
if (-not (Test-Path $StripeExePath)) {
    # Some releases nest inside a folder.
    $found = Get-ChildItem -Path $StripeExtract -Recurse -Filter 'stripe.exe' | Select-Object -First 1
    if ($found) { $StripeExePath = $found.FullName }
}
if (-not (Test-Path $StripeExePath)) { Die "stripe.exe not found after extracting $StripeZip" }
Write-Ok "Stripe CLI: $StripeExePath"

# --- Build api + web ---------------------------------------------------------
if (-not $SkipBuild) {
    Write-Section 'Building api + web'
    Push-Location $RepoRoot
    try {
        Write-Step 'npm install (root workspaces)'
        & npm install --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { Die 'npm install failed' }

        Write-Step 'npm run build (all workspaces)'
        & npm run build
        if ($LASTEXITCODE -ne 0) { Die 'npm run build failed' }
    } finally { Pop-Location }
    Write-Ok 'Build complete'
} else {
    Write-Step 'Skipping build (-SkipBuild)'
}

$ApiDist = Join-Path $RepoRoot 'apps\api\dist'
$WebDist = Join-Path $RepoRoot 'apps\web\dist'
if (-not (Test-Path $ApiDist)) { Die "Missing $ApiDist — run without -SkipBuild" }
if (-not (Test-Path $WebDist)) { Die "Missing $WebDist — run without -SkipBuild" }

# --- Stage files -------------------------------------------------------------
Write-Section 'Staging installer payload'

if (Test-Path $StagingDir) { Remove-Item -Recurse -Force $StagingDir }
New-Item -ItemType Directory -Force -Path $StagingDir | Out-Null

# Portable Node
$StagingNode = Join-Path $StagingDir 'node'
New-Item -ItemType Directory -Force -Path $StagingNode | Out-Null
Copy-Item -Path (Join-Path $NodePortableRoot 'node.exe') -Destination $StagingNode
# Include Node license for compliance.
$nodeLicense = Join-Path $NodePortableRoot 'LICENSE'
if (Test-Path $nodeLicense) { Copy-Item $nodeLicense (Join-Path $StagingNode 'LICENSE') }
Write-Ok 'node.exe staged'

# Stripe CLI
$StagingStripe = Join-Path $StagingDir 'stripe'
New-Item -ItemType Directory -Force -Path $StagingStripe | Out-Null
Copy-Item -Path $StripeExePath -Destination (Join-Path $StagingStripe 'stripe.exe')
Get-ChildItem -Path (Split-Path $StripeExePath -Parent) -Filter 'LICENSE*' -ErrorAction SilentlyContinue |
    ForEach-Object { Copy-Item $_.FullName $StagingStripe }
Write-Ok 'stripe.exe staged'

# Built API
$StagingApi = Join-Path $StagingDir 'app\api'
New-Item -ItemType Directory -Force -Path $StagingApi | Out-Null
Copy-Item -Recurse -Path $ApiDist -Destination (Join-Path $StagingApi 'dist')
Write-Ok 'api\dist staged'

# Self-contained package.json for api (strips workspace linkage).
$apiPkgJson = Get-Content (Join-Path $RepoRoot 'apps\api\package.json') -Raw | ConvertFrom-Json
$standalonePkg = [ordered]@{
    name         = 'funeral-home-prototype-api'
    version      = $AppVersion
    private      = $true
    type         = 'module'
    main         = 'dist/index.js'
    dependencies = $apiPkgJson.dependencies
}
$standalonePkg | ConvertTo-Json -Depth 10 | Out-File -FilePath (Join-Path $StagingApi 'package.json') -Encoding utf8 -Force

Write-Step 'npm install --omit=dev inside staged api (self-contained)'
Push-Location $StagingApi
try {
    & npm install --omit=dev --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { Die 'api npm install failed in staging' }
} finally { Pop-Location }
Write-Ok 'api\node_modules staged (production only)'

# Built Web
$StagingWeb = Join-Path $StagingDir 'app\web'
New-Item -ItemType Directory -Force -Path $StagingWeb | Out-Null
Copy-Item -Recurse -Path $WebDist -Destination (Join-Path $StagingWeb 'dist')
Write-Ok 'web\dist staged'

# Launcher scripts + config
Copy-Item -Path (Join-Path $AssetsDir 'start.ps1') -Destination $StagingDir
Copy-Item -Path (Join-Path $AssetsDir 'stop.ps1')  -Destination $StagingDir

$appConfig = @"
# Generated by scripts\build-installer.ps1. Do not edit by hand.
`$script:StripeSecretKey = '$StripeSecretKey'
"@
$appConfig | Out-File -FilePath (Join-Path $StagingDir 'app.config.ps1') -Encoding utf8 -Force
Write-Ok 'launcher + app.config.ps1 staged'

# README shown in the install directory
$readme = @"
Funeral Home Prototype Stripe Integration - v$AppVersion
===================================================

To start the demo:
    Start Menu -> Insight AI -> Funeral Home Prototype -> Start Funeral Home Prototype
    (or use the desktop shortcut if you enabled it during install)

The app will open in your default browser at http://localhost:3001

To stop the demo:
    Start Menu -> Insight AI -> Funeral Home Prototype -> Stop Funeral Home Prototype

Data is stored under %LOCALAPPDATA%\Insight AI\Funeral Home Prototype\data
Logs   are stored under %LOCALAPPDATA%\Insight AI\Funeral Home Prototype\logs

This build uses Stripe TEST MODE only. Do not use real payment cards.
"@
$readme | Out-File -FilePath (Join-Path $StagingDir 'README.txt') -Encoding utf8 -Force

# --- Compile installer -------------------------------------------------------
if ($SkipInstaller) {
    Write-Section 'Skipping Inno Setup compilation (-SkipInstaller)'
    Write-Ok "Staged payload: $StagingDir"
    exit 0
}

Write-Section 'Compiling installer'
& $Iscc "/DMyAppVersion=$AppVersion" $IssFile
if ($LASTEXITCODE -ne 0) { Die 'Inno Setup compilation failed' }

$setupExe = Get-ChildItem -Path $OutputDir -Filter 'FuneralHomePrototype-Setup-*.exe' |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1

Write-Section 'Done'
if ($setupExe) {
    Write-Ok "Installer: $($setupExe.FullName)"
    Write-Ok "Size:      $([math]::Round($setupExe.Length / 1MB, 1)) MB"
} else {
    Write-Host "Could not locate output .exe under $OutputDir" -ForegroundColor Yellow
}
