import { useState, useMemo } from "react";
import type { Listing, PaymentMode } from "./api.js";
import { StatusBadge, formatCurrency, InfoIcon } from "./shared.js";

function PaymentModeDot({ mode }: { mode: PaymentMode }) {
  const onAccount = mode === "on_account";
  const color = onAccount ? "#f59e0b" : "#635bff";
  const bg = onAccount ? "#fef3c7" : "#efedff";
  const note = onAccount
    ? "On account — added to the monthly statement"
    : "Paid directly via Stripe — one-off invoice";
  return <ColouredInfoIcon color={color} background={bg} note={note} />;
}

// Coloured info icon — used for the at-a-glance payment-mode legend. Shows
// an amber or purple circled "i" with hover tooltip.
function ColouredInfoIcon({ color, background, note, size = 14 }: { color: string; background: string; note: string; size?: number }) {
  const [hover, setHover] = useState(false);
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      tabIndex={0}
      aria-label={note}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        background,
        color,
        fontSize: Math.max(9, size - 4),
        fontWeight: 700,
        fontFamily: "'Open Sans', sans-serif",
        fontStyle: "italic",
        cursor: "help",
        flexShrink: 0,
        outline: "none",
        border: `1px solid ${color}55`,
      }}
    >
      i
      {hover && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1a1a1a",
            color: "#fff",
            fontStyle: "normal",
            fontSize: 11,
            fontWeight: 500,
            lineHeight: 1.5,
            padding: "6px 10px",
            borderRadius: 6,
            width: 220,
            whiteSpace: "normal",
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 5000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          {note}
        </span>
      )}
    </span>
  );
}

interface Props {
  listings: Listing[];
  onNew: () => void;
  onOpenListing: (listing: Listing) => void;
}

type Filter = "all" | "published" | "pending" | "upcoming" | "draft";

