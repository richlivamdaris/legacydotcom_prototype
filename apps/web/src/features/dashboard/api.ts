export interface Listing {
  id: string;
  deceasedName: string;
  newspaper: string;
  publicationDate: string | null;
  amountUsd: number;
  status: "draft" | "pending" | "upcoming" | "published";
  submittedAt: string;
  invoiceId: string | null;
  invoiceHostedUrl: string | null;
}

export interface InvoiceRow {
  id: string;
  status: string | null;
  amountDueUsd: number;
  amountPaidUsd: number;
  hostedInvoiceUrl: string | null;
  description: string | null;
  created: number;
  deceasedName: string;
  newspaper: string;
  listingId: string;
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

export interface CreateListingInput {
  deceasedName: string;
  newspapers: string[];
  publicationDate: string | null;
  amountUsd: number;
}

export interface CreateListingResult {
  listing: Listing;
  invoiceId: string;
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

export async function createListing(input: CreateListingInput): Promise<CreateListingResult> {
  const res = await fetch("/api/listings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseOrThrow<CreateListingResult>(res);
}

export async function fetchInvoices(): Promise<InvoiceRow[]> {
  const res = await fetch("/api/invoices");
  const data = await parseOrThrow<{ invoices: InvoiceRow[] }>(res);
  return data.invoices;
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
