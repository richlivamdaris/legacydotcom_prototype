import { useEffect, useState } from "react";
import type { ServiceFeePartner } from "./api.js";
import { fetchServiceFees } from "./api.js";
import { formatCurrency } from "./shared.js";

export function ServiceFeesTab() {
  const [partners, setPartners] = useState<ServiceFeePartner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<ServiceFeePartner | null>(null);

  useEffect(() => {
    fetchServiceFees().then(setPartners).catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  if (error) {
    return <div className="alert overdue"><div className="alert-icon">⚠️</div><div>{error}</div></div>;
  }
  if (!partners) return <div className="empty">Loading service fees…</div>;

  const grandTotal = partners.reduce((s, p) => s + p.serviceFeeUsd, 0);

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Service fees — Billing partners</div>
            <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
              Legacy.com collects a commission % on obituary revenue for these partners. Service-fee invoices are raised against the publisher.
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total fees due</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1a8fd1" }}>{formatCurrency(grandTotal)}</div>
          </div>
        </div>

        <table className="listing-table">
          <thead>
            <tr>
              <th>Billing Partner</th>
              <th>Listings</th>
              <th>Gross listing value</th>
              <th>Fee %</th>
              <th>Service fee due</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.newspaper}>
                <td style={{ fontWeight: 700 }}>{p.newspaper}</td>
                <td>{p.listingCount}</td>
                <td>{formatCurrency(p.totalListingValueUsd)}</td>
                <td>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#635bff", background: "#f0f0ff", padding: "3px 10px", borderRadius: 10 }}>
                    {p.feePercent}%
                  </span>
                </td>
                <td><span className="inv-amount" style={{ color: "#1a8fd1", fontWeight: 700 }}>{formatCurrency(p.serviceFeeUsd)}</span></td>
                <td>
                  <button
                    type="button"
                    className="btn-view"
                    onClick={() => setOpen(p)}
                    disabled={p.listingCount === 0}
                  >
                    Breakdown
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 12px", borderTop: "1px solid #f0f3f7", marginTop: 4 }}>
          <div style={{ fontSize: 13, color: "#888" }}>
            Fees are computed as <strong>gross listing value × fee %</strong>. Only invoices belonging to this partner are counted.
          </div>
        </div>
      </div>

      {open && <BreakdownModal partner={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function BreakdownModal({ partner, onClose }: { partner: ServiceFeePartner; onClose: () => void }) {
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
      <div
        className="redeem-modal"
        style={{ maxWidth: 900, width: "96%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="redeem-modal-header"
          style={{ background: "linear-gradient(135deg, #1a8fd1 0%, #0a4a8a 100%)" }}
        >
          <h3>📊 {partner.newspaper} — service fee breakdown</h3>
          <button type="button" className="redeem-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="redeem-body" style={{ padding: 20 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <Stat label="Listings" value={String(partner.listingCount)} />
            <Stat label="Gross value" value={formatCurrency(partner.totalListingValueUsd)} />
            <Stat label="Fee %" value={`${partner.feePercent}%`} />
            <Stat label="Service fee due" value={formatCurrency(partner.serviceFeeUsd)} accent="#1a8fd1" />
          </div>

          <table className="listing-table" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Deceased</th>
                <th>Submitted</th>
                <th>Listing value</th>
                <th>Status</th>
                <th>Fee ({partner.feePercent}%)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {partner.breakdown.length === 0 && (
                <tr><td colSpan={7} className="empty">No listings yet for {partner.newspaper}.</td></tr>
              )}
              {partner.breakdown.map((b) => (
                <tr key={b.listingId}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{b.friendlyInvoiceId}</div>
                    <div style={{ fontSize: 10, color: "#aaa" }}>{b.stripeInvoiceId?.slice(0, 18)}…</div>
                  </td>
                  <td>{b.deceasedName}</td>
                  <td style={{ color: "#888" }}>{b.submittedAt}</td>
                  <td>{formatCurrency(b.amountUsd)}</td>
                  <td>{b.invoiceStatus ? <span className={`badge ${b.invoiceStatus === "paid" ? "paid" : "upcoming"}`}>{b.invoiceStatus}</span> : "—"}</td>
                  <td><span className="inv-amount" style={{ color: "#1a8fd1", fontWeight: 700 }}>{formatCurrency(b.feeUsd)}</span></td>
                  <td>
                    {b.invoiceHostedUrl && (
                      <a className="btn-view" href={b.invoiceHostedUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: "4px 10px" }}>View</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                fontFamily: "'Open Sans', sans-serif",
                fontSize: 14,
                fontWeight: 700,
                color: "#fff",
                background: "#1a8fd1",
                border: "none",
                borderRadius: 8,
                padding: "11px 22px",
                cursor: "pointer",
              }}
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
