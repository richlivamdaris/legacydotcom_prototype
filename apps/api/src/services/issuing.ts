import type Stripe from "stripe";
import { stripe } from "./stripe.js";
import { getLoyalty, saveLoyalty, type IssuedCard, type PointsHistoryEntry } from "./store.js";
import { sendRewardCardEmail } from "./mailer.js";

const FH_NAME = "Greenfield Funeral Home";
const FH_EMAIL = "james@greenfieldFH.com";

// Individual-type cardholders require first_name + last_name + dob + Authorized
// User Terms acceptance before any issued card can be activated. Without these,
// card creation fails with "outstanding requirements".
// Docs: https://docs.stripe.com/issuing/other/choose-cardholder
function buildIndividual(): Stripe.Issuing.CardholderCreateParams.Individual {
  return {
    first_name: "James",
    last_name: "Greenfield",
    dob: { day: 14, month: 6, year: 1978 },
    card_issuing: {
      user_terms_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: "127.0.0.1",
        user_agent: "legacy-prototype/1.0",
      },
    },
  };
}

function cardholderCommonParams(): Omit<Stripe.Issuing.CardholderCreateParams, "type"> {
  return {
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
    individual: buildIndividual(),
    metadata: {
      source: "legacy-prototype",
      funeral_home: FH_NAME,
    },
  };
}

function shortId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureCardholder(): Promise<string> {
  const loyalty = await getLoyalty();

  if (loyalty.cardholderId) {
    try {
      const existing = await stripe.issuing.cardholders.retrieve(loyalty.cardholderId);
      // Top up required individual fields if past_due requirements are present
      // (e.g. the cardholder was created by an earlier version that only sent
      // a top-level `name`). Updating is idempotent.
      const pastDue = existing.requirements?.past_due ?? [];
      if (pastDue.length > 0) {
        console.log(
          `[issuing] cardholder ${existing.id} has past_due=${JSON.stringify(pastDue)} — patching individual fields`
        );
        await stripe.issuing.cardholders.update(existing.id, {
          individual: buildIndividual(),
        });
      }
      return existing.id;
    } catch (err) {
      console.warn("[issuing] stored cardholder id unusable, recreating:", err instanceof Error ? err.message : err);
    }
  }

  const cardholder = await stripe.issuing.cardholders.create({
    type: "individual",
    ...cardholderCommonParams(),
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
    `[issuing] card=${card.id} amount=$${amountUsd} last4=${card.last4} recipient=${recipientEmail}`
  );

  try {
    await sendRewardCardEmail({
      to: recipientEmail,
      amountUsd,
      last4: card.last4 ?? "••••",
      expMonth: card.exp_month ?? 12,
      expYear: card.exp_year ?? new Date().getFullYear() + 3,
      dashboardUrl,
    });
  } catch (err) {
    console.error("[issuing] email send failed (non-fatal)", err instanceof Error ? err.message : err);
  }

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
