#Requires -Version 5.1
<#
    stop.ps1 — stops the Funeral Home Prototype demo.
    Reads the PID file written by start.ps1 and terminates both processes.
    Falls back to "find anything listening on port 3001" if the PID file is
    missing or stale.
#>

$ErrorActionPreference = 'SilentlyContinue'

$DataRoot = Join-Path $env:LOCALAPPDATA 'Insight AI\Funeral Home Prototype'
$PidFile  = Join-Path $DataRoot 'run.pids'
$ApiPort  = 3001

function Write-Step { param([string]$msg) Write-Host "[stop] $msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$msg) Write-Host "[stop] $msg" -ForegroundColor Green }

$stopped = @()

if (Test-Path $PidFile) {
    Write-Step "Reading PID file: $PidFile"
    try {
        $pids = Get-Content $PidFile -Raw | ConvertFrom-Json
        foreach ($key in @('StripePid','ApiPid')) {
            $targetPid = $pids.$key
            if ($targetPid) {
                $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Step "Stopping $($proc.Name) (PID $targetPid)..."
                    Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
                    $stopped += "$($proc.Name):$targetPid"
                }
            }
        }
    } catch {
        Write-Host "[stop] Warning: could not parse PID file." -ForegroundColor Yellow
    }
    Remove-Item $PidFile -ErrorAction SilentlyContinue
}

# Fallback — anything still listening on the API port.
try {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort $ApiPort -ErrorAction SilentlyContinue
    foreach ($c in $listeners) {
        $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Step "Stopping $($proc.Name) still listening on port $ApiPort (PID $($proc.Id))..."
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            $stopped += "$($proc.Name):$($proc.Id)"
        }
    }
} catch {}

if ($stopped.Count -gt 0) {
    Write-Ok ("Stopped: " + ($stopped -join ', '))
} else {
    Write-Ok "Nothing was running."
}

Start-Sleep -Seconds 1
