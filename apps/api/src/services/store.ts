import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const STORE_DIR = resolve(here, "../../store");

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
  funeralHomeEmail: string;
  funeralHomeName: string;
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

interface StoreShape {
  listings: Listing[];
  loyalty: LoyaltyState;
  seeded: boolean;
}

const DEFAULT_STATE: StoreShape = {
  listings: [],
  loyalty: {
    points: 1320,
    cardholderId: null,
    history: [
      { id: "h1", date: "Apr 18", description: "Standard listing — published", listingName: "Margaret L. Thompson", points: 45 },
      { id: "h2", date: "Apr 17", description: "Standard listing — published", listingName: "Robert J. Carmichael", points: 30 },
      { id: "h3", date: "Apr 15", description: "Monthly bonus (10+ listings)", listingName: null, points: 100 },
      { id: "h4", date: "Apr 7",  description: "Standard listing — published", listingName: "George E. Stafford", points: 52 },
    ],
    cards: [],
  },
  seeded: false,
};

async function ensureStoreDir() {
  if (!existsSync(STORE_DIR)) await mkdir(STORE_DIR, { recursive: true });
}

function filePath(name: keyof StoreShape | "store") {
  return resolve(STORE_DIR, `${name}.json`);
}

async function readJson<T>(name: keyof StoreShape | "store", fallback: T): Promise<T> {
  const p = filePath(name);
  if (!existsSync(p)) return fallback;
  try {
    const txt = await readFile(p, "utf8");
    return JSON.parse(txt) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(name: keyof StoreShape | "store", data: unknown) {
  await ensureStoreDir();
  await writeFile(filePath(name), JSON.stringify(data, null, 2), "utf8");
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
  return readJson<LoyaltyState>("loyalty", DEFAULT_STATE.loyalty);
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
