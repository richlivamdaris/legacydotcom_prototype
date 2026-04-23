import type { IssuedCard, LoyaltyState } from "./api.js";

interface Props {
  loyalty: LoyaltyState;
  admin: boolean;
  onRedeem: (amountUsd: number, pointsCost: number) => void;
}

const REWARDS: Array<{ amount: number; pts: number }> = [
  { amount: 25, pts: 500 },
  { amount: 50, pts: 900 },
  { amount: 75, pts: 1200 },
  { amount: 100, pts: 1500 },
];

const SILVER = 1500;
const GOLD = 100_000;

function tierProgress(points: number): { label: string; progressText: string; pct: number } {
  if (points < SILVER) {
    return {
      label: "Progress to Silver tier (earn 2× points)",
      progressText: `${points.toLocaleString()} / ${SILVER.toLocaleString()}`,
      pct: Math.min(100, Math.round((points / SILVER) * 100)),
    };
  }
  if (points < GOLD) {
    const pct = Math.min(100, Math.round(((points - SILVER) / (GOLD - SILVER)) * 100));
    return {
      label: "Progress to Gold tier (earn 3× points)",
      progressText: `${points.toLocaleString()} / ${GOLD.toLocaleString()}`,
      pct,
    };
  }
  return {
    label: "Gold tier reached — earning 3× points",
    progressText: `${points.toLocaleString()} pts`,
    pct: 100,
  };
}

