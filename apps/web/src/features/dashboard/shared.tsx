import type { Listing } from "./api.js";

export function formatCurrency(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `$${v.toFixed(2)}`;
}

const STATUS_LABEL: Record<Listing["status"], string> = {
  draft: "Draft",
  pending: "Pending",
  upcoming: "Scheduled",
  published: "Published",
};

export function StatusBadge({ status }: { status: Listing["status"] }) {
  return <span className={`badge ${status}`}>{STATUS_LABEL[status]}</span>;
}

export function InvoiceStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="badge draft">—</span>;
  if (status === "paid") return <span className="badge paid">Paid</span>;
  if (status === "open") return <span className="badge upcoming">Open</span>;
  if (status === "draft") return <span className="badge draft">Draft</span>;
  if (status === "uncollectible") return <span className="badge overdue">Overdue</span>;
  if (status === "void") return <span className="badge draft">Void</span>;
  return <span className="badge draft">{status}</span>;
}
