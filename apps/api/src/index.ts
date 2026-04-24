import express from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { env } from "./env.js";
import { stripeRouter } from "./routes/stripe.js";
import { webhookRouter } from "./routes/webhook.js";
import { listingsRouter } from "./routes/listings.js";
import { loyaltyRouter } from "./routes/loyalty.js";
import { serviceFeesRouter } from "./routes/serviceFees.js";
import { connectRouter } from "./routes/connect.js";
import { ensureSeeded } from "./services/listings.js";

const app = express();

if (env.WEB_ORIGIN) {
  app.use(cors({ origin: env.WEB_ORIGIN }));
}

// Webhook route MUST be mounted before express.json() so the raw body is
// preserved for signature verification.
app.use("/webhook", webhookRouter);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", stripeRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/loyalty", loyaltyRouter);
app.use("/api/service-fees", serviceFeesRouter);
app.use("/api/connect", connectRouter);

if (env.WEB_DIST_DIR) {
  const webDist = resolve(env.WEB_DIST_DIR);
  if (existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get("*", (_req, res) => {
      res.sendFile(resolve(webDist, "index.html"));
    });
    console.log(`[api] serving web from ${webDist}`);
  } else {
    console.warn(`[api] WEB_DIST_DIR set but not found: ${webDist}`);
  }
}

app.listen(env.PORT, async () => {
  console.log(`[api] listening on http://localhost:${env.PORT}`);
  console.log(
    `[api] webhook forwarding: stripe listen --forward-to localhost:${env.PORT}/webhook`
  );
  try {
    await ensureSeeded();
  } catch (err) {
    console.error("[api] seeding failed", err);
  }
});