export function ListingsTab({ listings, onNew, onOpenListing }: Props) {
  const [statusFilter, setStatusFilter] = useState<Filter>("all");
  const [newspaperFilter, setNewspaperFilter] = useState("all");
  const [search, setSearch] = useState("");

  const newspapers = useMemo(() => {
    const s = new Set<string>();
    listings.forEach((l) => l.newspaper && l.newspaper !== "—" && s.add(l.newspaper));
    return Array.from(s).sort();
  }, [listings]);

  const filtered = listings.filter((l) => {
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    const matchesPaper = newspaperFilter === "all" || l.newspaper === newspaperFilter;
    const matchesSearch = !search || l.deceasedName.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesPaper && matchesSearch;
  });

  const filters: Array<{ v: Filter; label: string }> = [
    { v: "all", label: "All" },
    { v: "published", label: "Published" },
    { v: "pending", label: "Pending" },
    { v: "upcoming", label: "Scheduled" },
    { v: "draft", label: "Draft" },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">All listings</div>
        <span className="card-action" onClick={onNew}>+ New Obituary →</span>
      </div>

      <div className="filter-row-v2">
        <div className="filter-search-wrap">
          <span className="search-ico">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="filter-input"
          />
        </div>
        {filters.map((f) => (
          <button
            key={f.v}
            type="button"
            className={`filter-pill ${statusFilter === f.v ? "active" : ""}`}
            onClick={() => setStatusFilter(f.v)}
          >
            {f.label}
          </button>
        ))}
        <select
          value={newspaperFilter}
          onChange={(e) => setNewspaperFilter(e.target.value)}
          className="filter-select"
          style={{ marginLeft: "auto" }}
        >
          <option value="all">All newspapers</option>
          {newspapers.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <table className="listing-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Newspaper</th>
            <th>Publication date</th>
            <th>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                Amount
                <InfoIcon note="A coloured dot next to the amount shows how it's billed — amber = added to the monthly statement (on account); purple = paid directly via Stripe as a one-off invoice." />
              </span>
            </th>
            <th>Status</th>
            <th>Submitted</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={7} className="empty">No listings match the selected filters.</td></tr>
          )}
          {filtered.map((l) => (
            <tr key={l.id}>
              <td style={{ fontWeight: 600 }}>{l.deceasedName}</td>
              <td>{l.newspaper || "—"}</td>
              <td>{l.publicationDate ?? "—"}</td>
              <td>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span className={`inv-amount ${l.status === "published" ? "green" : ""}`}>
                    {l.amountUsd ? formatCurrency(l.amountUsd) : "—"}
                  </span>
                  {(l.status === "published" || l.status === "upcoming") && <PaymentModeDot mode={l.paymentMode} />}
                </span>
              </td>
              <td><StatusBadge status={l.status} /></td>
              <td style={{ color: "#888" }}>{l.submittedAt}</td>
              <td>
                <button
                  type="button"
                  className="btn-view"
                  onClick={() => onOpenListing(l)}
                >
                  {l.status === "published" ? "View" : "Edit"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pager-row">
        <div className="pager-info">{filtered.length} listing{filtered.length !== 1 ? "s" : ""}</div>
        <div className="pager-controls" />
      </div>
    </div>
  );
}

export function ListingDetailsModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const readOnly = listing.status === "published";
  const title = readOnly ? "View listing" : "Edit listing";
  return (
    <div
      className="redeem-overlay open"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="redeem-modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="redeem-modal-header dark" style={{ background: readOnly ? "linear-gradient(135deg,#1a8fd1 0%,#0a4a8a 100%)" : "linear-gradient(135deg,#b45309 0%,#7c2d12 100%)" }}>
          <h3>{readOnly ? "🔒" : "✏️"} {title}</h3>
          <button type="button" className="redeem-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="redeem-body">
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 10, columnGap: 12, fontSize: 14 }}>
            <Label>Deceased</Label><Value>{listing.deceasedName}</Value>
            <Label>Date of Death</Label>
            <Value style={{ color: listing.dateOfDeath ? "#1a1a1a" : "#aaa" }}>
              {listing.dateOfDeath ? formatDod(listing.dateOfDeath) : "—"}
            </Value>
            <Label>Newspaper</Label>
            <Value>
              {listing.newspaper}
              {listing.billingPartner && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#15803d", background: "#dcfce7", borderRadius: 10, padding: "2px 8px", marginLeft: 8 }}>
                  Billing partner · {listing.feePercent}%
                </span>
              )}
            </Value>
            <Label>Publication date</Label><Value>{listing.publicationDate ?? "—"}</Value>
            <Label>Amount</Label><Value>{listing.amountUsd ? formatCurrency(listing.amountUsd) : "—"}</Value>
            <Label>Status</Label><Value><StatusBadge status={listing.status} /></Value>
            <Label>Submitted</Label><Value style={{ color: "#888" }}>{listing.submittedAt}</Value>
            <Label>Listing ref</Label>
            <Value>
              <code style={{ fontSize: 12, background: "#f5f7f9", padding: "2px 6px", borderRadius: 4 }}>{listing.friendlyInvoiceId}</code>
            </Value>
            <Label>Payment</Label>
            <Value>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <PaymentModeDot mode={listing.paymentMode} />
                {listing.paymentMode === "on_account"
                  ? "On account — added to the monthly statement"
                  : "Paid directly via Stripe — one-off invoice"}
              </span>
            </Value>
          </div>

          <div style={{ marginTop: 18 }}>
            <Label>Obituary text</Label>
            {readOnly ? (
              <div style={{ marginTop: 6, fontSize: 13, color: "#1a1a1a", background: "#f8f9fb", border: "1px solid #e4e8ed", borderRadius: 8, padding: "12px 14px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {listing.obituaryText || <em style={{ color: "#aaa" }}>No obituary text on record.</em>}
              </div>
            ) : (
              <textarea
                defaultValue={listing.obituaryText}
                placeholder="Obituary text"
                style={{ width: "100%", marginTop: 6, fontFamily: "'Open Sans', sans-serif", fontSize: 13, color: "#1a1a1a", background: "#f5f7f9", border: "1.5px solid #e0e4e8", borderRadius: 8, padding: "12px 14px", minHeight: 140, outline: "none", resize: "vertical", lineHeight: 1.6 }}
              />
            )}
          </div>

          {readOnly ? (
            <div style={{ marginTop: 20, background: "#f0f7fd", border: "1px solid #b8d9ef", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#1a5f8a", lineHeight: 1.5, display: "flex", alignItems: "center", gap: 8 }}>
              🔒 This listing has been published. Copy is locked and cannot be edited.
            </div>
          ) : (
            <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#92400e" }}>
              ✏️ Edit this listing
              <InfoIcon note="Prototype only: edits to existing listings are not persisted. In the full build this would reopen the obituary form pre-filled with the current values." />
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ fontFamily: "'Open Sans',sans-serif", fontSize: 14, fontWeight: 700, color: "#fff", background: "#1a8fd1", border: "none", borderRadius: 8, padding: "11px 22px", cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDod(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: 2 }}>{children}</div>;
}
function Value({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ color: "#1a1a1a", fontWeight: 500, ...style }}>{children}</div>;
}
