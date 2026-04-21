import { Router } from "express";
import { getLoyalty } from "../services/store.js";
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
