# Building the Windows installer

Produces a single `.exe` that installs the demo onto any Windows 10/11 PC. The
target user then clicks Start Menu → "Start Funeral Home Prototype" and the app
opens in their browser at `http://localhost:3001`.

## One-time prerequisites on the build machine

1. **Node.js** (any recent version on PATH — used to build the app).
2. **Inno Setup 6** — install from <https://jrsoftware.org/isdl.php>.
   The build script looks for `iscc.exe` on PATH and at the default install
   locations; installing with defaults is enough.
3. **Internet access** — the first build downloads portable Node.js and the
   Stripe CLI into `.build-cache/` (cached thereafter).
4. **`apps/api/.env.local`** must contain a valid `sk_test_...` Stripe secret
   key. The build reads the key from there and bakes it into the installer.

## Build command

From the repo root:

```powershell
pwsh .\scripts\build-installer.ps1
```

First build: ~5–10 minutes (downloads ~50 MB, runs `npm install` twice, runs
`npm run build`, compiles installer). Subsequent builds: ~1 minute.

Useful flags:

| Flag | Purpose |
|---|---|
| `-SkipBuild` | Reuse the existing `apps/api/dist` and `apps/web/dist` (faster iteration on installer tweaks). |
| `-SkipDownload` | Reuse extracted portable Node + Stripe CLI in `.build-cache/`. |
| `-SkipInstaller` | Stop after staging; don't invoke `iscc.exe`. Useful for inspecting `installer/staging/` before packaging. |
| `-NodeVersion 20.18.0` | Override bundled Node version. |
| `-StripeVersion 1.22.0` | Override bundled Stripe CLI version. |

## Output

```
dist-installer\FuneralHomePrototype-Setup-<version>.exe   (~80–150 MB)
```

`<version>` is read from the root `package.json` at build time. Bump that
file and re-run; everything (the .exe filename, the README banner inside
the install folder, and the standalone API `package.json` in the staged
payload) follows from that single source.

Ship that single file to the target PC. The installer is self-contained — no
extra downloads during installation beyond the pre-install internet check.

## What the installer does on the target PC

1. Pre-install check: confirms the machine can reach `api.stripe.com`.
2. Copies the payload to `C:\Program Files\Insight AI\Funeral Home Prototype Stripe Integration\`:
   - `node\node.exe` (portable Node runtime)
   - `stripe\stripe.exe` (Stripe CLI)
   - `app\api\` (built API + production `node_modules`)
   - `app\web\dist\` (Vite build output, served by Express)
   - `start.ps1`, `stop.ps1`, `app.config.ps1`
3. Creates a writable data dir at
   `%LOCALAPPDATA%\Insight AI\Funeral Home Prototype\data`
   (JSON store lives here; survives upgrades and uninstalls).
4. Creates Start Menu and (optional) Desktop shortcuts:
   - **Start Funeral Home Prototype** — runs `start.ps1`
   - **Open Funeral Home Prototype** — opens `http://localhost:3001` in the default browser
   - **Stop Funeral Home Prototype** — runs `stop.ps1`

## Runtime flow of `start.ps1`

1. If port 3001 is already listening → just opens the browser (idempotent).
2. Launches `stripe.exe listen --api-key sk_test_... --forward-to http://localhost:3001/webhook`
   with stdout/stderr redirected to `%LOCALAPPDATA%\...\logs\stripe.*.log`.
3. Tails those log files for up to 30 seconds until it sees the
   `whsec_...` webhook signing secret.
4. Starts `node.exe app\api\dist\index.js` with environment variables set:
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PORT=3001`, `DATA_DIR`, `WEB_DIST_DIR`.
5. Waits for `GET /health` to return 200.
6. Opens `http://localhost:3001` in the default browser.

PIDs for both processes are written to
`%LOCALAPPDATA%\...\run.pids` so `stop.ps1` can clean them up.

## Security notes

- The Stripe test secret key is baked into `app.config.ps1` inside the
  installer. Keep the installer binary off public channels.
- No live Stripe keys should ever enter this pipeline. The build script fails
  loudly if `STRIPE_SECRET_KEY` does not start with `sk_test_`.
- The installer is unsigned. Windows SmartScreen will warn on first run —
  users must click "More info" → "Run anyway". Code-signing is out of scope
  for the prototype but recommended for any wider distribution.

## Cleaning up

```powershell
Remove-Item -Recurse -Force .build-cache, installer\staging, dist-installer
```
