import { useEffect, useState } from "react";
import type { LoyaltyState, RedeemResult } from "./api.js";
import { redeemPoints } from "./api.js";

interface Props {
  loyalty: LoyaltyState;
  defaults: { amount: number; pts: number } | null;
  onClose: () => void;
  onRedeemed: () => void | Promise<void>;
}

type Step = "choose" | "processing" | "reveal";

const REWARDS: Array<{ amount: number; pts: number }> = [
  { amount: 25, pts: 500 },
  { amount: 50, pts: 900 },
  { amount: 75, pts: 1200 },
  { amount: 100, pts: 1500 },
];

export function RedeemModal({ loyalty, defaults, onClose, onRedeemed }: Props) {
  const [step, setStep] = useState<Step>("choose");
  const [selected, setSelected] = useState<{ amount: number; pts: number } | null>(defaults);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RedeemResult | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && step !== "processing") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, step]);

  async function handleRedeem() {
    if (!selected) { setError("Please choose a reward amount."); return; }
    if (!email.includes("@")) { setError("Please enter a valid recipient email."); return; }
    if (loyalty.points < selected.pts) { setError("Not enough points."); return; }

    setError(null);
    setStep("processing");
    try {
      const r = await redeemPoints({
        amountUsd: selected.amount,
        pointsCost: selected.pts,
        recipientEmail: email.trim(),
      });
      setResult(r);
      // Artificial small delay so the step animation reads
      setTimeout(() => setStep("reveal"), 900);
      await onRedeemed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to issue card");
      setStep("choose");
    }
  }

  return (
    <div className="redeem-overlay open" onClick={(e) => { if (e.target === e.currentTarget && step !== "processing") onClose(); }}>
      <div className="redeem-modal" onClick={(e) => e.stopPropagation()}>
        <div className="redeem-modal-header">
          <h3>{step === "reveal" ? "💳 Virtual Card Issued" : "💳 Redeem for Virtual Card"}</h3>
          {step !== "processing" && (
            <button className="redeem-modal-close" onClick={onClose}>✕</button>
          )}
        </div>

        {step === "choose" && (
          <div className="redeem-step active">
            <div className="redeem-body">
              <p style={{ fontSize: 14, color: "#555", marginBottom: 4, lineHeight: 1.6 }}>
                Choose the value of your Stripe virtual Visa card. Issued instantly via Stripe Issuing and sent to the recipient by email.
              </p>
              <div style={{ background: "#f0f7fd", borderRadius: 8, padding: "12px 14px", margin: "14px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#555" }}>Available balance</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#1a8fd1" }}>{loyalty.points.toLocaleString()} pts</span>
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: "#444", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Stripe Virtual Card</div>
              <div className="reward-amount-grid">
                {REWARDS.map((r) => {
                  const can = loyalty.points >= r.pts;
                  const isSelected = selected?.amount === r.amount && selected.pts === r.pts;
                  return (
                    <div
                      key={r.amount}
                      className={`reward-amount-opt ${isSelected ? "selected" : ""}`}
                      onClick={() => can && setSelected({ amount: r.amount, pts: r.pts })}
                      style={{ opacity: can ? 1 : 0.45, cursor: can ? "pointer" : "default" }}
                    >
                      <div className="opt-amount">${r.amount}</div>
                      <div className="opt-pts">{r.pts.toLocaleString()} points</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#444", display: "block", marginBottom: 6 }}>
                  Send card to (email) <span style={{ color: "#c0392b" }}>*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  style={{ fontFamily: "'Open Sans',sans-serif", fontSize: 14, color: "#1a1a1a", background: "#f5f7f9", border: "1.5px solid #e0e4e8", borderRadius: 8, padding: "12px 14px", width: "100%", outline: "none" }}
                />
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
                  The recipient will receive the card details by email once the card is issued.
                </div>
              </div>

              {error && (
                <div style={{ marginTop: 12, background: "#fdecea", border: "1px solid #f5c6c2", color: "#7d2b24", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <button onClick={onClose} style={{ fontFamily: "'Open Sans',sans-serif", fontSize: 14, fontWeight: 600, color: "#888", background: "#fff", border: "1.5px solid #dde2e8", borderRadius: 8, padding: "11px 22px", cursor: "pointer" }}>Cancel</button>
                <button
                  onClick={handleRedeem}
                  disabled={!selected || !email.includes("@")}
                  style={{
                    fontFamily: "'Open Sans',sans-serif", fontSize: 14, fontWeight: 700, color: "#fff",
                    background: selected && email.includes("@") ? "#1a8fd1" : "#ccc",
                    border: "none", borderRadius: 8, padding: "11px 28px",
                    cursor: selected && email.includes("@") ? "pointer" : "not-allowed",
                  }}
                >
                  Issue Virtual Card →
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="redeem-step active">
            <div className="redeem-body">
              <div className="processing-state">
                <div className="processing-spinner" />
                <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>Issuing your virtual card…</div>
                <p>Stripe is generating your card details.<br />This takes just a moment.</p>
                <div className="stripe-badge">
                  <span style={{ fontSize: 16 }}>⚡</span>
                  Powered by Stripe Issuing
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "reveal" && result && (
          <div className="redeem-step active">
            <div className="redeem-body">
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, background: "#dcfce7", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>Card issued &amp; sent</div>
                <div style={{ fontSize: 13, color: "#888" }}>We've emailed the card details to <strong>{email}</strong>.</div>
              </div>

              <div className="virtual-card">
                <div className="vc-top">
                  <div>
                    <div className="vc-label">Legacy Loyalty</div>
                    <div className="vc-issuer">Greenfield Funeral Home</div>
                  </div>
                  <div className="vc-network">VISA</div>
                </div>
                <div className="vc-number">
                  •••• &nbsp; •••• &nbsp; •••• &nbsp; {result.last4}
                </div>
                <div className="vc-bottom">
                  <div className="vc-field">
                    <div className="vc-field-label">Expires</div>
                    <div className="vc-field-value">
                      {String(result.expMonth).padStart(2, "0")}/{String(result.expYear).slice(-2)}
                    </div>
                  </div>
                  <div className="vc-balance">
                    <div className="vc-field-label">Balance</div>
                    <div className="vc-balance-amount">${result.amountUsd.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div className="vc-instructions">
                <strong>Card ID:</strong> <code style={{ fontSize: 12 }}>{result.cardId}</code><br />
                Full card number &amp; CVC are visible in the Stripe Dashboard.
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <a
                  href={result.dashboardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-view"
                  style={{ flex: 1, textAlign: "center", textDecoration: "none", padding: "11px 16px" }}
                >
                  View in Stripe Dashboard ↗
                </a>
                <button
                  onClick={onClose}
                  style={{ flex: 1, fontFamily: "'Open Sans',sans-serif", fontSize: 14, fontWeight: 700, color: "#fff", background: "#1a8fd1", border: "none", borderRadius: 8, padding: "11px 16px", cursor: "pointer" }}
                >
                  Done
                </button>
              </div>

              <div className="stripe-issuing-note" style={{ marginTop: 14 }}>
                <span className="stripe-purple">stripe</span> Issued via Stripe Issuing · PCI-DSS compliant
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
