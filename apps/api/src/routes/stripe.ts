import { Router } from "express";
import { getInvoice, listRecentInvoices } from "../services/invoicing.js";
import { getListings, saveListings } from "../services/store.js";
import { stripe } from "../services/stripe.js";

export const stripeRouter: Router = Router();

// Returns invoices tied to local listings, enriched with current Stripe status.
stripeRouter.get("/invoices", async (_req, res) => {
  try {
    const listings = await getListings();
    const invoices = await Promise.all(
      listings
        .filter((l) => l.invoiceId)
        .map(async (l) => {
          try {
            const inv = await getInvoice(l.invoiceId!);
            return {
              id: inv.id,
              status: inv.status,
              amountDueUsd: inv.amountDueUsd,
              amountPaidUsd: inv.amountPaidUsd,
              hostedInvoiceUrl: inv.hostedInvoiceUrl,
              description: inv.description,
              created: inv.created,
              deceasedName: l.deceasedName,
              newspaper: l.newspaper,
              listingId: l.id,
            };
          } catch {
            return null;
          }
        })
    );
    return res.json({ invoices: invoices.filter((x) => x !== null) });
  } catch (err) {
    console.error("[stripe] listInvoices failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `Stripe error: ${message}` });
  }
});

stripeRouter.get("/invoices/all", async (_req, res) => {
  try {
    const invoices = await listRecentInvoices(30);
    return res.json({ invoices });
  } catch (err) {
    console.error("[stripe] listRecentInvoices failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `Stripe error: ${message}` });
  }
});

stripeRouter.get("/invoices/:id", async (req, res) => {
  try {
    const invoice = await getInvoice(req.params.id);
    return res.json(invoice);
  } catch (err) {
    console.error("[stripe] getInvoice failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `Stripe error: ${message}` });
  }
});

// Mark a listing as published once its invoice is paid. Called by the webhook
// (invoice.paid) and also on-demand by the UI for freshness.
stripeRouter.post("/listings/sync", async (_req, res) => {
  try {
    const listings = await getListings();
    const updated = await Promise.all(
      listings.map(async (l) => {
        if (!l.invoiceId || l.status === "published") return l;
        try {
          const inv = await stripe.invoices.retrieve(l.invoiceId);
          if (inv.status === "paid") {
            return { ...l, status: "published" as const };
          }
        } catch {
          // ignore
        }
        return l;
      })
    );
    await saveListings(updated);
    return res.json({ listings: updated });
  } catch (err) {
    console.error("[stripe] listings/sync failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: `Sync error: ${message}` });
  }
});