export function LoyaltyTab({ loyalty, admin, onRedeem }: Props) {
  const points = loyalty.points;
  const progress = tierProgress(points);

  // History is newest-first from the API. Within any given day, show card
  // issuances (redemptions) above the earn entries.
  const sortedHistory = [...loyalty.history].sort((a, b) => {
    if (a.date !== b.date) return 0;
    const aCard = a.cardId ? 0 : 1;
    const bCard = b.cardId ? 0 : 1;
    return aCard - bCard;
  });

  return (
    <>
      <div className="loyalty-card" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div className="loyalty-left">
            <h3>⭐ Legacy Loyalty</h3>
            <p>Earn points on every obituary you place. Redeem for Stripe virtual prepaid cards — instant issue, usable anywhere Visa is accepted.</p>
          </div>
          <div className="loyalty-points-big">
            <div className="pts">{points.toLocaleString()}</div>
            <div className="pts-label">points available</div>
            <button className="btn-redeem" onClick={() => onRedeem(25, 500)}>Redeem points →</button>
          </div>
        </div>
        <div className="pts-bar-wrap" style={{ marginTop: 16 }}>
          <div className="pts-bar-label">
            <span>{progress.label}</span>
            <span style={{ color: "#fff", fontWeight: 700 }}>{progress.progressText}</span>
          </div>
          <div className="pts-bar"><div className="pts-bar-fill" style={{ width: `${progress.pct}%` }} /></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">How to earn points</div></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14, color: "#333" }}>
            <EarnRow title="Standard obituary" sub="Per published listing" value="+30 pts" />
            <EarnRow title="Multi-newspaper listing" sub="Per additional newspaper" value="+15 pts" />
            <EarnRow title="10+ listings in a month" sub="Bonus on reaching threshold" value="+100 pts" />
            <EarnRow title="Silver tier (1,500+ pts)" sub="2× multiplier on all listings" value="2×" muted />
            <EarnRow title="Gold tier (100,000+ pts)" sub="3× multiplier on all listings" value="3×" muted last />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Redeem points</div></div>
          <p style={{ fontSize: 13, color: "#888", marginBottom: "1rem", lineHeight: 1.6 }}>
            Points are redeemed as a Stripe virtual prepaid card — loaded with cash and usable anywhere Visa is accepted. Issued instantly via Stripe Issuing.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {REWARDS.map((r, i) => {
              const canRedeem = points >= r.pts;
              const highlighted = i === 0 && canRedeem;
              return (
                <div
                  key={r.amount}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px",
                    background: highlighted ? "#f0f7fd" : "#f8f9fb",
                    borderRadius: 8,
                    border: highlighted ? "1.5px solid #1a8fd1" : "1px solid #e4e8ed",
                    opacity: canRedeem ? 1 : 0.45,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>💳</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>${r.amount} Virtual Card</div>
                      <div style={{ fontSize: 12, color: "#888" }}>
                        {canRedeem ? "Instant · Usable anywhere Visa accepted" : `Need ${(r.pts - points).toLocaleString()} more points to unlock`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: canRedeem ? "#1a8fd1" : "#aaa" }}>{r.pts.toLocaleString()} pts</span>
                    <button
                      className="btn-view"
                      style={{ fontSize: 14, padding: "6px 14px", opacity: canRedeem ? 1 : 0.5, cursor: canRedeem ? "pointer" : "default" }}
                      disabled={!canRedeem}
                      onClick={() => canRedeem && onRedeem(r.amount, r.pts)}
                    >
                      Redeem
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "#aaa", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontWeight: 700, color: "#635bff" }}>stripe</span> Issued via Stripe Issuing · Visa network · PCI-DSS compliant
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Points history</div>
          {!admin && loyalty.cards.length > 0 && (
            <span style={{ fontSize: 12, color: "#aaa" }}>
              Enable Admin mode to open cards in the Stripe Dashboard
            </span>
          )}
        </div>
        <table className="listing-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Listing</th>
              <th>Redeemed</th>
              <th style={{ textAlign: "right" }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {sortedHistory.length === 0 && (
              <tr><td colSpan={5} className="empty">No points activity yet.</td></tr>
            )}
            {sortedHistory.map((h) => {
              const card = h.cardId ? loyalty.cards.find((c) => c.id === h.cardId) : null;
              return (
                <tr key={h.id}>
                  <td>{h.date}</td>
                  <td>{h.description}</td>
                  <td>{h.listingName ?? "—"}</td>
                  <td style={{ width: 170 }}>
                    {card ? <CardButton card={card} admin={admin} /> : null}
                  </td>
                  <td style={{ textAlign: "right", color: h.points >= 0 ? "#1a8fd1" : "#c0392b", fontWeight: 700 }}>
                    {h.points >= 0 ? `+${h.points}` : `−${Math.abs(h.points)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CardButton({ card, admin }: { card: IssuedCard; admin: boolean }) {
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "'Open Sans', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    padding: "5px 11px",
    borderRadius: 999,
    whiteSpace: "nowrap",
    border: "1.5px solid",
    textDecoration: "none",
    transition: "all 0.15s",
  };

  const label = (
    <>
      <span style={{ fontSize: 13, lineHeight: 1 }}>💳</span>
      <span style={{ color: admin ? "#635bff" : "inherit", letterSpacing: "0.02em" }}>
        {admin ? "View in Stripe" : "View card"}
      </span>
      <span style={{ fontSize: 10, opacity: 0.7 }}>•••• {card.last4}</span>
      {admin && <span style={{ fontSize: 11, opacity: 0.8 }}>↗</span>}
    </>
  );

  if (!admin) {
    return (
      <span
        style={{
          ...baseStyle,
          background: "#f5f7f9",
          borderColor: "#e4e8ed",
          color: "#aaa",
          cursor: "not-allowed",
        }}
        title={`Card ${card.id} — enable Admin mode to view in Stripe Dashboard`}
      >
        {label}
      </span>
    );
  }

  return (
    <a
      href={card.dashboardUrl}
      target="_blank"
      rel="noreferrer"
      style={{
        ...baseStyle,
        background: "#f0f0ff",
        borderColor: "#d7d5ff",
        color: "#635bff",
      }}
      title={`Open ${card.id} in Stripe Dashboard`}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#e6e4ff"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f0ff"; }}
    >
      {label}
    </a>
  );
}

function EarnRow({ title, sub, value, muted, last }: { title: string; sub: string; value: string; muted?: boolean; last?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: last ? 0 : 10, borderBottom: last ? "none" : "1px solid #f0f3f7" }}>
      <div>
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#888" }}>{sub}</div>
      </div>
      <div style={{ fontWeight: 700, color: muted ? "#888" : "#1a8fd1" }}>{value}</div>
    </div>
  );
}
