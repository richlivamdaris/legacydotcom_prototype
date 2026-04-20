import { Router } from "express";
import {
  createObituaryInvoice,
  getInvoice,
  listRecentInvoices,
} from "../services/invoicing.js";

export const stripeRouter: Router = Router();

stripeRouter.post("/invoices", async (req, res) => {
  const {
    funeralHomeEmail,
    funeralHomeName,
    deceasedName,
    newspapers,
    amountUsd,
  } = req.body ?? {};

  if (
    typeof funeralHomeEmail !== "string" ||
    typeof funeralHomeName !== "string" ||
    typeof deceasedName !== "string" ||
    !Array.isArray(newspapers) ||
    newspapers.length === 0 ||
    typeof amountUsd !== "number" ||
    amountUsd <= 0
  ) {
    return res.status(400).json({
      error:
        "Invalid request. Required: funeralHomeEmail, funeralHomeName, deceasedName, newspapers[], amountUsd>0",
    });
  }

  try {
    const result = await createObituaryInvoice({
      funeralHomeEmail,
      funeralHomeName,
      deceasedName,
      newspapers,
      amountUsd,
    });
    return res.status(201).json(result);
  } catch (err) {
    console.error("[stripe] createObituaryInvoice failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `Stripe error: ${message}` });
  }
});

stripeRouter.get("/invoices", async (_req, res) => {
  try {
    const invoices = await listRecentInvoices(20);
    return res.json({ invoices });
  } catch (err) {
    console.error("[stripe] listRecentInvoices failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `Stripe error: ${message}` });
  }
});

stripeRouter.get("/invoices/:id", async (req, res) => {
  try {
    const invoice = await getInvoice(req.params.id);
    return res.json(invoice);
  } catch (err) {
    console.error("[stripe] getInvoice failed", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(502).json({ error: `Stripe error: ${message}` });
  }
});
