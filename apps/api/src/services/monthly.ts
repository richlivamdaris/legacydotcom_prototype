import type Stripe from "stripe";
import { stripe } from "./stripe.js";
import {
  getListings,
  getMonthlyInvoices,
  saveListings,
  upsertMonthlyInvoice,
  type Listing,
  type MonthlyInvoiceRecord,
} from "./store.js";

const FH_EMAIL = "james@greenfieldFH.com";
const FH_NAME = "Greenfield Funeral Home";

export function billingMonthFor(publicationDate: string | null, createdAtIso: string): string {
  const iso = publicationDate ?? createdAtIso.slice(0, 10);
  return iso.slice(0, 7);
}

async function findOrCreateCustomer(): Promise<Stripe.Customer> {
  const existing = await stripe.customers.list({ email: FH_EMAIL, limit: 1 });
  if (existing.data[0]) return existing.data[0];
  return stripe.customers.create({
    email: FH_EMAIL,
    name: FH_NAME,
    metadata: { source: "legacy-prototype" },
  });
}

// Adds a listing to the pending monthly invoice for its billing month. No
// Stripe calls happen here — the Stripe invoice is created only when the
// funeral home clicks "Pay now" on the monthly row.
//
// If that month's invoice has already been finalized/paid, we can't add
// more line items to it, so the listing rolls forward to the next month
// (and so on, in the edge case where the next month is already settled too).
export async function attachListingToMonthly(listing: Listing): Promise<MonthlyInvoiceRecord> {
  const base = billingMonthFor(listing.publicationDate, listing.createdAtIso);
  return attachToMonth(listing, base);
}

async function attachToMonth(listing: Listing, month: string): Promise<MonthlyInvoiceRecord> {
  const all = await getMonthlyInvoices();
  const existing = all.find((m) => m.month === month);

  if (existing && existing.status === "pending" && existing.stripeInvoiceId === null) {
    if (existing.listingIds.includes(listing.id)) return existing;
    return upsertMonthlyInvoice(month, {
      listingIds: [...existing.listingIds, listing.id],
      totalAmountUsd: existing.totalAmountUsd + listing.amountUsd,
    });
  }

  if (!existing) {
    return upsertMonthlyInvoice(month, {
      listingIds: [listing.id],
      totalAmountUsd: listing.amountUsd,
    });
  }

  // Month is already finalized or paid — roll forward.
  return attachToMonth(listing, nextMonthKey(month));
}

function nextMonthKey(monthKey: string): string {
  const [yStr, mStr] = monthKey.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

// Called when the funeral home hits "Pay now" on a pending monthly row.
// Creates a single Stripe invoice with one line item per contained listing,
// finalizes it, and returns the hosted URL.
export async function finalizeMonthlyInvoice(month: string): Promise<MonthlyInvoiceRecord> {
  const months = await getMonthlyInvoices();
  const record = months.find((m) => m.month === month);
  if (!record) throw new Error(`No monthly record for ${month}`);
  if (record.stripeInvoiceId) return record; // idempotent

  const listings = await getListings();
  const items = record.listingIds
    .map((id) => listings.find((l) => l.id === id))
    .filter((l): l is Listing => l !== undefined);

  if (items.length === 0) throw new Error(`Monthly invoice ${month} has no listings`);

  const customer = await findOrCreateCustomer();

  const invoice = await stripe.invoices.create({
    customer: customer.id,
    collection_method: "send_invoice",
    days_until_due: 14,
    auto_advance: false,
    description: `Legacy.com monthly statement — ${record.friendlyId}`,
    metadata: {
      source: "legacy-prototype",
      monthly_invoice_month: month,
      friendly_id: record.friendlyId,
      listing_count: String(items.length),
    },
  });

  for (const l of items) {
    await stripe.invoiceItems.create({
      customer: customer.id,
      invoice: invoice.id,
      amount: Math.round(l.amountUsd * 100),
      currency: "usd",
      description: `${l.deceasedName} — ${l.newspaper}${l.publicationDate ? ` (${l.publicationDate})` : ""}`,
      metadata: { listing_id: l.id, friendly_listing_id: l.friendlyInvoiceId },
    });
  }

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id!);

  return upsertMonthlyInvoice(month, {
    stripeInvoiceId: finalized.id ?? invoice.id ?? null,
    hostedInvoiceUrl: finalized.hosted_invoice_url ?? null,
    invoicePdfUrl: finalized.invoice_pdf ?? null,
    status: "open",
    finalizedAtIso: new Date().toISOString(),
  });
}

// Marks a monthly invoice as paid out of band (for historical seed data that
// needs to look paid without running real card charges).
export async function markMonthlyPaidOutOfBand(month: string): Promise<void> {
  const months = await getMonthlyInvoices();
  const record = months.find((m) => m.month === month);
  if (!record || !record.stripeInvoiceId) return;
  try {
    await stripe.invoices.pay(record.stripeInvoiceId, { paid_out_of_band: true });
  } catch (err) {
    console.warn(`[monthly] paid_out_of_band failed for ${month}:`, err instanceof Error ? err.message : err);
  }
  await upsertMonthlyInvoice(month, { status: "paid", paidAtIso: new Date().toISOString() });
  // Also promote the contained listings to "published"
  const listings = await getListings();
  const next = listings.map((l) =>
    record.listingIds.includes(l.id) ? { ...l, status: "published" as const } : l
  );
  await saveListings(next);
}

// Called from the webhook when a monthly invoice is paid in Stripe.
export async function handleMonthlyInvoicePaid(stripeInvoiceId: string): Promise<void> {
  const months = await getMonthlyInvoices();
  const record = months.find((m) => m.stripeInvoiceId === stripeInvoiceId);
  if (!record) return;
  await upsertMonthlyInvoice(record.month, { status: "paid", paidAtIso: new Date().toISOString() });
  const listings = await getListings();
  const next = listings.map((l) =>
    record.listingIds.includes(l.id) ? { ...l, status: "published" as const } : l
  );
  await saveListings(next);
}
