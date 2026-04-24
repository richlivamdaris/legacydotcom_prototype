import type { IssuedCard, LoyaltyState } from "./api.js";
import { InfoIcon } from "./shared.js";

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

const FH_NAME = "Greenfield Funeral Home";

type TierKey = "bronze" | "silver" | "gold" | "platinum";
const TIERS: Array<{ key: TierKey; label: string; threshold: number; emoji: string }> = [
  { key: "bronze",   label: "Bronze",   threshold: 0,       emoji: "🥉" },
  { key: "silver",   label: "Silver",   threshold: 1500,    emoji: "🥈" },
  { key: "gold",     label: "Gold",     threshold: 10_000,  emoji: "🥇" },
  { key: "platinum", label: "Platinum", threshold: 100_000, emoji: "🏆" },
];

function tierStatus(points: number) {
  let currentIdx = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (points >= TIERS[i].threshold) currentIdx = i;
  }
  const current = TIERS[currentIdx];
  const next = TIERS[currentIdx + 1] ?? null;
  let pct = 1;
  let pointsToNext = 0;
  let subtitle = `${current.label} tier — top tier reached`;
  if (next) {
    const span = next.threshold - current.threshold;
    pct = Math.max(0, Math.min(1, (points - current.threshold) / span));
    pointsToNext = Math.max(0, next.threshold - points);
    subtitle = `${pointsToNext.toLocaleString()} points till ${next.label} tier`;
  }
  return { current, currentIdx, next, pct, pointsToNext, subtitle };
}

export function LoyaltyTab({ loyalty, admin, onRedeem }: Props) {
  const points = loyalty.points;
  const tier = tierStatus(points);

  // SVG arc-progress ring (r=32 → circumference ≈ 201)
  const RING_CIRC = 201;
  const ringDashOffset = RING_CIRC * (1 - tier.pct);

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
      <div style={{ background: "linear-gradient(135deg,#1a8fd1 0%,#0d5fa3 60%,#0a4a8a 100%)", borderRadius: 16, padding: "28px 32px", marginBottom: "1.5rem", position: "relative", overflow: "hidden", color: "#fff" }}>
        {/* Subtle background texture circles */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, right: 60, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>
          Loyalty Balance
        </div>

        {/* Trophy + points row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          <div style={{ width: 68, height: 68, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
            <svg width="68" height="68" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
              <circle cx="34" cy="34" r="32" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
              <circle cx="34" cy="34" r="32" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray={RING_CIRC} strokeDashoffset={ringDashOffset} strokeLinecap="round" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 42, fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: "-1.5px" }}>
              {points.toLocaleString()}
              <span style={{ fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: 0, marginLeft: 4 }}>pts</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>{tier.subtitle}</div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <button
              type="button"
              className="btn-redeem"
              onClick={() => onRedeem(25, 500)}
              style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.3)", color: "#fff", backdropFilter: "blur(4px)" }}
              onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.25)"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
            >
              Redeem points →
            </button>
          </div>
        </div>

        {/* Dashed divider */}
        <div style={{ borderTop: "1px dashed rgba(255,255,255,0.2)", marginBottom: 16 }} />

        {/* Bottom: account info + tier track */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "5px 14px" }}>
              <span style={{ fontSize: 14 }}>{tier.current.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{tier.current.label} Member</span>
            </div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{FH_NAME}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {TIERS.map((t, i) => {
              const reached = i <= tier.currentIdx;
              return (
                <span key={t.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {i > 0 && <span style={{ width: 16, height: 1, background: "rgba(255,255,255,0.2)" }} />}
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: reached ? "#fbbf24" : "rgba(255,255,255,0.25)" }} />
                    <span style={{ fontSize: 11, fontWeight: reached ? 600 : 400, color: reached ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)" }}>{t.label}</span>
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", marginBottom: 0, maxHeight: 480 }}>
          <div className="card-header"><div className="card-title">How to earn points</div></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14, color: "#333", flex: 1, minHeight: 0, overflowY: "auto" }}>
            <EarnRow title="Standard obituary" sub="Per published listing" value="+30 pts" />
            <EarnRow title="Multi-newspaper listing" sub="Per additional newspaper placed" value="+15 pts" />
            <EarnRow title="Premium upsell added" sub="Photo, video or enhanced package" value="+20 pts" />
            <EarnRow title="10+ listings in a month" sub="Volume bonus on reaching threshold" value="+100 pts" />
            <EarnRow title="Digital memorial added" sub="Online tribute page or guestbook" value="+25 pts" />
            <EarnRow title="Same-day submission" sub="Listing placed within 24 hrs of arrangement" value="+10 pts" />
            <EarnRow title="Early invoice payment" sub="Paid within 5 days of issue" value="+50 pts" />
            <EarnRow title="3-month streak" sub="Listings placed every month for 3 months" value="+75 pts" />
            <EarnRow title="Refer a funeral home" sub="Per referral that places their first listing" value="+200 pts" />
            <EarnRow title="25+ listings in a month" sub="Platinum volume bonus" value="+300 pts" last />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, maxHeight: 480 }}>
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="card-title">Redeem points</div>
              <InfoIcon note="Points are redeemed as a Stripe virtual prepaid card — loaded with cash and usable anywhere Visa is accepted. Issued instantly via Stripe Issuing." />
            </div>
          </div>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="card-title">Points history</div>
            {!admin && loyalty.cards.length > 0 && (
              <InfoIcon note="Enable Admin mode to open cards in the Stripe Dashboard" />
            )}
          </div>
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
