export interface InvoiceSummary {
  id: string;
  status: string | null;
  amountDueUsd: number;
  amountPaidUsd: number;
  hostedInvoiceUrl: string | null;
  customerEmail: string | null;
  description: string | null;
  created: number;
}

export interface CreateInvoiceInput {
  funeralHomeEmail: string;
  funeralHomeName: string;
  deceasedName: string;
  newspapers: string[];
  amountUsd: number;
}

export interface CreateInvoiceResult {
  invoiceId: string;
  customerId: string;
  status: string | null;
  hostedInvoiceUrl: string | null;
  amountDueUsd: number;
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      (body as { error?: string }).error ?? `${res.status} ${res.statusText}`;
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function createInvoice(
  input: CreateInvoiceInput
): Promise<CreateInvoiceResult> {
  const res = await fetch("/api/invoices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseOrThrow<CreateInvoiceResult>(res);
}

export async function listInvoices(): Promise<InvoiceSummary[]> {
  const res = await fetch("/api/invoices");
  const data = await parseOrThrow<{ invoices: InvoiceSummary[] }>(res);
  return data.invoices;
}

export async function getInvoice(id: string): Promise<InvoiceSummary> {
  const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`);
  return parseOrThrow<InvoiceSummary>(res);
}
