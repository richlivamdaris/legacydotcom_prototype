import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const STORE_DIR = process.env.DATA_DIR
  ? resolve(process.env.DATA_DIR)
  : resolve(here, "../../store");

// Billing partners get service-fee style commission instead of listing-fee
// invoices. Non-partners are invoiced the full amount to the funeral home.
export const BILLING_PARTNERS: Record<string, { feePercent: number }> = {
  "Hartford Courant": { feePercent: 2.0 },
  "Washington Post": { feePercent: 1.0 },
  "New York Times": { feePercent: 0.5 },
};

export function isBillingPartner(newspaper: string): boolean {
  return Object.prototype.hasOwnProperty.call(BILLING_PARTNERS, newspaper);
}

export function feePercentFor(newspaper: string): number {
  return BILLING_PARTNERS[newspaper]?.feePercent ?? 0;
}

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
  funeralHomeEmail: string;
  funeralHomeName: string;
  billingPartner: boolean;
  feePercent: number;
  paymentMode: PaymentMode;
  dateOfDeath: string | null;
  obituaryText: string;
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

interface CounterState {
  invoiceCounterByMonth: Record<string, number>; // "YYYY-MM" → next number
}

export type MonthlyInvoiceStatus = "pending" | "open" | "paid" | "uncollectible" | "void";

export interface MonthlyInvoiceRecord {
  month: string;                         // "YYYY-MM"
  stripeInvoiceId: string | null;        // set when finalized
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  status: MonthlyInvoiceStatus;
  listingIds: string[];
  totalAmountUsd: number;
  createdAtIso: string;
  finalizedAtIso: string | null;
  paidAtIso: string | null;
  friendlyId: string;                    // "INV-YYYY-MM"
}

interface StoreShape {
  listings: Listing[];
  loyalty: LoyaltyState;
  seeded: boolean;
}

const DEFAULT_LOYALTY: LoyaltyState = {
  points: 1320,
  cardholderId: null,
  history: [
    { id: "h1", date: "Apr 18", description: "Standard listing — published", listingName: "Margaret L. Thompson", points: 45 },
    { id: "h2", date: "Apr 17", description: "Standard listing — published", listingName: "Robert J. Carmichael", points: 30 },
    { id: "h3", date: "Apr 15", description: "Monthly bonus (10+ listings)", listingName: null, points: 100 },
    { id: "h4", date: "Apr 7",  description: "Standard listing — published", listingName: "George E. Stafford", points: 52 },
  ],
  cards: [],
};

async function ensureStoreDir() {
  if (!existsSync(STORE_DIR)) await mkdir(STORE_DIR, { recursive: true });
}

type StoreFile = keyof StoreShape | "store" | "counters" | "monthlyInvoices";

function filePath(name: StoreFile) {
  return resolve(STORE_DIR, `${name}.json`);
}

async function readJson<T>(name: StoreFile, fallback: T): Promise<T> {
  const p = filePath(name);
  if (!existsSync(p)) return fallback;
  try {
    const txt = await readFile(p, "utf8");
    return JSON.parse(txt) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(name: StoreFile, data: unknown) {
  await ensureStoreDir();
  await writeFile(filePath(name), JSON.stringify(data, null, 2), "utf8");
}

export async function getMonthlyInvoices(): Promise<MonthlyInvoiceRecord[]> {
  return readJson<MonthlyInvoiceRecord[]>("monthlyInvoices", []);
}

export async function saveMonthlyInvoices(records: MonthlyInvoiceRecord[]): Promise<void> {
  await writeJson("monthlyInvoices", records);
}

export async function upsertMonthlyInvoice(month: string, patch: Partial<MonthlyInvoiceRecord>): Promise<MonthlyInvoiceRecord> {
  const all = await getMonthlyInvoices();
  const idx = all.findIndex((m) => m.month === month);
  const [y, mo] = month.split("-");
  const base: MonthlyInvoiceRecord = idx >= 0 ? all[idx] : {
    month,
    stripeInvoiceId: null,
    hostedInvoiceUrl: null,
    invoicePdfUrl: null,
    status: "pending",
    listingIds: [],
    totalAmountUsd: 0,
    createdAtIso: new Date().toISOString(),
    finalizedAtIso: null,
    paidAtIso: null,
    friendlyId: `INV-${y}-${mo}`,
  };
  const next: MonthlyInvoiceRecord = { ...base, ...patch };
  if (idx >= 0) all[idx] = next;
  else all.push(next);
  await saveMonthlyInvoices(all);
  return next;
}

export async function getListings(): Promise<Listing[]> {
  return readJson<Listing[]>("listings", []);
}

export async function saveListings(l: Listing[]): Promise<void> {
  await writeJson("listings", l);
}

export async function addListing(l: Listing): Promise<void> {
  const all = await getListings();
  all.unshift(l);
  await saveListings(all);
}

export async function getLoyalty(): Promise<LoyaltyState> {
  return readJson<LoyaltyState>("loyalty", DEFAULT_LOYALTY);
}

export async function saveLoyalty(s: LoyaltyState): Promise<void> {
  await writeJson("loyalty", s);
}

export async function isSeeded(): Promise<boolean> {
  const s = await readJson<{ seeded: boolean }>("store", { seeded: false });
  return s.seeded === true;
}

export async function markSeeded(): Promise<void> {
  await writeJson("store", { seeded: true });
}

export async function nextFriendlyInvoiceId(now: Date = new Date()): Promise<string> {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const key = `${year}-${month}`;
  const counters = await readJson<CounterState>("counters", { invoiceCounterByMonth: {} });
  const next = (counters.invoiceCounterByMonth[key] ?? 0) + 1;
  counters.invoiceCounterByMonth[key] = next;
  await writeJson("counters", counters);
  return `LGC-${year}-${month}-${String(next).padStart(4, "0")}`;
}
