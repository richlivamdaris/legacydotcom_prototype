import { Router } from "express";
import { getLoyalty, saveLoyalty, type PointsHistoryEntry } from "../services/store.js";
import { issueRewardCard } from "../services/issuing.js";

export const loyaltyRouter: Router = Router();

loyaltyRouter.get("/", async (_req, res) => {
  try {
    const loyalty = await getLoyalty();
    return res.json(loyalty);
  } catch (err) {
    console.error("[loyalty] get failed", err);
    return res.status(500).json({ error: "Failed to load loyalty state" });
  }
});

// Admin-only demo control: adjust the loyalty balance by an arbitrary
// non-zero integer (defaults to +500). Negative values deduct — the balance
// is clamped at 0 and the history entry reflects the actual delta applied.
loyaltyRouter.post("/admin/grant", async (req, res) => {
  const raw = (req.body ?? {}) as { points?: unknown; note?: unknown };
  const requested = typeof raw.points === "number" && Number.isFinite(raw.points) && raw.points !== 0
    ? Math.trunc(raw.points)
    : 500;
  const isDeduction = requested < 0;
  const defaultNote = isDeduction ? "Admin deduction" : "Admin bonus";
  const note = typeof raw.note === "string" && raw.note.trim() !== ""
    ? raw.note.trim()
    : defaultNote;
  try {
    const loyalty = await getLoyalty();
    const newBalance = Math.max(0, loyalty.points + requested);
    const applied = newBalance - loyalty.points; // might be smaller than requested if we hit the floor
    const entry: PointsHistoryEntry = {
      id: `h_${Math.random().toString(36).slice(2, 10)}`,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      description: note,
      listingName: null,
      points: applied,
    };
    const next = { ...loyalty, points: newBalance, history: [entry, ...loyalty.history] };
    await saveLoyalty(next);
    return res.json({ points: next.points, granted: applied });
  } catch (err) {
    console.error("[loyalty] admin grant failed", err);
    return res.status(500).json({ error: "Failed to adjust points" });
  }
});

loyaltyRouter.post("/redeem", async (req, res) => {
  const { amountUsd, pointsCost, recipientEmail } = req.body ?? {};

  if (
    typeof amountUsd !== "number" ||
    amountUsd <= 0 ||
    typeof pointsCost !== "number" ||
    pointsCost <= 0 ||
    typeof recipientEmail !== "string" ||
    !recipientEmail.includes("@")
  ) {
    return res.status(400).json({
      error: "Invalid request. Required: amountUsd>0, pointsCost>0, recipientEmail",
    });
  }

  try {
    const result = await issueRewardCard({ amountUsd, pointsCost, recipientEmail });
    return res.status(201).json(result);
  } catch (err) {
    console.error("[loyalty] redeem failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `Failed to issue card: ${message}` });
  }
});
