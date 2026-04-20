import { useEffect, useState } from "react";
import type { InvoiceSummary } from "./api.js";
import { listInvoices } from "./api.js";

interface Props {
  refreshToken: number;
}

export function InvoiceList({ refreshToken }: Props) {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await listInvoices();
        if (!cancelled) setInvoices(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load invoices");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refreshToken]);

  return (
    <div className="card">
      <h2>Recent invoices</h2>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && invoices.length === 0 && (
        <div className="alert alert-info">Loading…</div>
      )}
      {!loading && invoices.length === 0 && !error && (
        <div className="alert alert-info">
          No invoices yet. Create one on the left — auto-refreshes every 5s.
        </div>
      )}

      {invoices.map((inv) => (
        <div key={inv.id} className="invoice-row">
          <div>
            <div>
              <strong>{inv.description ?? "(no description)"}</strong>
            </div>
            <div className="meta">
              {inv.customerEmail ?? "no email"} · {inv.id}
            </div>
            {inv.hostedInvoiceUrl && inv.status !== "paid" && (
              <a
                className="cta"
                href={inv.hostedInvoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Pay on Stripe →
              </a>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="amount">
              ${(inv.status === "paid" ? inv.amountPaidUsd : inv.amountDueUsd).toFixed(2)}
            </div>
            <div className={`status status-${inv.status ?? "draft"}`}>
              {inv.status ?? "draft"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
