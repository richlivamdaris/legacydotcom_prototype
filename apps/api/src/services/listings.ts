import { createObituaryInvoice } from "./invoicing.js";
import { addListing, getListings, saveLoyalty, getLoyalty, markSeeded, isSeeded, type IssuedCard, type Listing, type PointsHistoryEntry } from "./store.js";

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
}

export interface CreateListingResult {
  listing: Listing;
  invoiceId: string;
  hostedInvoiceUrl: string | null;
  amountDueUsd: number;
  pointsEarned: number;
}

export async function createListing(input: CreateListingInput): Promise<CreateListingResult> {
  const { deceasedName, newspapers, publicationDate, amountUsd } = input;

  const invoice = await createObituaryInvoice({
    funeralHomeEmail: FH_EMAIL,
    funeralHomeName: FH_NAME,
    deceasedName,
    newspapers,
    amountUsd,
  });

  const listing: Listing = {
    id: shortId("lst"),
    deceasedName,
    newspaper: newspapers[0] ?? "—",
    publicationDate: publicationDate ?? null,
    amountUsd,
    status: publicationDate ? "upcoming" : "pending",
    submittedAt: todayFormatted(),
    invoiceId: invoice.invoiceId,
    invoiceHostedUrl: invoice.hostedInvoiceUrl,
    funeralHomeEmail: FH_EMAIL,
    funeralHomeName: FH_NAME,
  };

  await addListing(listing);

  // Award loyalty points: 30 base + 15 per additional newspaper
  const pointsEarned = 30 + Math.max(0, newspapers.length - 1) * 15;
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

  return {
    listing,
    invoiceId: invoice.invoiceId,
    hostedInvoiceUrl: invoice.hostedInvoiceUrl,
    amountDueUsd: invoice.amountDueUsd,
    pointsEarned,
  };
}

const SEED_LISTINGS: CreateListingInput[] = [
  { deceasedName: "Margaret L. Thompson", newspapers: ["Hartford Courant"], publicationDate: "2026-04-18", amountUsd: 142.0 },
  { deceasedName: "Robert J. Carmichael", newspapers: ["New Haven Register"], publicationDate: "2026-04-17", amountUsd: 98.5 },
  { deceasedName: "Dorothy E. Finch", newspapers: ["Hartford Courant"], publicationDate: "2026-04-19", amountUsd: 118.0 },
  { deceasedName: "Walter B. Haines", newspapers: ["Connecticut Post"], publicationDate: "2026-04-21", amountUsd: 86.0 },
];

export async function ensureSeeded(): Promise<void> {
  if (!(await isSeeded())) {
    const existing = await getListings();
    if (existing.length === 0) {
      console.log("[seed] creating sample listings & invoices…");
      for (const l of SEED_LISTINGS) {
        try {
          await createListing(l);
        } catch (err) {
          console.error("[seed] failed for", l.deceasedName, err);
        }
      }
    }
    await markSeeded();
  }

  await ensureDummyCard();
}

// Seed a demo virtual card so the Loyalty tab's "Redeemed" column has
// something to show before the real Stripe Issuing account is activated.
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
