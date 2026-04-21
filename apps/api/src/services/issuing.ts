import { stripe } from "./stripe.js";
import { getLoyalty, saveLoyalty, type IssuedCard, type PointsHistoryEntry } from "./store.js";

const FH_NAME = "Greenfield Funeral Home";
const FH_EMAIL = "james@greenfieldFH.com";

function shortId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureCardholder(): Promise<string> {
  const loyalty = await getLoyalty();
  if (loyalty.cardholderId) {
    try {
      await stripe.issuing.cardholders.retrieve(loyalty.cardholderId);
      return loyalty.cardholderId;
    } catch {
      // stale id — fall through and recreate
    }
  }

  const cardholder = await stripe.issuing.cardholders.create({
    type: "individual",
    name: "James Greenfield",
    email: FH_EMAIL,
    phone_number: "+15555550143",
    billing: {
      address: {
        line1: "142 Elm Street",
        city: "Hartford",
        state: "CT",
        postal_code: "06103",
        country: "US",
      },
    },
    metadata: {
      source: "legacy-prototype",
      funeral_home: FH_NAME,
    },
  });

  const next = { ...loyalty, cardholderId: cardholder.id };
  await saveLoyalty(next);
  return cardholder.id;
}

export interface IssueRewardCardInput {
  amountUsd: number;
  pointsCost: number;
  recipientEmail: string;
}

export interface IssueRewardCardResult {
  cardId: string;
  last4: string;
  expMonth: number;
  expYear: number;
  amountUsd: number;
  remainingPoints: number;
  dashboardUrl: string;
}

export async function issueRewardCard(input: IssueRewardCardInput): Promise<IssueRewardCardResult> {
  const { amountUsd, pointsCost, recipientEmail } = input;

  const loyalty = await getLoyalty();
  if (loyalty.points < pointsCost) {
    throw new Error(`Not enough points. Need ${pointsCost}, have ${loyalty.points}.`);
  }

  const cardholderId = await ensureCardholder();

  const card = await stripe.issuing.cards.create({
    cardholder: cardholderId,
    currency: "usd",
    type: "virtual",
    status: "active",
    spending_controls: {
      spending_limits: [
        { amount: Math.round(amountUsd * 100), interval: "all_time" },
      ],
    },
    metadata: {
      source: "legacy-prototype",
      recipient_email: recipientEmail,
      points_cost: String(pointsCost),
      reward_amount_usd: String(amountUsd),
    },
  });

  const dashboardUrl = `https://dashboard.stripe.com/test/issuing/cards/${card.id}`;

  const issuedCard: IssuedCard = {
    id: card.id,
    cardholderId,
    amountUsd,
    last4: card.last4 ?? "••••",
    recipientEmail,
    issuedAt: new Date().toISOString(),
    dashboardUrl,
  };

  const historyEntry: PointsHistoryEntry = {
    id: shortId("h"),
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    description: `Redemption — $${amountUsd} Virtual Card`,
    listingName: null,
    points: -pointsCost,
    cardId: card.id,
  };

  const nextLoyalty = {
    ...loyalty,
    cardholderId,
    points: loyalty.points - pointsCost,
    cards: [issuedCard, ...loyalty.cards],
    history: [historyEntry, ...loyalty.history],
  };
  await saveLoyalty(nextLoyalty);

  console.log(
    `[issuing] card=${card.id} amount=$${amountUsd} last4=${card.last4} recipient=${recipientEmail} (email send simulated)`
  );

  return {
    cardId: card.id,
    last4: card.last4 ?? "••••",
    expMonth: card.exp_month ?? 12,
    expYear: card.exp_year ?? new Date().getFullYear() + 3,
    amountUsd,
    remainingPoints: nextLoyalty.points,
    dashboardUrl,
  };
}

export async function getCardNumber(cardId: string): Promise<{ number: string; cvc: string }> {
  const card = await stripe.issuing.cards.retrieve(cardId, { expand: ["number", "cvc"] });
  return {
    number: (card as { number?: string }).number ?? "",
    cvc: (card as { cvc?: string }).cvc ?? "",
  };
}
