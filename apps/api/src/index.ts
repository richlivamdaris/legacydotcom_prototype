import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { stripeRouter } from "./routes/stripe.js";
import { webhookRouter } from "./routes/webhook.js";
import { listingsRouter } from "./routes/listings.js";
import { loyaltyRouter } from "./routes/loyalty.js";
import { ensureSeeded } from "./services/listings.js";

const app = express();

app.use(cors({ origin: env.WEB_ORIGIN }));

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
