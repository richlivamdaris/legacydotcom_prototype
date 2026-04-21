import { useState } from "react";
import type { InvoiceRow } from "./api.js";
import { InvoiceStatusBadge, formatCurrency } from "./shared.js";

interface Props {
  invoices: InvoiceRow[];
  onRefresh: () => Promise<void> | void;
}

type Filter = "all" | "upcoming" | "paid";

export function InvoicesTab({ invoices, onRefresh }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = invoices.filter((inv) => {
    if (filter === "all") return true;
    if (filter === "paid") return inv.status === "paid";
    if (filter === "upcoming") return inv.status === "open" || inv.status === "draft" || inv.status === "uncollectible";
    return true;
  });

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Invoice history</div>
        <span className="card-action" onClick={() => void onRefresh()}>Refresh</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 0 16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "#f5f7f9", borderRadius: 8, padding: 4 }}>
          {(["all", "upcoming", "paid"] as Filter[]).map((f) => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "upcoming" ? "Upcoming" : "Paid"}
            </button>
          ))}
        </div>
        <span className="filter-count">{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <table className="listing-table">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Deceased</th>
            <th>Newspaper</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={7} className="empty">No invoices match.</td></tr>
          )}
          {filtered.map((inv) => {
            const isPaid = inv.status === "paid";
            const amount = isPaid ? inv.amountPaidUsd : inv.amountDueUsd;
            const created = new Date(inv.created * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            return (
              <tr key={inv.id}>
                <td><span style={{ fontSize: 13, letterSpacing: "0.02em", color: "#666" }}>{inv.id.slice(0, 18)}…</span></td>
                <td>{inv.deceasedName}</td>
                <td style={{ color: "#666" }}>{inv.newspaper}</td>
                <td><span className={`inv-amount ${isPaid ? "green" : ""}`}>{formatCurrency(amount)}</span></td>
                <td><InvoiceStatusBadge status={inv.status} /></td>
                <td style={{ color: "#888" }}>{created}</td>
                <td>
                  {isPaid ? (
                    inv.hostedInvoiceUrl ? (
                      <a className="btn-view" href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer">View</a>
                    ) : (
                      <button className="btn-view" disabled>View</button>
                    )
                  ) : inv.hostedInvoiceUrl ? (
                    <a className="btn-pay" href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "inline-block" }}>Pay now</a>
                  ) : (
                    <button className="btn-pay" disabled>Pay now</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 12px", borderTop: "1px solid #f0f3f7", marginTop: 4 }}>
        <div style={{ fontSize: 13, color: "#888" }}>
          Pay flow uses Stripe's hosted invoice page. After paying, click <span className="text-link" onClick={() => void onRefresh()}>Refresh</span> or wait for the webhook.
        </div>
      </div>
    </div>
  );
}
