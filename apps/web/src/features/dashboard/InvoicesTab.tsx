import { useEffect, useMemo, useState } from "react";
import type { MonthlyInvoiceRow, MonthlyInvoiceStatus } from "./api.js";
import { payMonthlyInvoice } from "./api.js";
import { formatCurrency, InfoIcon } from "./shared.js";
import { openPaymentPopup } from "./paymentPopup.js";

interface Props {
  invoices: MonthlyInvoiceRow[];
  onRefresh: () => Promise<void> | void;
  simulateError: boolean;
  onPayError: () => void;
}

type Filter = "all" | "upcoming" | "paid";

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function statusLabel(s: MonthlyInvoiceStatus): string {
  if (s === "pending") return "Upcoming";
  if (s === "open") return "Upcoming";
  if (s === "paid") return "Paid";
  if (s === "uncollectible") return "Overdue";
  if (s === "void") return "Void";
  return s;
}

function statusClass(s: MonthlyInvoiceStatus): string {
  if (s === "paid") return "badge paid";
  if (s === "uncollectible") return "badge overdue";
  if (s === "void") return "badge draft";
  return "badge upcoming";
}

export function InvoicesTab({ invoices, onRefresh, simulateError, onPayError }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [downloading, setDownloading] = useState(false);
  const [openRow, setOpenRow] = useState<MonthlyInvoiceRow | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  const years = useMemo(() => {
    const s = new Set<string>();
    invoices.forEach((g) => s.add(g.month.slice(0, 4)));
    return Array.from(s).sort().reverse();
  }, [invoices]);

  const filtered = invoices.filter((g) => {
    if (filter === "paid" && g.status !== "paid") return false;
    if (filter === "upcoming" && g.status === "paid") return false;
    if (yearFilter !== "all" && g.month.slice(0, 4) !== yearFilter) return false;
    return true;
  });

  async function downloadAllPdfZip() {
    setDownloading(true);
    try {
      const res = await fetch("/api/invoices/download-zip");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `${res.status} ${res.statusText}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `legacy-monthly-invoices-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Could not download invoice PDFs: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDownloading(false);
    }
  }

  function downloadCsv() {
    const header = ["month_id", "period", "status", "listings", "total_usd", "stripe_id", "hosted_url", "due_date"].join(",");
    const rows = filtered.map((g) =>
      [g.friendlyId, g.periodLabel, g.status, g.listingCount, g.totalAmountUsd.toFixed(2), g.stripeInvoiceId ?? "", g.hostedInvoiceUrl ?? "", g.dueDate]
        .map(csvEscape).join(",")
    );
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `legacy-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function payMonth(g: MonthlyInvoiceRow) {
    if (simulateError) { onPayError(); return; }
    setPaying(g.month);
    try {
      let url = g.hostedInvoiceUrl;
      if (!url) {
        // Pending — finalize the Stripe invoice now and get its hosted URL
        const result = await payMonthlyInvoice(g.month);
        url = result.hostedInvoiceUrl;
      }
      if (!url) throw new Error("No hosted invoice URL returned");
      await openPaymentPopup(url);
      await onRefresh();
    } catch (err) {
      alert("Could not open payment page: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setPaying(null);
    }
  }

  async function viewInvoice(g: MonthlyInvoiceRow) {
    if (g.hostedInvoiceUrl) {
      window.open(g.hostedInvoiceUrl, "_blank", "noopener,noreferrer");
    } else {
      setOpenRow(g);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="card-title">Invoice history</div>
          <InfoIcon note="One invoice per billing month. The Stripe hosted-invoice page opens in a popup (or a new tab if you've switched modes in the nav) — after paying, this list updates automatically when the popup closes, or click Refresh in tab mode." />
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span
            className="card-action"
            style={{ opacity: downloading ? 0.5 : 1, pointerEvents: downloading ? "none" : "auto" }}
            onClick={() => void downloadAllPdfZip()}
            title="Download a .zip of PDF invoices for every monthly invoice"
          >
            {downloading ? "Preparing zip…" : "Download all (PDF zip)"}
          </span>
          <span className="card-action" onClick={downloadCsv}>CSV</span>
          <span className="card-action" onClick={() => void onRefresh()}>Refresh</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 0 16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "#f5f7f9", borderRadius: 8, padding: 4 }}>
          {(["all", "upcoming", "paid"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`filter-pill ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "upcoming" ? "Upcoming" : "Paid"}
            </button>
          ))}
        </div>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="filter-select"
          style={{ marginLeft: "auto", fontFamily: "'Open Sans',sans-serif", fontSize: 13 }}
        >
          <option value="all">All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <table className="listing-table">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Period</th>
            <th>Listings</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Due date</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={7} className="empty">No invoices match.</td></tr>
          )}
          {filtered.map((g) => {
            const isPaid = g.status === "paid";
            const amount = isPaid ? g.amountPaidUsd || g.totalAmountUsd : g.totalAmountUsd;
            return (
              <tr key={g.month} style={{ cursor: "pointer" }} onClick={() => setOpenRow(g)}>
                <td><span style={{ fontSize: 14, letterSpacing: "0.02em", fontWeight: 700 }}>{g.friendlyId}</span></td>
                <td>{g.periodLabel}</td>
                <td>{g.listingCount}</td>
                <td><span className={`inv-amount ${isPaid ? "green" : ""}`}>{formatCurrency(amount)}</span></td>
                <td><span className={statusClass(g.status)}>{statusLabel(g.status)}</span></td>
                <td style={{ color: "#888" }}>{g.dueDate}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {isPaid ? (
                    <button type="button" className="btn-view" onClick={() => void viewInvoice(g)}>View</button>
                  ) : (
                    <button
                      type="button"
                      className="btn-pay"
                      disabled={paying === g.month}
                      onClick={() => void payMonth(g)}
                    >
                      {paying === g.month ? "Opening…" : "Pay now"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {openRow && <MonthBreakdownModal row={openRow} onClose={() => setOpenRow(null)} />}
    </div>
  );
}

function MonthBreakdownModal({ row, onClose }: { row: MonthlyInvoiceRow; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="redeem-overlay open"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="redeem-modal" style={{ maxWidth: 900, width: "96%" }} onClick={(e) => e.stopPropagation()}>
        <div
          className="redeem-modal-header"
          style={{ background: "linear-gradient(135deg, #1a8fd1 0%, #0a4a8a 100%)" }}
        >
          <h3>{row.friendlyId} — {row.periodLabel}</h3>
          <button type="button" className="redeem-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="redeem-body" style={{ padding: 20 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <Stat label="Listings" value={String(row.listingCount)} />
            <Stat label="Total" value={formatCurrency(row.totalAmountUsd)} />
            <Stat label="Status" value={statusLabel(row.status)} accent={row.status === "paid" ? "#2e7d32" : "#c0392b"} />
            <Stat label="Due date" value={row.dueDate} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em" }}>Listings included</div>
            <InfoIcon note="The following listings are grouped into this monthly invoice. They're paid together when the invoice is settled — there's no need to pay them individually." />
          </div>

          <table className="listing-table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th>Listing ref</th>
                <th>Deceased</th>
                <th>Newspaper</th>
                <th>Publication</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {row.listings.length === 0 && (
                <tr><td colSpan={5} className="empty">No listings in this month.</td></tr>
              )}
              {row.listings.map((l) => (
                <tr key={l.id}>
                  <td><code style={{ fontSize: 11, background: "#f5f7f9", padding: "2px 6px", borderRadius: 4 }}>{l.friendlyInvoiceId}</code></td>
                  <td>{l.deceasedName}</td>
                  <td>
                    {l.newspaper}
                    {l.billingPartner && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#15803d", background: "#dcfce7", borderRadius: 10, padding: "2px 8px", marginLeft: 6 }}>
                        Billing partner · {l.feePercent}%
                      </span>
                    )}
                  </td>
                  <td style={{ color: "#888" }}>{l.publicationDate ?? "—"}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(l.amountUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            {row.hostedInvoiceUrl && row.status === "paid" && (
              <a
                href={row.hostedInvoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-view"
                style={{ textDecoration: "none", fontSize: 14, padding: "9px 16px" }}
              >
                Open Stripe invoice ↗
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{ fontFamily: "'Open Sans', sans-serif", fontSize: 14, fontWeight: 700, color: "#fff", background: "#1a8fd1", border: "none", borderRadius: 8, padding: "11px 22px", cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ background: "#f8f9fb", borderRadius: 8, padding: "10px 14px", border: "1px solid #e4e8ed", flex: "1 1 140px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: accent ?? "#1a1a1a", marginTop: 4 }}>{value}</div>
    </div>
  );
}
