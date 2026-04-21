import { Router } from "express";
import { getListings } from "../services/store.js";
import { createListing } from "../services/listings.js";

export const listingsRouter: Router = Router();

listingsRouter.get("/", async (_req, res) => {
  try {
    const listings = await getListings();
    return res.json({ listings });
  } catch (err) {
    console.error("[listings] list failed", err);
    return res.status(500).json({ error: "Failed to load listings" });
  }
});

listingsRouter.post("/", async (req, res) => {
  const { deceasedName, newspapers, publicationDate, amountUsd } = req.body ?? {};

  if (
    typeof deceasedName !== "string" ||
    deceasedName.trim().length === 0 ||
    !Array.isArray(newspapers) ||
    newspapers.length === 0 ||
    typeof amountUsd !== "number" ||
    amountUsd <= 0
  ) {
    return res.status(400).json({
      error: "Invalid request. Required: deceasedName, newspapers[], amountUsd>0. Optional: publicationDate",
    });
  }

  try {
    const result = await createListing({
      deceasedName: deceasedName.trim(),
      newspapers,
      publicationDate: typeof publicationDate === "string" ? publicationDate : null,
      amountUsd,
    });
    return res.status(201).json(result);
  } catch (err) {
    console.error("[listings] create failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `Failed to create listing: ${message}` });
  }
});
