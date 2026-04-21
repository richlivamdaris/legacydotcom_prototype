import type { InvoiceRow, Listing, LoyaltyState } from "./api.js";
import { StatusBadge, formatCurrency } from "./shared.js";

interface Props {
  listings: Listing[];
  invoices: InvoiceRow[];
  loyalty: LoyaltyState | null;
  onGoto: (tab: "invoices" | "listings" | "loyalty") => void;
}

export function OverviewTab({ listings, invoices, loyalty, onGoto }: Props) {
  const recent = listings.slice(0, 5);

  const upcomingInvoice = invoices.find(
    (i) => i.status === "open" || i.status === "draft" || i.status === "uncollectible"
  );

  const points = loyalty?.points ?? 0;
  const silverGoal = 1500;
  const silverPct = Math.min(100, Math.round((points / silverGoal) * 100));
  const silverAway = Math.max(0, silverGoal - points);

  const publishedThisMonth = listings.filter((l) => l.status === "published").length;

  return (
    <>
      {upcomingInvoice ? (
        <div className="alert info">
          <div className="alert-icon">ℹ️</div>
          <div>
            <strong>Invoice {upcomingInvoice.id.slice(0, 14)}… is {upcomingInvoice.status}</strong><br />
            An open invoice for ${upcomingInvoice.amountDueUsd.toFixed(2)} — {upcomingInvoice.deceasedName}.{" "}
            <span className="text-link" onClick={() => onGoto("invoices")}>View invoice →</span>
          </div>
        </div>
      ) : (
        <div className="alert info">
          <div className="alert-icon">✅</div>
          <div>
            <strong>All invoices are up to date.</strong><br />
            No outstanding balance. Keep submitting obituaries to earn loyalty points.
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Monthly listings</div>
            <span className="card-action" onClick={() => onGoto("listings")}>See all</span>
          </div>
          <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>Last 6 months</div>
          <div className="mini-bars">
            <div className="mini-bar" style={{ height: "52%" }} title="Nov: 16" />
            <div className="mini-bar" style={{ height: "68%" }} title="Dec: 21" />
            <div className="mini-bar" style={{ height: "61%" }} title="Jan: 19" />
            <div className="mini-bar" style={{ height: "74%" }} title="Feb: 23" />
            <div className="mini-bar" style={{ height: "64%" }} title="Mar: 20" />
            <div className="mini-bar current" style={{ height: "77%" }} title={`Apr: ${publishedThisMonth || 24}`} />
          </div>
          <div className="bar-labels">
            <div className="bar-label">Nov</div>
            <div className="bar-label">Dec</div>
            <div className="bar-label">Jan</div>
            <div className="bar-label">Feb</div>
            <div className="bar-label">Mar</div>
            <div className="bar-label">Apr</div>
          </div>
        </div>

        <div className="card" style={{ overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(26,143,209,0.04)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#aaa", marginBottom: 4 }}>Legacy Loyalty</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 42, fontWeight: 700, color: "#1a1a1a", lineHeight: 1, letterSpacing: "-1px" }}>{points.toLocaleString()}</span>
                  <span style={{ fontSize: 13, color: "#aaa", paddingBottom: 4 }}>pts</span>
                </div>
              </div>
              <div style={{ background: "#f0f7fd", border: "1px solid #d0e8f7", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: "#1a8fd1", whiteSpace: "nowrap" }}>Bronze tier</div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <span style={{ fontSize: 12, color: "#888" }}>Progress to Silver</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{silverAway.toLocaleString()} pts away</span>
              </div>
              <div style={{ background: "#e8f0f7", borderRadius: 6, height: 7 }}>
                <div style={{ background: "linear-gradient(90deg,#1a8fd1,#0d5fa3)", borderRadius: 6, height: 7, width: `${silverPct}%`, transition: "width 0.5s" }} />
              </div>
            </div>

            <button
              onClick={() => onGoto("loyalty")}
              style={{ fontFamily: "'Open Sans',sans-serif", width: "100%", background: "#fff", border: "1.5px solid #e4e8ed", color: "#1a8fd1", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Redeem points →
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent listings</div>
          <span className="card-action" onClick={() => onGoto("listings")}>View all</span>
        </div>
        <table className="listing-table">
          <thead>
            <tr>
              <th>Deceased</th>
              <th>Newspaper</th>
              <th>Published</th>
              <th>Status</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr><td colSpan={5} className="empty">No listings yet. Click "+ New Obituary" to create one.</td></tr>
            )}
            {recent.map((l) => (
              <tr key={l.id}>
                <td>{l.deceasedName}</td>
                <td>{l.newspaper}</td>
                <td>{l.publicationDate ?? "—"}</td>
                <td><StatusBadge status={l.status} /></td>
                <td>{formatCurrency(l.amountUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Your negotiated rates</div>
          <span className="card-action">Contact support</span>
        </div>
        <p style={{ fontSize: 14, color: "#888", marginBottom: 14 }}>
          Rates are specific to Greenfield Funeral Home based on your booking volume.
        </p>
        <div className="rate-row">
          <div>
            <div className="rate-paper">Hartford Courant <span className="rate-badge">Preferred</span></div>
            <div className="rate-meta">Gannett Group · Daily</div>
          </div>
          <div className="rate-price">From $85.00 / col. in.</div>
        </div>
        <div className="rate-row">
          <div>
            <div className="rate-paper">New Haven Register</div>
            <div className="rate-meta">Hearst Newspapers · Daily</div>
          </div>
          <div className="rate-price">From $72.00 / col. in.</div>
        </div>
        <div className="rate-row">
          <div>
            <div className="rate-paper">Connecticut Post</div>
            <div className="rate-meta">Hearst Newspapers · Daily</div>
          </div>
          <div className="rate-price">From $68.00 / col. in.</div>
        </div>
      </div>
    </>
  );
}
