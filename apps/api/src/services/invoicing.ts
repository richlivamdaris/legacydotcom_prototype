import type Stripe from "stripe";
import { stripe } from "./stripe.js";

export interface CreateObituaryInvoiceInput {
  funeralHomeEmail: string;
  funeralHomeName: string;
  deceasedName: string;
  newspapers: string[];
  amountUsd: number;
}

export interface CreateObituaryInvoiceResult {
  invoiceId: string;
  customerId: string;
  status: Stripe.Invoice.Status | null;
  hostedInvoiceUrl: string | null;
  amountDueUsd: number;
}

async function findOrCreateCustomer(
  email: string,
  name: string
): Promise<Stripe.Customer> {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data[0]) return existing.data[0];
  return stripe.customers.create({
    email,
    name,
    metadata: { source: "memoriams-portal-prototype" },
  });
}

export async function createObituaryInvoice(
  input: CreateObituaryInvoiceInput
): Promise<CreateObituaryInvoiceResult> {
  const { funeralHomeEmail, funeralHomeName, deceasedName, newspapers, amountUsd } =
    input;

  const customer = await findOrCreateCustomer(funeralHomeEmail, funeralHomeName);

  const amountCents = Math.round(amountUsd * 100);

  const invoice = await stripe.invoices.create({
    customer: customer.id,
    collection_method: "send_invoice",
    days_until_due: 30,
    auto_advance: false,
    description: `Memoriams obituary placement — ${deceasedName}`,
    metadata: {
      source: "memoriams-portal-prototype",
      deceased_name: deceasedName,
    },
  });

  if (!invoice.id) {
    throw new Error("Stripe did not return an invoice id.");
  }

  await stripe.invoiceItems.create({
    customer: customer.id,
    invoice: invoice.id,
    amount: amountCents,
    currency: "usd",
    description: `Obituary for ${deceasedName} — ${newspapers.join(", ")}`,
    metadata: {
      deceased_name: deceasedName,
      newspapers: newspapers.join("|"),
    },
  });

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

  return {
    invoiceId: finalized.id ?? invoice.id,
    customerId: customer.id,
    status: finalized.status,
    hostedInvoiceUrl: finalized.hosted_invoice_url ?? null,
    amountDueUsd: (finalized.amount_due ?? 0) / 100,
  };
}

export async function listRecentInvoices(limit = 10): Promise<
  Array<{
    id: string;
    status: Stripe.Invoice.Status | null;
    amountDueUsd: number;
    amountPaidUsd: number;
    hostedInvoiceUrl: string | null;
    customerEmail: string | null;
    description: string | null;
    created: number;
  }>
> {
  const list = await stripe.invoices.list({ limit });
  return list.data.map((inv) => ({
    id: inv.id ?? "",
    status: inv.status,
    amountDueUsd: (inv.amount_due ?? 0) / 100,
    amountPaidUsd: (inv.amount_paid ?? 0) / 100,
    hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    customerEmail: inv.customer_email ?? null,
    description: inv.description ?? null,
    created: inv.created,
  }));
}

export async function getInvoice(id: string) {
  const inv = await stripe.invoices.retrieve(id);
  return {
    id: inv.id ?? "",
    status: inv.status,
    amountDueUsd: (inv.amount_due ?? 0) / 100,
    amountPaidUsd: (inv.amount_paid ?? 0) / 100,
    hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    customerEmail: inv.customer_email ?? null,
    description: inv.description ?? null,
    created: inv.created,
  };
}
