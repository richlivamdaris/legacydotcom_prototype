import { Router } from "express";
import { getListings, getMonthlyInvoices, saveListings, saveMonthlyInvoices, type Listing } from "../services/store.js";
import { createListing } from "../services/listings.js";
import { createObituaryInvoice } from "../services/invoicing.js";
import { attachListingToMonthly } from "../services/monthly.js";

export const listingsRouter: Router = Router();

listingsRouter.get("/", async (_req, res) => {
  try {
    const listings = await getListings();
    return res.json({ listings });
  } catch (err) {
    console.error("[listings] list failed", err);
    return res.status(500).json({ error: "Failed to load listings" });
  }
});

listingsRouter.post("/", async (req, res) => {
  const { deceasedName, newspapers, publicationDate, amountUsd, paymentMode, notificationEmail, dateOfDeath, obituaryText, asDraft } = req.body ?? {};

  if (
    typeof deceasedName !== "string" ||
    deceasedName.trim().length === 0 ||
    !Array.isArray(newspapers) ||
    newspapers.length === 0 ||
    typeof amountUsd !== "number" ||
    amountUsd <= 0
  ) {
    return res.status(400).json({
      error: "Invalid request. Required: deceasedName, newspapers[], amountUsd>0. Optional: publicationDate, paymentMode, notificationEmail",
    });
  }

  const mode = paymentMode === "on_account" ? "on_account" : "invoice";

  try {
    const result = await createListing({
      deceasedName: deceasedName.trim(),
      newspapers,
      publicationDate: typeof publicationDate === "string" ? publicationDate : null,
      amountUsd,
      paymentMode: mode,
      notificationEmail: typeof notificationEmail === "string" && notificationEmail.includes("@") ? notificationEmail : undefined,
      dateOfDeath: typeof dateOfDeath === "string" && dateOfDeath.trim() ? dateOfDeath : null,
      obituaryText: typeof obituaryText === "string" ? obituaryText : "",
      asDraft: asDraft === true,
    });
    return res.status(201).json(result);
  } catch (err) {
    console.error("[listings] create failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `Failed to create listing: ${message}` });
  }
});

// Delete a listing. Allowed for drafts and pending listings (neither is
// committed to a finalised Stripe invoice). If the listing sits inside a
// pending monthly-invoice record we also detach it and adjust the total.
listingsRouter.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const listings = await getListings();
    const target = listings.find((l) => l.id === id);
    if (!target) return res.status(404).json({ error: "Listing not found" });
    if (!["draft", "pending", "upcoming"].includes(target.status)) {
      return res.status(400).json({ error: "Only draft, pending, or scheduled listings can be deleted." });
    }

    // Block delete if the listing's monthly invoice has already been finalised
    // in Stripe — we'd orphan a real line item.
    const months = await getMonthlyInvoices();
    const containingMonth = months.find((m) => m.listingIds.includes(id));
    if (containingMonth?.stripeInvoiceId) {
      return res.status(400).json({
        error: `Listing is part of a finalised Stripe invoice (${containingMonth.friendlyId}) and can't be edited.`,
      });
    }

    await saveListings(listings.filter((l) => l.id !== id));

    // Detach from the pending monthly record, if any.
    if (containingMonth) {
      containingMonth.listingIds = containingMonth.listingIds.filter((l) => l !== id);
      containingMonth.totalAmountUsd = Math.max(0, containingMonth.totalAmountUsd - target.amountUsd);
      await saveMonthlyInvoices(months);
    }

    return res.json({ deleted: id });
  } catch (err) {
    console.error("[listings] delete failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: `Delete error: ${message}` });
  }
});

// Cart checkout. Takes a list of draft listing IDs plus a mode and
// promotes each out of draft state:
//   - "add_to_invoice": paymentMode=on_account, attaches to the monthly
//     statement (no Stripe invoice per listing).
//   - "pay_now": paymentMode=invoice, creates a standalone Stripe invoice
//     and returns its hosted URL so the UI can open Stripe's payment page.
listingsRouter.post("/checkout", async (req, res) => {
  const { listingIds, mode } = (req.body ?? {}) as {
    listingIds?: unknown;
    mode?: unknown;
  };
  if (!Array.isArray(listingIds) || listingIds.length === 0 || listingIds.some((x) => typeof x !== "string")) {
    return res.status(400).json({ error: "listingIds must be a non-empty string array" });
  }
  if (mode !== "add_to_invoice" && mode !== "pay_now") {
    return res.status(400).json({ error: "mode must be 'add_to_invoice' or 'pay_now'" });
  }

  try {
    const all = await getListings();
    const results: Array<{ listingId: string; hostedInvoiceUrl: string | null; status: string }> = [];

    for (const id of listingIds as string[]) {
      const idx = all.findIndex((l) => l.id === id);
      if (idx < 0) {
        results.push({ listingId: id, hostedInvoiceUrl: null, status: "not_found" });
        continue;
      }
      const listing = all[idx];
      if (listing.status !== "draft") {
        // Not a draft — nothing to do, report as-is.
        results.push({
          listingId: id,
          hostedInvoiceUrl: listing.invoiceHostedUrl,
          status: listing.status,
        });
        continue;
      }

      if (mode === "add_to_invoice") {
        const updated: Listing = {
          ...listing,
          paymentMode: "on_account",
          status: listing.publicationDate ? "upcoming" : "pending",
          invoiceId: null,
          invoiceHostedUrl: null,
        };
        all[idx] = updated;
        await saveListings(all);
        await attachListingToMonthly(updated);
        results.push({ listingId: id, hostedInvoiceUrl: null, status: updated.status });
      } else {
        // pay_now: create a standalone Stripe invoice for this listing.
        const inv = await createObituaryInvoice({
          funeralHomeEmail: listing.funeralHomeEmail,
          funeralHomeName: listing.funeralHomeName,
          deceasedName: listing.deceasedName,
          newspapers: [listing.newspaper],
          amountUsd: listing.amountUsd,
        });
        const updated: Listing = {
          ...listing,
          paymentMode: "invoice",
          status: listing.publicationDate ? "upcoming" : "pending",
          invoiceId: inv.invoiceId,
          invoiceHostedUrl: inv.hostedInvoiceUrl,
        };
        all[idx] = updated;
        await saveListings(all);
        results.push({ listingId: id, hostedInvoiceUrl: inv.hostedInvoiceUrl, status: updated.status });
      }
    }

    return res.json({ results });
  } catch (err) {
    console.error("[listings] checkout failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: `Checkout error: ${message}` });
  }
});
