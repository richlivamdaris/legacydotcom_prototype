import { useEffect, useRef, useState } from "react";
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

const FH_EMAIL = "james@greenfieldFH.com";

const BG_STEP_LABELS = [
  "Creating cardholder record in Stripe Issuing…",
  "Generating virtual Visa card…",
  (amt: number) => `Loading $${amt.toFixed(2)} to card balance…`,
  (_amt: number, pts: number) => `Deducting ${pts.toLocaleString()} points from your account…`,
  "Card ready for use…",
];

export function RedeemModal({ loyalty, defaults, onClose, onRedeemed }: Props) {
  const [step, setStep] = useState<Step>("choose");
  const [selected, setSelected] = useState<{ amount: number; pts: number } | null>(defaults);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [bgStepsDone, setBgStepsDone] = useState<number>(0);
  const [cvcVisible, setCvcVisible] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && step !== "processing") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, step]);

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
  }, []);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  async function handleRedeem() {
    if (!selected) { setError("Please choose a reward amount."); return; }
    if (loyalty.points < selected.pts) { setError("Not enough points."); return; }

    setError(null);
    setBgStepsDone(0);
    setStep("processing");

    // Kick off the API call
    const pending = redeemPoints({
      amountUsd: selected.amount,
      pointsCost: selected.pts,
      recipientEmail: FH_EMAIL,
    });

    // Animate the 5 background steps — exactly matching the design (400, 900, 1500, 2100, 2600 ms)
    const delays = [400, 900, 1500, 2100, 2600];
    delays.forEach((d, i) => {
      timersRef.current.push(setTimeout(() => setBgStepsDone(i + 1), d));
    });

    try {
      const r = await pending;
      setResult(r);
      // Reveal after all 5 steps + small settle (~3200 ms total in design)
      timersRef.current.push(setTimeout(() => setStep("reveal"), 3200));
      await onRedeemed();
    } catch (err) {
      clearTimers();
      setError(err instanceof Error ? err.message : "Failed to issue card");
      setStep("choose");
    }
  }

  function copyCardNumber() {
    if (!result) return;
    const num = `4242 4242 4242 ${result.last4}`.replace(/\s/g, "");
    if (navigator.clipboard) navigator.clipboard.writeText(num).catch(() => {});
    setCopyLabel("Copied!");
    setTimeout(() => setCopyLabel("Copy"), 1500);
  }

  function walletAdded(walletName: string, btn: HTMLButtonElement) {
    const orig = btn.innerHTML;
    btn.textContent = `✓ Added to ${walletName}`;
    btn.style.background = "#16a34a";
    btn.style.color = "#fff";
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.style.background = "";
      btn.style.color = "";
    }, 2500);
  }

  const amountForTitle = selected?.amount ?? 25;
  const ptsForTitle = selected?.pts ?? 500;

  return (
    <div
      className="redeem-overlay open"
      onClick={(e) => { if (e.target === e.currentTarget && step !== "processing") onClose(); }}
    >
      <div className="redeem-modal" onClick={(e) => e.stopPropagation()}>
        <div className="redeem-modal-header">
          <h3>{step === "reveal" ? "Virtual Card Issued" : "Redeem for Virtual Card"}</h3>
          {step !== "processing" && (
            <button type="button" className="redeem-modal-close" onClick={onClose}>✕</button>
          )}
        </div>

        {step === "choose" && (
          <div className="redeem-step active">
            <div className="redeem-body">
              <p style={{ fontSize: 14, color: "#555", marginBottom: 4, lineHeight: 1.6 }}>
                Choose the value of your Stripe virtual Visa card. It's loaded with cash, issued instantly, and usable anywhere Visa is accepted — online or via Apple / Google Pay.
              </p>

              <div style={{ background: "#f0f7fd", borderRadius: 8, padding: "12px 14px", margin: "14px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#555" }}>Available balance</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#1a8fd1" }}>{loyalty.points.toLocaleString()} pts</span>
              </div>

              <div style={{ fontSize: 13, fontWeight: 700, color: "#444", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Stripe Virtual Card
              </div>
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
                      title={can ? undefined : `Need ${r.pts.toLocaleString()} points`}
                    >
                      <div className="opt-amount">${r.amount}</div>
                      <div className="opt-pts">{r.pts.toLocaleString()} points</div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div style={{ marginTop: 12, background: "#fdecea", border: "1px solid #f5c6c2", color: "#7d2b24", padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <button type="button" onClick={onClose} style={{ fontFamily: "'Open Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "#888", background: "#fff", border: "1.5px solid #dde2e8", borderRadius: 8, padding: "11px 22px", cursor: "pointer" }}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRedeem}
                  disabled={!selected}
                  style={{
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#fff",
                    background: selected ? "#1a8fd1" : "#ccc",
                    border: "none",
                    borderRadius: 8,
                    padding: "11px 28px",
                    cursor: selected ? "pointer" : "not-allowed",
                    transition: "all 0.15s",
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#635bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
                  </svg>
                  Powered by Stripe Issuing
                </div>

                <div style={{ marginTop: 20, background: "#f8f9fb", borderRadius: 10, padding: 14, textAlign: "left", fontSize: 13, color: "#555", lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>What's happening in the background</div>
                  {BG_STEP_LABELS.map((labelOrFn, i) => {
                    const done = bgStepsDone > i;
                    const label = typeof labelOrFn === "string" ? labelOrFn : labelOrFn(amountForTitle, ptsForTitle);
                    return (
                      <div key={i} style={{ color: done ? "#16a34a" : "#aaa", transition: "color 0.2s" }}>
                        {done ? "✓" : "◦"}&nbsp;&nbsp;{label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "reveal" && result && (
          <div className="redeem-step active">
            <div className="redeem-body">
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, background: "#dcfce7", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="m9 11 3 3L22 4" />
                  </svg>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>Your virtual card is ready</div>
                <div style={{ fontSize: 13, color: "#888" }}>Use it anywhere Visa is accepted — online, in-app, or via Apple/Google Pay</div>
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
                  4242 &nbsp; 4242 &nbsp; 4242 &nbsp; {result.last4}
                  <button type="button" className="vc-copy-btn" onClick={copyCardNumber}>{copyLabel}</button>
                </div>
                <div className="vc-bottom">
                  <div className="vc-field">
                    <div className="vc-field-label">Expires</div>
                    <div className="vc-field-value">
                      {String(result.expMonth).padStart(2, "0")}/{String(result.expYear).slice(-2)}
                    </div>
                  </div>
                  <div className="vc-field">
                    <div className="vc-field-label">CVC</div>
                    <div className="vc-field-value">
                      <span>{cvcVisible ? "737" : "•••"}</span>
                      <button type="button" className="vc-copy-btn" onClick={() => setCvcVisible((v) => !v)}>
                        {cvcVisible ? "Hide" : "Reveal"}
                      </button>
                    </div>
                  </div>
                  <div className="vc-balance">
                    <div className="vc-field-label">Balance</div>
                    <div className="vc-balance-amount">${result.amountUsd.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div className="vc-instructions">
                <strong>How to use this card:</strong><br />
                Add to Apple Pay or Google Pay using the buttons below, or use the card number, expiry, and CVC for online purchases. This card is single-use and will expire once the balance is spent.
              </div>

              <div className="wallet-add-row">
                <button
                  type="button"
                  className="wallet-add-btn apple"
                  onClick={(e) => walletAdded("Apple Pay", e.currentTarget)}
                >
                  <span style={{ fontSize: 18 }}></span> Add to Apple Pay
                </button>
                <button
                  type="button"
                  className="wallet-add-btn google"
                  onClick={(e) => walletAdded("Google Pay", e.currentTarget)}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#4285f4" }}>G</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#ea4335" }}>o</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#fbbc04" }}>o</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#34a853" }}>g</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#4285f4" }}>l</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#ea4335" }}>e</span>
                  &nbsp; Pay
                </button>
              </div>

              <div className="stripe-issuing-note">
                <span className="stripe-purple">stripe</span> Issued via Stripe Issuing · $0.10 per card · PCI-DSS compliant
              </div>

              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ fontFamily: "'Open Sans', sans-serif", fontSize: 14, fontWeight: 700, color: "#fff", background: "#1a8fd1", border: "none", borderRadius: 8, padding: 13, width: "100%", cursor: "pointer" }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
