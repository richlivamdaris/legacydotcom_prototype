export type PaymentMode = "invoice" | "on_account";

export interface Listing {
  id: string;
  deceasedName: string;
  newspaper: string;
  publicationDate: string | null;
  amountUsd: number;
  status: "draft" | "pending" | "upcoming" | "published";
  submittedAt: string;
  createdAtIso: string;
  invoiceId: string | null;
  invoiceHostedUrl: string | null;
  friendlyInvoiceId: string;
  billingPartner: boolean;
  feePercent: number;
  paymentMode: PaymentMode;
  dateOfDeath: string | null;
  obituaryText: string;
}

export type MonthlyInvoiceStatus = "pending" | "open" | "paid" | "uncollectible" | "void";

export interface MonthlyInvoiceListingSummary {
  id: string;
  friendlyInvoiceId: string;
  deceasedName: string;
  newspaper: string;
  publicationDate: string | null;
  amountUsd: number;
  status: "draft" | "pending" | "upcoming" | "published";
  billingPartner: boolean;
  feePercent: number;
}

export interface MonthlyInvoiceRow {
  month: string;                        // "YYYY-MM"
  friendlyId: string;                   // "INV-YYYY-MM"
  periodLabel: string;                  // "April 2026"
  dueDate: string;                      // "May 1, 2026"
  status: MonthlyInvoiceStatus;
  stripeInvoiceId: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  listingCount: number;
  totalAmountUsd: number;
  amountDueUsd: number;
  amountPaidUsd: number;
  listings: MonthlyInvoiceListingSummary[];
}

export interface PointsHistoryEntry {
  id: string;
  date: string;
  description: string;
  listingName: string | null;
  points: number;
  cardId?: string;
}

export interface IssuedCard {
  id: string;
  cardholderId: string;
  amountUsd: number;
  last4: string;
  recipientEmail: string;
  issuedAt: string;
  dashboardUrl: string;
}

export interface LoyaltyState {
  points: number;
  cardholderId: string | null;
  history: PointsHistoryEntry[];
  cards: IssuedCard[];
}

export interface ServiceFeeBreakdownItem {
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

export interface ServiceFeePartner {
  newspaper: string;
  feePercent: number;
  listingCount: number;
  totalListingValueUsd: number;
  serviceFeeUsd: number;
  breakdown: ServiceFeeBreakdownItem[];
}

export interface CreateListingInput {
  deceasedName: string;
  newspapers: string[];
  publicationDate: string | null;
  amountUsd: number;
  paymentMode: PaymentMode;
  notificationEmail: string;
  dateOfDeath: string | null;
  obituaryText: string;
  asDraft?: boolean;
}

export interface CreateListingResult {
  listing: Listing;
  invoiceId: string | null;
  hostedInvoiceUrl: string | null;
  amountDueUsd: number;
  pointsEarned: number;
}

export interface RedeemInput {
  amountUsd: number;
  pointsCost: number;
  recipientEmail: string;
}

export interface RedeemResult {
  cardId: string;
  last4: string;
  expMonth: number;
  expYear: number;
  amountUsd: number;
  remainingPoints: number;
  dashboardUrl: string;
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as { error?: string }).error ?? `${res.status} ${res.statusText}`;
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function fetchListings(): Promise<Listing[]> {
  const res = await fetch("/api/listings");
  const data = await parseOrThrow<{ listings: Listing[] }>(res);
  return data.listings;
}

export async function deleteListing(id: string): Promise<void> {
  const res = await fetch(`/api/listings/${encodeURIComponent(id)}`, { method: "DELETE" });
  await parseOrThrow<{ deleted: string }>(res);
}

export async function createListing(input: CreateListingInput): Promise<CreateListingResult> {
  const res = await fetch("/api/listings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseOrThrow<CreateListingResult>(res);
}

export async function fetchInvoices(): Promise<MonthlyInvoiceRow[]> {
  const res = await fetch("/api/invoices");
  const data = await parseOrThrow<{ invoices: MonthlyInvoiceRow[] }>(res);
  return data.invoices;
}

export async function payMonthlyInvoice(month: string): Promise<{ hostedInvoiceUrl: string | null; friendlyId: string }> {
  const res = await fetch(`/api/invoices/month/${encodeURIComponent(month)}/pay`, { method: "POST" });
  return parseOrThrow<{ hostedInvoiceUrl: string | null; friendlyId: string }>(res);
}

export async function syncListings(): Promise<Listing[]> {
  const res = await fetch("/api/listings/sync", { method: "POST" });
  const data = await parseOrThrow<{ listings: Listing[] }>(res);
  return data.listings;
}

export async function fetchLoyalty(): Promise<LoyaltyState> {
  const res = await fetch("/api/loyalty");
  return parseOrThrow<LoyaltyState>(res);
}

export async function redeemPoints(input: RedeemInput): Promise<RedeemResult> {
  const res = await fetch("/api/loyalty/redeem", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseOrThrow<RedeemResult>(res);
}

export interface CheckoutResult {
  listingId: string;
  hostedInvoiceUrl: string | null;
  status: string;
}

export async function checkoutListings(
  listingIds: string[],
  mode: "add_to_invoice" | "pay_now",
): Promise<CheckoutResult[]> {
  const res = await fetch("/api/listings/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ listingIds, mode }),
  });
  const data = await parseOrThrow<{ results: CheckoutResult[] }>(res);
  return data.results;
}

export async function grantLoyaltyPoints(points: number, note?: string): Promise<{ points: number; granted: number }> {
  const res = await fetch("/api/loyalty/admin/grant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ points, note }),
  });
  return parseOrThrow<{ points: number; granted: number }>(res);
}

export async function fetchServiceFees(): Promise<ServiceFeePartner[]> {
  const res = await fetch("/api/service-fees");
  const data = await parseOrThrow<{ partners: ServiceFeePartner[] }>(res);
  return data.partners;
}
