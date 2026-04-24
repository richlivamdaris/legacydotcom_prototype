import { useEffect, useMemo, useRef, useState } from "react";
import type { MonthlyInvoiceRow, MonthlyInvoiceStatus } from "./api.js";
import { payMonthlyInvoice } from "./api.js";
import { formatCurrency, InfoIcon } from "./shared.js";
import { openPaymentPopup } from "./paymentPopup.js";

interface Props {
  invoices: MonthlyInvoiceRow[];
  onRefresh: () => Promise<void> | void;
  simulateError: boolean;
  onPayError: () => void;
  accountOverdue: boolean;
  onPayOverdue: () => void;
}

type Filter = "all" | "upcoming" | "paid" | "overdue";
const STATUS_LABEL: Record<Filter, string> = {
  all: "All", upcoming: "Upcoming", paid: "Paid", overdue: "Overdue",
};

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

const PAGE_SIZE = 10;

export function InvoicesTab({ invoices, onRefresh, simulateError, onPayError, accountOverdue, onPayOverdue }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [openRow, setOpenRow] = useState<MonthlyInvoiceRow | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const years = useMemo(() => {
    const s = new Set<string>();
    invoices.forEach((g) => s.add(g.month.slice(0, 4)));
    return Array.from(s).sort().reverse();
  }, [invoices]);

  // An invoice counts as "overdue" for filter purposes when it's unpaid AND
  // its due date has passed. Mirrors the demo banner's intent and avoids
  // relying on Stripe's uncollectible status which only trips after weeks.
  const now = Date.now();
  const isOverdueRow = (g: MonthlyInvoiceRow) => {
    if (g.status === "paid" || g.status === "void") return false;
    if (g.status === "uncollectible") return true;
    const due = Date.parse(g.dueDate);
    return Number.isFinite(due) && due < now;
  };

  const filtered = invoices.filter((g) => {
    if (filter === "paid" && g.status !== "paid") return false;
    if (filter === "upcoming" && (g.status === "paid" || isOverdueRow(g))) return false;
    if (filter === "overdue" && !isOverdueRow(g)) return false;
    if (yearFilter !== "all" && g.month.slice(0, 4) !== yearFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${g.friendlyId} ${g.periodLabel}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Reset to page 1 whenever filters change the result set
  useEffect(() => { setPage(1); }, [filter, yearFilter, search]);

  // Auto-apply the Overdue filter while the demo's overdue simulation is on;
  // clear back to All when it's turned off (if Overdue was active).
  useEffect(() => {
    if (accountOverdue) {
      setFilter("overdue");
    } else {
      setFilter((prev) => (prev === "overdue" ? "all" : prev));
    }
  }, [accountOverdue]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(pageStart + PAGE_SIZE, filtered.length);

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
    <>
      {accountOverdue && <OverdueBanner onPay={onPayOverdue} />}
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
        <div className="filter-search-wrap" style={{ position: "relative", minWidth: 200, maxWidth: 240 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "inline-flex", pointerEvents: "none" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices…"
            style={{
              fontFamily: "'Open Sans', sans-serif", fontSize: 13, fontWeight: 600,
              color: "#555", background: "#f3f4f6",
              border: "1.5px solid transparent", borderRadius: 8,
              padding: "0 12px 0 34px", height: 40, width: "100%",
              outline: "none", transition: "border-color 0.15s, background 0.15s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#1a8fd1"; e.currentTarget.style.background = "#fff"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "#f3f4f6"; }}
          />
        </div>

        <FilterDivider />

        <PillDropdown
          value={filter}
          prefix="Status"
          label={STATUS_LABEL[filter]}
          options={[
            { value: "all", label: "All" },
            { value: "upcoming", label: "Upcoming" },
            { value: "paid", label: "Paid" },
            { value: "overdue", label: "Overdue", danger: true },
          ]}
          onChange={(v) => setFilter(v as Filter)}
        />

        <FilterDivider />

        <PillDropdown
          value={yearFilter}
          prefix="Year"
          label={yearFilter === "all" ? "All" : yearFilter}
          options={[
            { value: "all", label: "All years" },
            ...years.map((y) => ({ value: y, label: y })),
          ]}
          onChange={setYearFilter}
        />
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
          {pageRows.map((g) => {
            const isPaid = g.status === "paid";
            const overdue = isOverdueRow(g);
            const amount = isPaid ? g.amountPaidUsd || g.totalAmountUsd : g.totalAmountUsd;
            const amountClass = isPaid ? "green" : overdue ? "red" : "";
            const badgeClass = overdue
              ? "badge overdue"
              : g.status === "paid"
              ? "badge paid"
              : g.status === "void"
              ? "badge draft"
              : "badge upcoming";
            const badgeText = overdue ? "Overdue" : statusLabel(g.status);
            return (
              <tr key={g.month} style={{ cursor: "pointer" }} onClick={() => setOpenRow(g)}>
                <td><span style={{ fontSize: 14, letterSpacing: "0.02em", fontWeight: 700 }}>{g.friendlyId}</span></td>
                <td>{g.periodLabel}</td>
                <td>{g.listingCount}</td>
                <td><span className={`inv-amount ${amountClass}`}>{formatCurrency(amount)}</span></td>
                <td><span className={badgeClass}>{badgeText}</span></td>
                <td style={{ color: "#888" }}>{g.dueDate}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  {isPaid ? (
                    <button type="button" className="btn-view" onClick={() => void viewInvoice(g)}>View</button>
                  ) : (
                    <button
                      type="button"
                      className={`btn-pay${overdue ? " overdue" : ""}`}
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

      <div className="pager-row">
        <div className="pager-info">
          {filtered.length === 0
            ? "0 invoices"
            : `Showing ${showingFrom}–${showingTo} of ${filtered.length} invoice${filtered.length !== 1 ? "s" : ""}`}
        </div>
        <Pager current={currentPage} totalPages={totalPages} onChange={setPage} />
      </div>

      {openRow && <MonthBreakdownModal row={openRow} onClose={() => setOpenRow(null)} />}
      </div>
    </>
  );
}

function OverdueBanner({ onPay }: { onPay: () => void }) {
  const [paying, setPaying] = useState(false);
  async function handlePay() {
    if (paying) return;
    setPaying(true);
    // Simulate a short Stripe round-trip before clearing the overdue state
    // so the demo shows a processing state rather than flipping instantly.
    await new Promise((r) => window.setTimeout(r, 900));
    onPay();
  }
  return (
    <div style={{
      background: "#fdecea", border: "1.5px solid #f5c6c2",
      borderRadius: 10, padding: "12px 16px", marginBottom: "1.25rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" x2="12" y1="9" y2="13" />
          <line x1="12" x2="12.01" y1="17" y2="17" />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#7d2b24" }}>
            Payment overdue — account restricted
          </div>
          <div style={{ fontSize: 12, color: "#9b3530" }}>
            INV-2026-02 · $980.00 · Due March 1, 2026 · 51 days overdue · new submissions paused
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handlePay()}
          disabled={paying}
          style={{
            fontFamily: "'Open Sans', sans-serif",
            background: "#c0392b", color: "#fff",
            border: "none", borderRadius: 7,
            padding: "7px 16px", fontSize: 13, fontWeight: 700,
            cursor: paying ? "default" : "pointer",
            whiteSpace: "nowrap", flexShrink: 0,
            opacity: paying ? 0.7 : 1,
            transition: "background 0.15s, opacity 0.15s",
          }}
          onMouseOver={(e) => { if (!paying) e.currentTarget.style.background = "#a93226"; }}
          onMouseOut={(e) => { if (!paying) e.currentTarget.style.background = "#c0392b"; }}
        >
          {paying ? "Processing…" : "Pay now →"}
        </button>
      </div>
    </div>
  );
}

function Pager({ current, totalPages, onChange }: { current: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return <div className="pager-controls" />;

  // Show: 1, current-1, current, current+1, total — with ellipsis in the gaps.
  const items: Array<number | "…"> = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= current - 1 && p <= current + 1)) {
      items.push(p);
    } else if (items[items.length - 1] !== "…") {
      items.push("…");
    }
  }

  return (
    <div className="pager-controls">
      <button
        type="button"
        className="pager-btn"
        disabled={current === 1}
        aria-label="Previous page"
        onClick={() => onChange(current - 1)}
      >
        ‹
      </button>
      {items.map((it, idx) =>
        it === "…" ? (
          <span key={`e${idx}`} className="pager-ellipsis">…</span>
        ) : (
          <button
            key={it}
            type="button"
            className={`pager-btn${it === current ? " active" : ""}`}
            onClick={() => onChange(it)}
          >
            {it}
          </button>
        )
      )}
      <button
        type="button"
        className="pager-btn"
        disabled={current === totalPages}
        aria-label="Next page"
        onClick={() => onChange(current + 1)}
      >
        ›
      </button>
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
          className="redeem-modal-header dark"
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

function FilterDivider() {
  return <div style={{ width: 1, height: 24, background: "#e5e7eb", flexShrink: 0 }} />;
}

interface DropdownOption {
  value: string;
  label: string;
  danger?: boolean;
}

function PillDropdown({ value, prefix, label, options, onChange }: {
  value: string;
  prefix: string;
  label: string;
  options: DropdownOption[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          fontFamily: "'Open Sans', sans-serif", fontSize: 13, fontWeight: 600,
          background: "#f3f4f6", border: "none", borderRadius: 8,
          padding: "0 14px", height: 40, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 5,
          color: "#555", transition: "background 0.15s",
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = "#e9eaec"; }}
        onMouseOut={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
      >
        <span>{prefix}: {label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          background: "#fff", border: "1.5px solid #e5e7eb",
          borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          minWidth: 150, zIndex: 200, overflow: "hidden",
        }}>
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  width: "100%", textAlign: "left",
                  padding: "9px 14px", fontSize: 13, fontWeight: 600,
                  background: active ? "#f3f4f6" : "none",
                  border: "none", cursor: "pointer",
                  fontFamily: "'Open Sans', sans-serif",
                  color: opt.danger ? "#dc2626" : "#555",
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = opt.danger ? "#fef2f2" : "#f3f4f6"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = active ? "#f3f4f6" : "none"; }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
