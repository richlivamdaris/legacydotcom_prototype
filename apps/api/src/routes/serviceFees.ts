import { Router } from "express";
import { getListings, BILLING_PARTNERS } from "../services/store.js";
import { getInvoice } from "../services/invoicing.js";

export const serviceFeesRouter: Router = Router();

interface BreakdownItem {
  listingId: string;
  friendlyInvoiceId: string;
  stripeInvoiceId: string | null;
  deceasedName: string;
  newspaper: string;
  amountUsd: number;
  invoiceStatus: string | null;
  invoiceHostedUrl: string | null;
  feeUsd: number;
  submittedAt: string;
}

interface PartnerSummary {
  newspaper: string;
  feePercent: number;
  listingCount: number;
  totalListingValueUsd: number;
  serviceFeeUsd: number;
  breakdown: BreakdownItem[];
}

// Aggregates listings per billing-partner newspaper and applies the agreed
// service-fee percent so Legacy.com can raise a commission invoice against
// that publisher.
serviceFeesRouter.get("/", async (_req, res) => {
  try {
    const listings = await getListings();
    const summaries: PartnerSummary[] = [];

    for (const [newspaper, cfg] of Object.entries(BILLING_PARTNERS)) {
      const forPartner = listings.filter((l) => l.newspaper === newspaper);
      const breakdown: BreakdownItem[] = await Promise.all(
        forPartner.map(async (l) => {
          let invoiceStatus: string | null = null;
          let invoiceHostedUrl: string | null = null;
          if (l.invoiceId) {
            try {
              const inv = await getInvoice(l.invoiceId);
              invoiceStatus = inv.status ?? null;
              invoiceHostedUrl = inv.hostedInvoiceUrl;
            } catch {
              /* ignore */
            }
          }
          return {
            listingId: l.id,
            friendlyInvoiceId: l.friendlyInvoiceId,
            stripeInvoiceId: l.invoiceId,
            deceasedName: l.deceasedName,
            newspaper: l.newspaper,
            amountUsd: l.amountUsd,
            invoiceStatus,
            invoiceHostedUrl,
            feeUsd: (l.amountUsd * cfg.feePercent) / 100,
            submittedAt: l.submittedAt,
          };
        })
      );

      const totalListingValueUsd = breakdown.reduce((s, b) => s + b.amountUsd, 0);
      summaries.push({
        newspaper,
        feePercent: cfg.feePercent,
        listingCount: breakdown.length,
        totalListingValueUsd,
        serviceFeeUsd: (totalListingValueUsd * cfg.feePercent) / 100,
        breakdown,
      });
    }

    return res.json({ partners: summaries });
  } catch (err) {
    console.error("[service-fees] failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: `Service fees error: ${message}` });
  }
});
