import type { Listing, LoyaltyState } from "./api.js";
import { StatusBadge, formatCurrency } from "./shared.js";

interface Props {
  listings: Listing[];
  loyalty: LoyaltyState | null;
  onGoto: (tab: "invoices" | "listings" | "loyalty") => void;
  onOpenListing?: (listing: Listing) => void;
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function monthOfIso(iso: string | null): string | null {
  if (!iso) return null;
  return iso.slice(0, 7);
}

export function OverviewTab({ listings, loyalty, onGoto, onOpenListing }: Props) {
  const recent = listings.slice(0, 5);

  const now = new Date();
  const greeting = greetingFor(now);
  const todayLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const points = loyalty?.points ?? 0;
  const silverGoal = 1500;
  const silverPct = Math.min(100, Math.round((points / silverGoal) * 100));
  const silverAway = Math.max(0, silverGoal - points);
  const tier = points >= silverGoal ? "Silver" : "Bronze";

  const pointsThisMonth = (loyalty?.history ?? [])
    .filter((h) => h.points > 0)
    .filter((h) => {
      // Naively match "Apr 18" style dates against current month. Any entry
      // that can't be parsed is ignored (stale seed data).
      const parsed = new Date(`${h.date}, ${now.getFullYear()}`);
      if (isNaN(parsed.getTime())) return false;
      return monthOfIso(parsed.toISOString().slice(0, 10)) === thisMonth;
    })
    .reduce((s, h) => s + h.points, 0);

  const pointsRedeemed = (loyalty?.history ?? [])
    .filter((h) => h.points < 0)
    .reduce((s, h) => s + Math.abs(h.points), 0);

  // Highest-denomination card the user could redeem right now with their
  // current point balance. Mirrors REWARDS in LoyaltyTab.
  const REWARDS = [
    { amount: 25, pts: 500 },
    { amount: 50, pts: 900 },
    { amount: 75, pts: 1200 },
    { amount: 100, pts: 1500 },
  ];
  const redeemableValueUsd = REWARDS.reduce((best, r) => (points >= r.pts ? r.amount : best), 0);

  const publishedThisMonth = listings.filter((l) => l.status === "published").length;

  return (
    <>
      {/* Greeting */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontSize: 41, fontWeight: 400, color: "#1a1a1a", letterSpacing: "-0.5px", marginBottom: 6 }}>
          {greeting}, Greenfield <span role="img" aria-hidden style={{ fontSize: 32, marginLeft: 6 }}>👋</span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f0f3f7", borderRadius: 20, padding: "4px 12px", fontSize: 13, color: "#888" }}>
          <span style={{ fontSize: 13 }}>{todayLabel}</span>
        </div>
      </div>

      <div className="grid-2">
        {/* Monthly listings mini bar chart */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="card-header">
            <div className="card-title" style={{ fontWeight: 600 }}>Monthly listings</div>
            <span className="card-action" onClick={() => onGoto("listings")}>See all</span>
          </div>
          <div style={{ fontSize: 14, color: "#888", marginBottom: 4 }}>Last 6 months</div>
          <div style={{ marginTop: "auto" }}>
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
        </div>

        {/* Loyalty points — matching new design */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Loyalty points</div>
            <span className="card-action" onClick={() => onGoto("loyalty")}>See all</span>
          </div>
          <div style={{ fontSize: 14, color: "#888", marginBottom: 14 }}>
            {tier} tier · {silverAway.toLocaleString()} pts to Silver
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: "#1a1a1a", lineHeight: 1, letterSpacing: "-1px" }}>
              {points.toLocaleString()}
            </span>
            <span style={{ fontSize: 14, color: "#888", fontWeight: 500 }}>points</span>
            {redeemableValueUsd > 0 && (
              <span style={{ marginLeft: 12, display: "inline-flex", alignItems: "baseline", gap: 6, paddingLeft: 12, borderLeft: "1px solid #e4e8ed" }}>
                <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Value</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: "#1a8fd1", lineHeight: 1 }}>${redeemableValueUsd.toLocaleString()}</span>
              </span>
            )}
          </div>

          <div style={{ background: "#f0f3f7", borderRadius: 4, height: 6, width: "100%", overflow: "hidden" }}>
            <div style={{ background: "#1a8fd1", borderRadius: 4, height: 6, width: `${silverPct}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            <span>{tier}</span>
            <span>Silver · 1,500</span>
          </div>

          <div style={{ display: "flex", gap: 0, marginTop: 16, paddingTop: 14, borderTop: "1px solid #f0f3f7" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 4 }}>This month</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#2e7d32" }}>+{pointsThisMonth.toLocaleString()}</div>
            </div>
            <div style={{ width: 1, background: "#f0f3f7", margin: "0 16px" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 4 }}>Redeemed</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{pointsRedeemed.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent listings — now with View/Edit column */}
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
              <th />
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr><td colSpan={6} className="empty">No listings yet. Click "+ New Obituary" to create one.</td></tr>
            )}
            {recent.map((l) => (
              <tr key={l.id}>
                <td>{l.deceasedName}</td>
                <td>{l.newspaper}</td>
                <td>{l.publicationDate ?? "—"}</td>
                <td><StatusBadge status={l.status} /></td>
                <td>{l.amountUsd ? formatCurrency(l.amountUsd) : "—"}</td>
                <td>
                  <span
                    className="text-link"
                    onClick={() => onOpenListing ? onOpenListing(l) : onGoto("listings")}
                  >
                    {l.status === "published" ? "View" : "Edit"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
