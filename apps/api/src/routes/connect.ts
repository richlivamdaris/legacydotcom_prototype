import { Router } from "express";
import { stripe } from "../services/stripe.js";

export const connectRouter: Router = Router();

function baseUrl(req: import("express").Request): string {
  const origin = req.get("origin");
  if (origin) return origin;
  const host = req.get("host") ?? `localhost:${process.env.PORT ?? 3001}`;
  const proto = req.secure ? "https" : "http";
  return `${proto}://${host}`;
}

// Creates a Connected Account (Express for prototype; production target is
// Custom per project memory — Express is used here because Stripe hosts the
// KYB UI and we can demo end-to-end without building our own onboarding UI)
// plus an Account Link the frontend opens to kick off hosted onboarding.
connectRouter.post("/onboard", async (req, res) => {
  try {
    const { email, fhName, country } = req.body as {
      email?: string;
      fhName?: string;
      country?: string;
    };

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "email is required" });
      return;
    }

    const account = await stripe.accounts.create({
      type: "express",
      country: country && typeof country === "string" ? country : "US",
      email,
      business_type: "company",
      company: fhName ? { name: fhName } : undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { source: "funeral-home-prototype" },
    });

    const origin = baseUrl(req);
    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/?connect=refresh&acct=${account.id}`,
      return_url: `${origin}/?connect=return&acct=${account.id}`,
      type: "account_onboarding",
    });

    res.json({
      accountId: account.id,
      onboardingUrl: link.url,
      expiresAt: link.expires_at,
    });
  } catch (err) {
    console.error("[connect] onboard failed:", err);
    const message = err instanceof Error ? err.message : "onboarding failed";
    res.status(500).json({ error: message });
  }
});

// Polled by the frontend while the onboarding tab/popup is open. Flips to
// verified once Stripe marks details_submitted=true (the user finished the
// hosted KYB flow and was redirected to return_url).
connectRouter.get("/status/:accountId", async (req, res) => {
  const accountId = req.params.accountId;
  if (!accountId || !accountId.startsWith("acct_")) {
    res.status(400).json({ error: "invalid accountId" });
    return;
  }
  try {
    const account = await stripe.accounts.retrieve(accountId);
    res.json({
      accountId: account.id,
      detailsSubmitted: account.details_submitted === true,
      chargesEnabled: account.charges_enabled === true,
      payoutsEnabled: account.payouts_enabled === true,
      requirementsDueNow: account.requirements?.currently_due ?? [],
    });
  } catch (err) {
    console.error("[connect] status failed:", err);
    const message = err instanceof Error ? err.message : "status lookup failed";
    res.status(500).json({ error: message });
  }
});

// Returns a fresh Account Link if the user needs to resume onboarding
// (e.g. they closed the tab before finishing).
connectRouter.post("/resume/:accountId", async (req, res) => {
  const accountId = req.params.accountId;
  if (!accountId || !accountId.startsWith("acct_")) {
    res.status(400).json({ error: "invalid accountId" });
    return;
  }
  try {
    const origin = baseUrl(req);
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/?connect=refresh&acct=${accountId}`,
      return_url: `${origin}/?connect=return&acct=${accountId}`,
      type: "account_onboarding",
    });
    res.json({ onboardingUrl: link.url, expiresAt: link.expires_at });
  } catch (err) {
    console.error("[connect] resume failed:", err);
    const message = err instanceof Error ? err.message : "resume failed";
    res.status(500).json({ error: message });
  }
});
