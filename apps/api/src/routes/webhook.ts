import { Router, raw } from "express";
import type Stripe from "stripe";
import { stripe } from "../services/stripe.js";
import { env } from "../env.js";
import { getListings, saveListings } from "../services/store.js";

export const webhookRouter: Router = Router();

const seenEventIds = new Set<string>();

webhookRouter.post(
  "/",
  raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (typeof sig !== "string") {
      console.warn("[webhook] missing stripe-signature header");
      return res.status(400).send("Missing signature");
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        sig,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown";
      console.error("[webhook] signature verification failed:", message);
      return res.status(400).send(`Webhook Error: ${message}`);
    }

    if (seenEventIds.has(event.id)) {
      console.log(`[webhook] duplicate event ignored id=${event.id}`);
      return res.json({ received: true, duplicate: true });
    }
    seenEventIds.add(event.id);

    console.log(`[webhook] id=${event.id} type=${event.type}`);

    switch (event.type) {
      case "invoice.finalized": {
        const inv = event.data.object as Stripe.Invoice;
        console.log(
          `[webhook] invoice.finalized id=${inv.id} amount_due=${inv.amount_due}`
        );
        break;
      }
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        console.log(
          `[webhook] invoice.paid id=${inv.id} amount_paid=${inv.amount_paid}`
        );
        try {
          const listings = await getListings();
          const next = listings.map((l) =>
            l.invoiceId === inv.id ? { ...l, status: "published" as const } : l
          );
          await saveListings(next);
        } catch (err) {
          console.error("[webhook] failed to update listing status", err);
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        console.warn(
          `[webhook] invoice.payment_failed id=${inv.id} attempt_count=${inv.attempt_count}`
        );
        break;
      }
      default:
        console.log(`[webhook] unhandled type=${event.type}`);
    }

    return res.json({ received: true });
  }
);
