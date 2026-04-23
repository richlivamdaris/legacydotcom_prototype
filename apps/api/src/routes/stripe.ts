import { Router } from "express";
import JSZip from "jszip";
import { getInvoice, listRecentInvoices } from "../services/invoicing.js";
import { getListings, getMonthlyInvoices, saveListings, type MonthlyInvoiceRecord } from "../services/store.js";
import { stripe } from "../services/stripe.js";
import { finalizeMonthlyInvoice } from "../services/monthly.js";

export const stripeRouter: Router = Router();

// Returns one row per monthly invoice (pending or finalized). Pending months
// aren't yet in Stripe — their hostedInvoiceUrl is null until the funeral
// home clicks "Pay now" which calls /api/invoices/month/:month/pay.
stripeRouter.get("/invoices", async (_req, res) => {
  try {
    const months = await getMonthlyInvoices();
    const listings = await getListings();

    const rows = await Promise.all(
      months.map(async (m) => {
        // Derive the canonical status from Stripe if we have a Stripe id,
        // otherwise fall back to the local record.
        let status: MonthlyInvoiceRecord["status"] = m.status;
        let amountDueUsd = m.totalAmountUsd;
        let amountPaidUsd = 0;
        let hostedInvoiceUrl = m.hostedInvoiceUrl;
        let invoicePdfUrl = m.invoicePdfUrl;

        if (m.stripeInvoiceId) {
          try {
            const inv = await stripe.invoices.retrieve(m.stripeInvoiceId);
            status = (inv.status as MonthlyInvoiceRecord["status"]) ?? m.status;
            amountDueUsd = (inv.amount_due ?? 0) / 100;
            amountPaidUsd = (inv.amount_paid ?? 0) / 100;
            hostedInvoiceUrl = inv.hosted_invoice_url ?? m.hostedInvoiceUrl;
            invoicePdfUrl = inv.invoice_pdf ?? m.invoicePdfUrl;
          } catch (err) {
            console.warn(`[stripe] monthly retrieve failed for ${m.stripeInvoiceId}, using local:`, err instanceof Error ? err.message : err);
            if (m.status === "paid") { amountPaidUsd = m.totalAmountUsd; amountDueUsd = 0; }
          }
        } else {
          // Pending: nothing in Stripe yet
          amountDueUsd = m.totalAmountUsd;
          amountPaidUsd = 0;
        }

        const [y, mo] = m.month.split("-");
        const year = Number(y);
        const monthIdx = Number(mo) - 1;
        const due = new Date(Date.UTC(year, monthIdx + 1, 1));
        const dueDate = due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const period = due.toLocaleDateString("en-US", { month: "long", year: "numeric" }); // "May 2026" → but we want the month OF the listings
        const periodLabel = new Date(Date.UTC(year, monthIdx, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric" });

        const listingSummaries = m.listingIds
          .map((id) => listings.find((l) => l.id === id))
          .filter((l) => l !== undefined)
          .map((l) => ({
            id: l!.id,
            friendlyInvoiceId: l!.friendlyInvoiceId,
            deceasedName: l!.deceasedName,
            newspaper: l!.newspaper,
            publicationDate: l!.publicationDate,
            amountUsd: l!.amountUsd,
            status: l!.status,
            billingPartner: l!.billingPartner,
            feePercent: l!.feePercent,
          }));

        // Ignore 'period' to avoid unused-var lint
        void period;

        return {
          month: m.month,
          friendlyId: m.friendlyId,
          periodLabel,
          dueDate,
          status,
          stripeInvoiceId: m.stripeInvoiceId,
          hostedInvoiceUrl,
          invoicePdfUrl,
          listingCount: m.listingIds.length,
          totalAmountUsd: m.totalAmountUsd,
          amountDueUsd,
          amountPaidUsd,
          listings: listingSummaries,
        };
      })
    );

    rows.sort((a, b) => b.month.localeCompare(a.month));
    return res.json({ invoices: rows });
  } catch (err) {
    console.error("[stripe] listInvoices failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `Stripe error: ${message}` });
  }
});

// Finalizes the Stripe invoice for a month and returns its hosted URL.
// Idempotent — if already finalized, returns the existing URL.
stripeRouter.post("/invoices/month/:month/pay", async (req, res) => {
  try {
    const month = req.params.month;
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "month must be YYYY-MM" });
    const rec = await finalizeMonthlyInvoice(month);
    return res.json({
      stripeInvoiceId: rec.stripeInvoiceId,
      hostedInvoiceUrl: rec.hostedInvoiceUrl,
      friendlyId: rec.friendlyId,
    });
  } catch (err) {
    console.error("[stripe] finalize month failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `Stripe error: ${message}` });
  }
});

// Zip of PDFs for every paid/finalized monthly invoice.
stripeRouter.get("/invoices/download-zip", async (_req, res) => {
  try {
    const months = await getMonthlyInvoices();
    const withPdf = months.filter((m) => m.stripeInvoiceId);
    if (withPdf.length === 0) return res.status(404).json({ error: "No monthly invoices have been raised yet." });

    const zip = new JSZip();
    let successCount = 0;
    const summaryRows: string[] = ["Friendly ID,Stripe ID,Month,Status,Listings,Total USD,File"];

    await Promise.all(
      withPdf.map(async (m) => {
        try {
          const inv = await stripe.invoices.retrieve(m.stripeInvoiceId!);
          if (!inv.invoice_pdf) return;
          const resp = await fetch(inv.invoice_pdf);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const buf = Buffer.from(await resp.arrayBuffer());
          const filename = `${m.friendlyId}.pdf`;
          zip.file(filename, buf);
          summaryRows.push(
            [
              m.friendlyId,
              m.stripeInvoiceId!,
              m.month,
              inv.status ?? "",
              String(m.listingIds.length),
              m.totalAmountUsd.toFixed(2),
              filename,
            ].map((v) => (String(v).includes(",") ? `"${v}"` : String(v))).join(",")
          );
          successCount++;
        } catch (err) {
          console.warn(`[zip] failed for ${m.friendlyId}:`, err instanceof Error ? err.message : err);
        }
      })
    );

    zip.file("_summary.csv", summaryRows.join("\n"));
    const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="legacy-monthly-invoices-${date}.zip"`);
    res.setHeader("X-Invoices-Included", String(successCount));
    return res.send(buf);
  } catch (err) {
    console.error("[stripe] download-zip failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: `Zip error: ${message}` });
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

// Sync listing status from any monthly invoice that's been marked paid in Stripe.
stripeRouter.post("/listings/sync", async (_req, res) => {
  try {
    const listings = await getListings();
    const months = await getMonthlyInvoices();
    const paidMonthListingIds = new Set<string>();
    for (const m of months) {
      if (m.stripeInvoiceId && m.status !== "paid") {
        try {
          const inv = await stripe.invoices.retrieve(m.stripeInvoiceId);
          if (inv.status === "paid") for (const id of m.listingIds) paidMonthListingIds.add(id);
        } catch { /* ignore */ }
      } else if (m.status === "paid") {
        for (const id of m.listingIds) paidMonthListingIds.add(id);
      }
    }
    const next = listings.map((l) => paidMonthListingIds.has(l.id) && l.status !== "published" ? { ...l, status: "published" as const } : l);
    await saveListings(next);
    return res.json({ listings: next });
  } catch (err) {
    console.error("[stripe] listings/sync failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: `Sync error: ${message}` });
  }
});
