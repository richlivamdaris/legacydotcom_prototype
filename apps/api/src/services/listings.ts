import { createObituaryInvoice } from "./invoicing.js";
import {
  addListing,
  getListings,
  saveLoyalty,
  getLoyalty,
  markSeeded,
  isSeeded,
  nextFriendlyInvoiceId,
  feePercentFor,
  isBillingPartner,
  getMonthlyInvoices,
  type IssuedCard,
  type Listing,
  type PaymentMode,
  type PointsHistoryEntry,
} from "./store.js";
import { attachListingToMonthly, finalizeMonthlyInvoice, markMonthlyPaidOutOfBand } from "./monthly.js";
import { sendObituaryConfirmationEmail } from "./mailer.js";

const FH_EMAIL = "james@greenfieldFH.com";
const FH_NAME = "Greenfield Funeral Home";

function shortId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function todayFormatted(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export interface CreateListingInput {
  deceasedName: string;
  newspapers: string[];
  publicationDate?: string | null;
  amountUsd: number;
  paymentMode?: PaymentMode;
  notificationEmail?: string;
  dateOfDeath?: string | null;
  obituaryText?: string;
  asDraft?: boolean;
}

export interface CreateListingResult {
  listing: Listing;
  invoiceId: string | null;
  hostedInvoiceUrl: string | null;
  amountDueUsd: number;
  pointsEarned: number;
  emailPreviewUrl: string | null;
}

export async function createListing(input: CreateListingInput): Promise<CreateListingResult> {
  const { deceasedName, newspapers, publicationDate, amountUsd } = input;
  const paymentMode: PaymentMode = input.paymentMode ?? "on_account";
  const primaryNewspaper = newspapers[0] ?? "—";
  const partner = isBillingPartner(primaryNewspaper);
  const feePct = feePercentFor(primaryNewspaper);
  const friendlyInvoiceId = await nextFriendlyInvoiceId();
  const notificationEmail = input.notificationEmail ?? FH_EMAIL;

  let invoiceId: string | null = null;
  let invoiceHostedUrl: string | null = null;
  let amountDueUsd = 0;

  // asDraft overrides: skip all Stripe + monthly attach below, just save locally.
  // "invoice" = pay now: one-off Stripe invoice, not part of the monthly statement.
  // "on_account" = added to this month's running total; a single Stripe invoice
  //    is created only when the funeral home clicks Pay now on the monthly row.
  if (!input.asDraft && paymentMode === "invoice") {
    const invoice = await createObituaryInvoice({
      funeralHomeEmail: FH_EMAIL,
      funeralHomeName: FH_NAME,
      deceasedName,
      newspapers,
      amountUsd,
    });
    invoiceId = invoice.invoiceId;
    invoiceHostedUrl = invoice.hostedInvoiceUrl;
    amountDueUsd = invoice.amountDueUsd;
  }

  const createdAtIso = new Date().toISOString();

  const listing: Listing = {
    id: shortId("lst"),
    deceasedName,
    newspaper: primaryNewspaper,
    publicationDate: publicationDate ?? null,
    amountUsd,
    status: input.asDraft ? "draft" : publicationDate ? "upcoming" : "pending",
    submittedAt: todayFormatted(),
    createdAtIso,
    invoiceId,
    invoiceHostedUrl,
    friendlyInvoiceId,
    funeralHomeEmail: FH_EMAIL,
    funeralHomeName: FH_NAME,
    billingPartner: partner,
    feePercent: feePct,
    paymentMode,
    dateOfDeath: input.dateOfDeath ?? null,
    obituaryText: input.obituaryText ?? "",
  };

  await addListing(listing);

  if (!input.asDraft && paymentMode === "on_account") {
    await attachListingToMonthly(listing);
  }

  const pointsEarned = input.asDraft ? 0 : 30 + Math.max(0, newspapers.length - 1) * 15;
  if (!input.asDraft) {
    const loyalty = await getLoyalty();
    const historyEntry: PointsHistoryEntry = {
      id: shortId("h"),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      description: `Standard listing — submitted`,
      listingName: deceasedName,
      points: pointsEarned,
    };
    await saveLoyalty({
      ...loyalty,
      points: loyalty.points + pointsEarned,
      history: [historyEntry, ...loyalty.history],
    });
  }

  let emailPreviewUrl: string | null = null;
  if (!input.asDraft) {
    try {
      await sendObituaryConfirmationEmail({
        to: notificationEmail,
        funeralHomeName: FH_NAME,
        deceasedName,
        newspaper: primaryNewspaper,
        amountUsd,
        friendlyInvoiceId,
        invoiceHostedUrl,
        publicationDate: publicationDate ?? null,
        paymentMode,
      });
    } catch (err) {
      console.error("[listings] email send failed (non-fatal)", err instanceof Error ? err.message : err);
    }
  }

  return { listing, invoiceId, hostedInvoiceUrl: invoiceHostedUrl, amountDueUsd, pointsEarned, emailPreviewUrl };
}

function daysBeforeIso(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const GENERIC_OBIT = (name: string, place: string) =>
  `${name} passed away peacefully surrounded by family. A beloved member of the ${place} community, remembered for warmth, humour, and devotion to family. A funeral service will be held at the family's request.`;

const SEED_LISTINGS: CreateListingInput[] = [
  // All seed listings go on-account so they roll up into monthly statements.
  // Default paymentMode is "on_account" per createListing.
  { deceasedName: "Margaret L. Thompson", newspapers: ["Hartford Courant"], publicationDate: "2026-04-18", amountUsd: 142.0, dateOfDeath: daysBeforeIso("2026-04-18", 4), obituaryText: GENERIC_OBIT("Margaret L. Thompson", "Hartford") },
  { deceasedName: "Robert J. Carmichael", newspapers: ["New Haven Register"], publicationDate: "2026-04-17", amountUsd: 98.5, paymentMode: "invoice", dateOfDeath: daysBeforeIso("2026-04-17", 5), obituaryText: GENERIC_OBIT("Robert J. Carmichael", "New Haven") },
  { deceasedName: "Dorothy E. Finch", newspapers: ["Hartford Courant"], publicationDate: "2026-04-19", amountUsd: 118.0, dateOfDeath: daysBeforeIso("2026-04-19", 3), obituaryText: GENERIC_OBIT("Dorothy E. Finch", "Hartford") },
  { deceasedName: "Walter B. Haines", newspapers: ["Connecticut Post"], publicationDate: "2026-04-21", amountUsd: 86.0, dateOfDeath: daysBeforeIso("2026-04-21", 6), obituaryText: GENERIC_OBIT("Walter B. Haines", "Bridgeport") },
  { deceasedName: "Helen M. Crawford", newspapers: ["Hartford Courant"], publicationDate: "2026-04-15", amountUsd: 124.5, dateOfDeath: daysBeforeIso("2026-04-15", 2), obituaryText: GENERIC_OBIT("Helen M. Crawford", "Hartford") },
  { deceasedName: "Thomas A. Whitfield", newspapers: ["Hartford Courant"], publicationDate: "2026-04-12", amountUsd: 168.5, paymentMode: "invoice", dateOfDeath: daysBeforeIso("2026-04-12", 7), obituaryText: GENERIC_OBIT("Thomas A. Whitfield", "Hartford") },
  { deceasedName: "Patricia N. Holloway", newspapers: ["New Haven Register"], publicationDate: "2026-04-10", amountUsd: 92.0, dateOfDeath: daysBeforeIso("2026-04-10", 4), obituaryText: GENERIC_OBIT("Patricia N. Holloway", "New Haven") },
  { deceasedName: "George E. Stafford", newspapers: ["Hartford Courant"], publicationDate: "2026-04-07", amountUsd: 148.0, dateOfDeath: daysBeforeIso("2026-04-07", 3), obituaryText: GENERIC_OBIT("George E. Stafford", "Hartford") },
  { deceasedName: "Ellen B. Rosewood", newspapers: ["Connecticut Post"], publicationDate: "2026-04-05", amountUsd: 104.0, dateOfDeath: daysBeforeIso("2026-04-05", 5), obituaryText: GENERIC_OBIT("Ellen B. Rosewood", "Bridgeport") },
  { deceasedName: "Frederick J. Callahan", newspapers: ["New Haven Register"], publicationDate: "2026-04-03", amountUsd: 132.0, dateOfDeath: daysBeforeIso("2026-04-03", 8), obituaryText: GENERIC_OBIT("Frederick J. Callahan", "New Haven") },
  { deceasedName: "Edward T. Langston III", newspapers: ["Washington Post"], publicationDate: "2026-04-18", amountUsd: 4850.0, dateOfDeath: daysBeforeIso("2026-04-18", 6), obituaryText: GENERIC_OBIT("Edward T. Langston III", "Washington") },
  { deceasedName: "Vivian C. Marchetti", newspapers: ["Washington Post"], publicationDate: "2026-04-14", amountUsd: 3620.0, dateOfDeath: daysBeforeIso("2026-04-14", 4), obituaryText: GENERIC_OBIT("Vivian C. Marchetti", "Washington") },
  { deceasedName: "Archibald B. Whitmore", newspapers: ["New York Times"], publicationDate: "2026-04-16", amountUsd: 8200.0, dateOfDeath: daysBeforeIso("2026-04-16", 5), obituaryText: GENERIC_OBIT("Archibald B. Whitmore", "New York") },
  { deceasedName: "Cornelia S. Ashford-Hayes", newspapers: ["New York Times"], publicationDate: "2026-04-11", amountUsd: 6980.0, dateOfDeath: daysBeforeIso("2026-04-11", 3), obituaryText: GENERIC_OBIT("Cornelia S. Ashford-Hayes", "New York") },
  { deceasedName: "Harrington P. Beaumont", newspapers: ["Washington Post"], publicationDate: "2026-04-08", amountUsd: 5250.0, dateOfDeath: daysBeforeIso("2026-04-08", 7), obituaryText: GENERIC_OBIT("Harrington P. Beaumont", "Washington") },

  // ─── Historical monthly data so the Invoices tab shows multiple months ───
  // March 2026
  { deceasedName: "Jonathan R. Ashby", newspapers: ["Hartford Courant"], publicationDate: "2026-03-28", amountUsd: 138.0, dateOfDeath: daysBeforeIso("2026-03-28", 4), obituaryText: GENERIC_OBIT("Jonathan R. Ashby", "Hartford") },
  { deceasedName: "Nora P. Sullivan", newspapers: ["New Haven Register"], publicationDate: "2026-03-22", amountUsd: 96.0, paymentMode: "invoice", dateOfDeath: daysBeforeIso("2026-03-22", 5), obituaryText: GENERIC_OBIT("Nora P. Sullivan", "New Haven") },
  { deceasedName: "Charles W. Fenwick", newspapers: ["Connecticut Post"], publicationDate: "2026-03-18", amountUsd: 112.0, dateOfDeath: daysBeforeIso("2026-03-18", 3), obituaryText: GENERIC_OBIT("Charles W. Fenwick", "Bridgeport") },
  { deceasedName: "Beatrice H. Copeland", newspapers: ["Hartford Courant"], publicationDate: "2026-03-12", amountUsd: 126.0, dateOfDeath: daysBeforeIso("2026-03-12", 6), obituaryText: GENERIC_OBIT("Beatrice H. Copeland", "Hartford") },
  { deceasedName: "Samuel E. Driscoll", newspapers: ["New York Times"], publicationDate: "2026-03-09", amountUsd: 7400.0, dateOfDeath: daysBeforeIso("2026-03-09", 5), obituaryText: GENERIC_OBIT("Samuel E. Driscoll", "New York") },
  { deceasedName: "Lillian M. Kavanagh", newspapers: ["Washington Post"], publicationDate: "2026-03-04", amountUsd: 4120.0, dateOfDeath: daysBeforeIso("2026-03-04", 4), obituaryText: GENERIC_OBIT("Lillian M. Kavanagh", "Washington") },

  // February 2026
  { deceasedName: "Raymond J. Blackwood", newspapers: ["Hartford Courant"], publicationDate: "2026-02-25", amountUsd: 144.0, dateOfDeath: daysBeforeIso("2026-02-25", 3), obituaryText: GENERIC_OBIT("Raymond J. Blackwood", "Hartford") },
  { deceasedName: "Evelyn B. Hargrove", newspapers: ["New Haven Register"], publicationDate: "2026-02-20", amountUsd: 89.0, dateOfDeath: daysBeforeIso("2026-02-20", 4), obituaryText: GENERIC_OBIT("Evelyn B. Hargrove", "New Haven") },
  { deceasedName: "Frederick L. Merriweather", newspapers: ["Hartford Courant"], publicationDate: "2026-02-14", amountUsd: 162.0, dateOfDeath: daysBeforeIso("2026-02-14", 7), obituaryText: GENERIC_OBIT("Frederick L. Merriweather", "Hartford") },
  { deceasedName: "Adelaide P. Winterbourne", newspapers: ["New York Times"], publicationDate: "2026-02-08", amountUsd: 6450.0, dateOfDeath: daysBeforeIso("2026-02-08", 5), obituaryText: GENERIC_OBIT("Adelaide P. Winterbourne", "New York") },

  // January 2026
  { deceasedName: "Howard G. Pennington", newspapers: ["Connecticut Post"], publicationDate: "2026-01-30", amountUsd: 108.0, dateOfDeath: daysBeforeIso("2026-01-30", 5), obituaryText: GENERIC_OBIT("Howard G. Pennington", "Bridgeport") },
  { deceasedName: "Celeste N. Worthington", newspapers: ["Hartford Courant"], publicationDate: "2026-01-24", amountUsd: 136.0, paymentMode: "invoice", dateOfDeath: daysBeforeIso("2026-01-24", 3), obituaryText: GENERIC_OBIT("Celeste N. Worthington", "Hartford") },
  { deceasedName: "Bartholomew A. Ridgeway", newspapers: ["Washington Post"], publicationDate: "2026-01-18", amountUsd: 3890.0, dateOfDeath: daysBeforeIso("2026-01-18", 4), obituaryText: GENERIC_OBIT("Bartholomew A. Ridgeway", "Washington") },
  { deceasedName: "Harriet E. Kilgore", newspapers: ["New Haven Register"], publicationDate: "2026-01-10", amountUsd: 94.0, dateOfDeath: daysBeforeIso("2026-01-10", 6), obituaryText: GENERIC_OBIT("Harriet E. Kilgore", "New Haven") },

  // December 2025
  { deceasedName: "Reginald T. Ashcroft", newspapers: ["Hartford Courant"], publicationDate: "2025-12-28", amountUsd: 152.0, paymentMode: "invoice", dateOfDeath: daysBeforeIso("2025-12-28", 5), obituaryText: GENERIC_OBIT("Reginald T. Ashcroft", "Hartford") },
  { deceasedName: "Matilda R. Hightower", newspapers: ["New York Times"], publicationDate: "2025-12-20", amountUsd: 7120.0, dateOfDeath: daysBeforeIso("2025-12-20", 3), obituaryText: GENERIC_OBIT("Matilda R. Hightower", "New York") },
  { deceasedName: "Cornelius V. Holbrook", newspapers: ["Connecticut Post"], publicationDate: "2025-12-12", amountUsd: 102.0, dateOfDeath: daysBeforeIso("2025-12-12", 4), obituaryText: GENERIC_OBIT("Cornelius V. Holbrook", "Bridgeport") },

  // November 2025
  { deceasedName: "Seraphina Q. Underwood", newspapers: ["Hartford Courant"], publicationDate: "2025-11-26", amountUsd: 148.0, dateOfDeath: daysBeforeIso("2025-11-26", 5), obituaryText: GENERIC_OBIT("Seraphina Q. Underwood", "Hartford") },
  { deceasedName: "Percival M. Whitfield", newspapers: ["New Haven Register"], publicationDate: "2025-11-18", amountUsd: 92.0, dateOfDeath: daysBeforeIso("2025-11-18", 3), obituaryText: GENERIC_OBIT("Percival M. Whitfield", "New Haven") },

  // Pending — submitted but no publication date scheduled yet
  { deceasedName: "Mildred A. Pendleton", newspapers: ["Hartford Courant"], publicationDate: null, amountUsd: 138.0, dateOfDeath: daysBeforeIso("2026-04-20", 2), obituaryText: GENERIC_OBIT("Mildred A. Pendleton", "Hartford") },
  { deceasedName: "Oscar B. Tremayne", newspapers: ["New Haven Register"], publicationDate: null, amountUsd: 96.0, dateOfDeath: daysBeforeIso("2026-04-19", 3), obituaryText: GENERIC_OBIT("Oscar B. Tremayne", "New Haven") },
];

// Bump this when the seed/data model changes in a breaking way so startup
// knows to wipe the store and re-seed.
const SEED_VERSION = 4;

export async function ensureSeeded(): Promise<void> {
  const { readFile, unlink } = await import("node:fs/promises");
  const { existsSync } = await import("node:fs");
  const { resolve, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const here = dirname(fileURLToPath(import.meta.url));
  const storeDir = process.env.DATA_DIR
    ? resolve(process.env.DATA_DIR)
    : resolve(here, "../../store");

  // Detect seed version; wipe store if out-of-date.
  let currentVersion = 0;
  const versionFile = resolve(storeDir, "version.json");
  if (existsSync(versionFile)) {
    try {
      currentVersion = JSON.parse(await readFile(versionFile, "utf8")).version ?? 0;
    } catch {
      /* ignore */
    }
  }
  if (currentVersion < SEED_VERSION) {
    console.log(`[seed] data model v${currentVersion} < v${SEED_VERSION} — wiping store for clean re-seed`);
    for (const f of ["listings.json", "store.json", "counters.json", "monthlyInvoices.json"]) {
      const p = resolve(storeDir, f);
      if (existsSync(p)) await unlink(p);
    }
    // Preserve loyalty + cards across re-seeds
  }

  const existing = await getListings();
  const existingNames = new Set(existing.map((l) => l.deceasedName.toLowerCase()));

  const toCreate = SEED_LISTINGS.filter((s) => !existingNames.has(s.deceasedName.toLowerCase()));

  if (toCreate.length > 0) {
    console.log(`[seed] creating ${toCreate.length} seed listings…`);
    for (const l of toCreate) {
      try {
        await createListing(l);
      } catch (err) {
        console.error("[seed] failed for", l.deceasedName, err);
      }
    }
  }

  // Finalize historical months as paid so the Invoices tab shows a realistic
  // history. Current month stays "pending" (not yet billed).
  const now = new Date();
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthly = await getMonthlyInvoices();
  for (const rec of monthly) {
    if (rec.month < currentMonthKey && rec.status !== "paid") {
      console.log(`[seed] finalizing & marking paid monthly invoice ${rec.friendlyId} (${rec.listingIds.length} listings, $${rec.totalAmountUsd.toFixed(2)})`);
      try {
        await finalizeMonthlyInvoice(rec.month);
        await markMonthlyPaidOutOfBand(rec.month);
      } catch (err) {
        console.error(`[seed] failed to settle ${rec.friendlyId}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  // Mark historical paymentMode="invoice" (pay-now) listings as paid too, so
  // the demo shows them as Published alongside their on-account siblings.
  const allListings = await getListings();
  const payNowHistoricals = allListings.filter((l) =>
    l.paymentMode === "invoice"
    && l.invoiceId
    && l.status !== "published"
    && (l.publicationDate ?? l.createdAtIso.slice(0, 10)).slice(0, 7) < currentMonthKey
  );
  if (payNowHistoricals.length > 0) {
    const { stripe } = await import("./stripe.js");
    const { saveListings } = await import("./store.js");
    for (const l of payNowHistoricals) {
      try {
        await stripe.invoices.pay(l.invoiceId!, { paid_out_of_band: true });
        console.log(`[seed] marked pay-now listing paid: ${l.deceasedName} (${l.invoiceId})`);
      } catch (err) {
        console.warn(`[seed] could not mark pay-now paid for ${l.deceasedName}:`, err instanceof Error ? err.message : err);
      }
    }
    const updatedList = (await getListings()).map((l) =>
      payNowHistoricals.some((h) => h.id === l.id) ? { ...l, status: "published" as const } : l
    );
    await saveListings(updatedList);
  }

  if (!(await isSeeded())) await markSeeded();

  // Mark seed version so we don't wipe again next start-up.
  const { writeFile, mkdir } = await import("node:fs/promises");
  if (!existsSync(storeDir)) await mkdir(storeDir, { recursive: true });
  await writeFile(versionFile, JSON.stringify({ version: SEED_VERSION }, null, 2));

  await backfillListingFields();
  await ensureDraftListing();
  await ensureDummyCard();
}

// Adds a demo draft listing so the Listings tab shows the "Draft" status
// flow. Draft listings bypass Stripe (no invoice) and have status "draft".
async function ensureDraftListing(): Promise<void> {
  const listings = await getListings();
  if (listings.some((l) => l.status === "draft")) return;
  const { addListing } = await import("./store.js");
  const friendly = await nextFriendlyInvoiceId();
  const draft: Listing = {
    id: shortId("lst"),
    deceasedName: "Helen M. Crawford",
    newspaper: "—",
    publicationDate: null,
    amountUsd: 0,
    status: "draft",
    submittedAt: todayFormatted(),
    createdAtIso: new Date().toISOString(),
    invoiceId: null,
    invoiceHostedUrl: null,
    friendlyInvoiceId: friendly,
    funeralHomeEmail: FH_EMAIL,
    funeralHomeName: FH_NAME,
    billingPartner: false,
    feePercent: 0,
    paymentMode: "invoice",
    dateOfDeath: null,
    obituaryText: "",
  };
  console.log("[seed] adding draft listing");
  await addListing(draft);
}

// Older seed runs created listings without the new billingPartner, feePercent,
// friendlyInvoiceId, paymentMode, createdAtIso fields. Patch them in place so
// the UI has consistent data.
async function backfillListingFields(): Promise<void> {
  const listings = await getListings();
  let changed = false;
  const patched: Listing[] = [];
  for (const l of listings) {
    const rec = l as Partial<Listing> & Listing;
    const needsFriendly = !rec.friendlyInvoiceId;
    const needsPartner = rec.billingPartner === undefined;
    const needsFee = rec.feePercent === undefined;
    const needsMode = !rec.paymentMode;
    const needsCreatedAt = !rec.createdAtIso;
    const needsDod = rec.dateOfDeath === undefined;
    const needsObit = rec.obituaryText === undefined;
    if (needsFriendly || needsPartner || needsFee || needsMode || needsCreatedAt || needsDod || needsObit) {
      const seed = SEED_LISTINGS.find((s) => s.deceasedName.toLowerCase() === l.deceasedName.toLowerCase());
      patched.push({
        ...l,
        friendlyInvoiceId: rec.friendlyInvoiceId ?? (await nextFriendlyInvoiceId()),
        billingPartner: rec.billingPartner ?? isBillingPartner(l.newspaper),
        feePercent: rec.feePercent ?? feePercentFor(l.newspaper),
        paymentMode: rec.paymentMode ?? "invoice",
        createdAtIso: rec.createdAtIso ?? new Date().toISOString(),
        dateOfDeath: rec.dateOfDeath ?? seed?.dateOfDeath ?? null,
        obituaryText: rec.obituaryText ?? seed?.obituaryText ?? "",
      });
      changed = true;
    } else {
      patched.push(l);
    }
  }
  if (changed) {
    const { saveListings } = await import("./store.js");
    await saveListings(patched);
    console.log(`[seed] backfilled ${patched.length} listing(s) with new fields`);
  }
}

async function ensureDummyCard(): Promise<void> {
  const loyalty = await getLoyalty();
  if (loyalty.cards.length > 0) return;

  const dummyId = "ic_demo_1TOeLegacyDummy01";
  const dummy: IssuedCard = {
    id: dummyId,
    cardholderId: "ich_demo_greenfield",
    amountUsd: 25,
    last4: "4242",
    recipientEmail: "james@greenfieldFH.com",
    issuedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    dashboardUrl: `https://dashboard.stripe.com/test/issuing/cards/${dummyId}`,
  };

  const historyEntry: PointsHistoryEntry = {
    id: "h_demo_redemption",
    date: "Mar 20",
    description: "Redemption — $25 Virtual Card",
    listingName: null,
    points: -500,
    cardId: dummyId,
  };

  console.log("[seed] adding demo virtual card for the Loyalty history table");
  await saveLoyalty({
    ...loyalty,
    cards: [dummy],
    history: [...loyalty.history, historyEntry],
  });
}
