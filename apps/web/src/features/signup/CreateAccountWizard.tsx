import { Fragment, useEffect, useRef, useState } from "react";
import { openPaymentPopup } from "../dashboard/paymentPopup.js";

export type ConnectStatus = "pending" | "in-progress" | "verified";

export interface AccountFormData {
  fhName: string;
  contactName: string;
  email: string;
  phone: string;
  state: string;
  city: string;
  address: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
  cardName: string;
  defaultCity: string;
  defaultReturnAddress: string;
  connectStatus: ConnectStatus;
  connectAccountId: string | null;
}

interface Props {
  onClose: () => void;
  onComplete: (data: AccountFormData) => void;
}

type StepNum = 1 | 2 | 3 | 4;

const STATES = [
  "Connecticut", "Maine", "Massachusetts", "New Hampshire", "New Jersey",
  "New York", "Pennsylvania", "Rhode Island", "Vermont",
  "California", "Florida", "Texas", "Other",
];

const BLANK: AccountFormData = {
  fhName: "", contactName: "", email: "", phone: "", state: "", city: "", address: "",
  cardNumber: "", expiry: "", cvc: "", cardName: "",
  defaultCity: "", defaultReturnAddress: "",
  connectStatus: "pending", connectAccountId: null,
};

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
  color: "#888", fontFamily: "'Open Sans', sans-serif",
};

const INPUT: React.CSSProperties = {
  fontFamily: "'Open Sans', sans-serif",
  fontSize: 14, color: "#1a1a1a", background: "#f5f7f9",
  border: "1.5px solid #e0e4e8", borderRadius: 8, padding: "11px 13px",
  width: "100%", outline: "none", boxSizing: "border-box",
  transition: "border-color .15s, background .15s",
};

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...(full ? { gridColumn: "1 / -1" } : {}) }}>
      <label style={LABEL}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", maxLength }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => { e.currentTarget.style.borderColor = "#1a8fd1"; e.currentTarget.style.background = "#fff"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "#e0e4e8"; e.currentTarget.style.background = "#f5f7f9"; }}
      style={INPUT}
    />
  );
}

function StepCircle({ n, state }: { n: number; state: "done" | "current" | "pending" }) {
  const base: React.CSSProperties = {
    width: 40, height: 40, borderRadius: "50%", display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700,
    fontFamily: "'Open Sans', sans-serif", flexShrink: 0,
  };
  if (state === "done") {
    return (
      <div style={{ ...base, background: "#16a34a", color: "#fff" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
    );
  }
  if (state === "current") {
    return <div style={{ ...base, background: "#1a8fd1", color: "#fff" }}>{n}</div>;
  }
  return <div style={{ ...base, background: "#f0f3f7", color: "#aaa", border: "2px solid #e4e8ed" }}>{n}</div>;
}

function Stepper({ step }: { step: StepNum }) {
  const labels = ["Your details", "Payment", "Branding", "Done"];
  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: 680, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", width: "100%" }}>
        {labels.map((label, i) => {
          const n = (i + 1) as StepNum;
          const state: "done" | "current" | "pending" =
            step > n ? "done" : step === n ? "current" : "pending";
          const labelColor = state === "pending" ? "#aaa" : "#1a8fd1";
          const labelWeight = state === "pending" ? 600 : 700;
          return (
            <Fragment key={n}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <StepCircle n={n} state={state} />
                <div style={{
                  fontSize: 11, fontWeight: labelWeight, color: labelColor, whiteSpace: "nowrap",
                  fontFamily: "'Open Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  {label}
                </div>
              </div>
              {i < labels.length - 1 && (
                <div style={{ flex: 1, height: 2, background: "#e4e8ed", margin: "20px 0 0", minWidth: 0 }} />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "1.75rem",
      marginBottom: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>{title}</div>
      <hr style={{ border: "none", borderTop: "1px solid #e4e8ed", margin: "1rem 0" }} />
      {children}
    </div>
  );
}

function CtaRow({ onBack, primaryLabel, onPrimary, primaryDisabled }: {
  onBack?: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: "0.75rem", marginTop: "0.75rem" }}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          style={{
            fontFamily: "'Open Sans', sans-serif", fontSize: 14, fontWeight: 600,
            background: "#fff", color: "#1a1a1a", border: "1.5px solid #e5e7eb",
            borderRadius: 8, padding: "0 20px", height: 44, cursor: "pointer",
          }}
        >
          ← Back
        </button>
      ) : <div />}
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled}
        style={{
          fontFamily: "'Open Sans', sans-serif", fontSize: 14, fontWeight: 700,
          background: primaryDisabled ? "#9cc6e3" : "#1a8fd1",
          color: "#fff", border: "none", borderRadius: 8,
          padding: "0 24px", height: 44, cursor: primaryDisabled ? "not-allowed" : "pointer",
          transition: "background 0.15s",
        }}
        onMouseOver={(e) => { if (!primaryDisabled) e.currentTarget.style.background = "#1480be"; }}
        onMouseOut={(e) => { if (!primaryDisabled) e.currentTarget.style.background = "#1a8fd1"; }}
      >
        {primaryLabel}
      </button>
    </div>
  );
}

function ConnectStatusPill({ status }: { status: ConnectStatus }) {
  const cfg = {
    "pending":     { bg: "#fef3c7", fg: "#b45309", dot: "#d97706", label: "Not started" },
    "in-progress": { bg: "#e0f2fe", fg: "#0369a1", dot: "#0284c7", label: "Onboarding in progress…" },
    "verified":    { bg: "#dcfce7", fg: "#15803d", dot: "#16a34a", label: "Verified" },
  }[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: cfg.bg, color: cfg.fg, borderRadius: 999,
      padding: "3px 10px", fontSize: 11, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function ConnectOnboardingCard({ status, fhName, emailValid, onStart, onResume, error }: {
  status: ConnectStatus;
  fhName: string;
  emailValid: boolean;
  onStart: () => void;
  onResume: () => void;
  error: string | null;
}) {
  const verified = status === "verified";
  const inProgress = status === "in-progress";
  return (
    <div style={{
      background: "#fff", borderRadius: 12,
      padding: "1.5rem", marginBottom: "1.25rem",
      border: verified ? "1.5px solid #86efac" : "1.5px solid #e4e8ed",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ background: "#635bff", color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
            stripe
          </span>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>
            Stripe Connect onboarding
          </div>
        </div>
        <ConnectStatusPill status={status} />
      </div>

      <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, margin: "0 0 14px" }}>
        Required before {fhName.trim() || "your funeral home"} can transact. Stripe verifies your
        business (KYB), captures beneficial-owner details, and sets up the Connected Account that
        backs your invoices, payouts, and Issuing loyalty cards.
      </p>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 10, marginBottom: 14,
        fontSize: 12, color: "#555",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span> Business & tax ID (KYB)
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span> Beneficial owners
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span> Payout bank account
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span> Enables loyalty card issuing
        </div>
      </div>

      <button
        type="button"
        onClick={verified ? undefined : inProgress ? onResume : onStart}
        disabled={verified || (!emailValid && status === "pending")}
        style={{
          fontFamily: "'Open Sans', sans-serif",
          width: "100%",
          height: 44,
          borderRadius: 8, border: "none",
          background: verified ? "#dcfce7" : (!emailValid && status === "pending") ? "#c4c0f5" : "#635bff",
          color: verified ? "#15803d" : "#fff",
          fontSize: 14, fontWeight: 700,
          cursor: verified || (!emailValid && status === "pending") ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "background 0.15s",
        }}
        onMouseOver={(e) => {
          if (!verified && emailValid) e.currentTarget.style.background = "#5147e0";
        }}
        onMouseOut={(e) => {
          if (!verified && emailValid) e.currentTarget.style.background = "#635bff";
        }}
      >
        {verified
          ? "✓ Connected account verified"
          : inProgress
          ? "Reopen Stripe onboarding →"
          : "Continue to Stripe →"}
      </button>

      {inProgress && (
        <p style={{ fontSize: 12, color: "#0369a1", marginTop: 10, marginBottom: 0, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "2px solid #0369a1", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          Waiting for Stripe to confirm your details…
        </p>
      )}

      {!emailValid && status === "pending" && (
        <p style={{ fontSize: 11, color: "#888", marginTop: 10, marginBottom: 0, textAlign: "center" }}>
          Enter your email in Step 1 before starting Connect onboarding.
        </p>
      )}

      {error && (
        <p style={{ fontSize: 12, color: "#c0392b", marginTop: 10, marginBottom: 0, textAlign: "center", fontWeight: 600 }}>
          {error}
        </p>
      )}

      {!inProgress && !error && (
        <p style={{ fontSize: 11, color: "#888", marginTop: 10, marginBottom: 0, textAlign: "center" }}>
          You can skip this for now and complete it from your profile, but invoices cannot be
          created until the Connected Account is verified.
        </p>
      )}
    </div>
  );
}

export function CreateAccountWizard({ onClose, onComplete }: Props) {
  const [step, setStep] = useState<StepNum>(1);
  const [data, setData] = useState<AccountFormData>(BLANK);
  const [connectError, setConnectError] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  function update<K extends keyof AccountFormData>(key: K, value: AccountFormData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  // Poll Connect status every 2.5s while onboarding is in progress. The
  // hosted Stripe flow opens in a new tab/popup; when the user finishes,
  // Stripe marks details_submitted=true and this loop picks it up.
  useEffect(() => {
    if (data.connectStatus !== "in-progress" || !data.connectAccountId) return;
    const id = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/connect/status/${encodeURIComponent(data.connectAccountId!)}`);
        if (!res.ok) return;
        const body = (await res.json()) as { detailsSubmitted?: boolean };
        if (body.detailsSubmitted) {
          setData((prev) => ({ ...prev, connectStatus: "verified" }));
        }
      } catch {
        // Transient errors during polling are fine — keep trying.
      }
    }, 2500);
    pollTimerRef.current = id;
    return () => {
      window.clearInterval(id);
      pollTimerRef.current = null;
    };
  }, [data.connectStatus, data.connectAccountId]);

  async function startConnectOnboarding() {
    if (data.connectStatus !== "pending") return;
    setConnectError(null);
    try {
      const res = await fetch("/api/connect/onboard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          fhName: data.fhName,
          country: "US",
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Onboarding failed (${res.status})`);
      }
      const body = (await res.json()) as { accountId: string; onboardingUrl: string };
      setData((prev) => ({
        ...prev,
        connectStatus: "in-progress",
        connectAccountId: body.accountId,
      }));
      // Opens the hosted Stripe onboarding in a tab or popup depending on
      // the user's mode toggle. The status poller above picks up completion.
      void openPaymentPopup(body.onboardingUrl);
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Onboarding failed");
    }
  }

  async function resumeConnectOnboarding() {
    if (!data.connectAccountId) return;
    setConnectError(null);
    try {
      const res = await fetch(`/api/connect/resume/${encodeURIComponent(data.connectAccountId)}`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Resume failed (${res.status})`);
      }
      const body = (await res.json()) as { onboardingUrl: string };
      void openPaymentPopup(body.onboardingUrl);
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Resume failed");
    }
  }

  const step1Valid =
    data.fhName.trim() !== "" && data.contactName.trim() !== "" &&
    data.email.trim() !== "" && data.phone.trim() !== "" &&
    data.state !== "" && data.city.trim() !== "" && data.address.trim() !== "";

  const step2Valid =
    data.cardNumber.replace(/\s/g, "").length >= 13 &&
    data.expiry.replace(/\D/g, "").length === 4 &&
    data.cvc.length >= 3 && data.cardName.trim() !== "";

  const step3Valid = data.defaultCity.trim() !== "" && data.defaultReturnAddress.trim() !== "";

  function goNext() {
    if (step === 3) {
      onComplete(data);
      setStep(4);
      return;
    }
    if (step < 4) setStep((step + 1) as StepNum);
  }

  function goBack() {
    if (step > 1) setStep((step - 1) as StepNum);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999, overflowY: "auto",
      fontFamily: "'Open Sans', sans-serif", background: "#f0f3f7",
    }}>
      {/* Blue top nav — Cancel left, "app." center, spacer right */}
      <div style={{ background: "linear-gradient(135deg, #1a8fd1 0%, #0d5fa3 60%, #0a4a8a 100%)" }}>
        <div style={{ height: 73, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.85)",
              cursor: "pointer", fontSize: 14, fontWeight: 600,
              fontFamily: "'Open Sans', sans-serif",
              display: "flex", alignItems: "center", gap: 8, padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Cancel
          </button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "'Open Sans', sans-serif", lineHeight: 1 }}>
              app<span style={{ opacity: 0.5 }}>.</span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "'Open Sans', sans-serif" }}>
              powered by Obituaries.com
            </div>
          </div>
          <div style={{ width: 80 }} />
        </div>
      </div>

      <Stepper step={step} />

      <div style={{ background: "#f0f3f7", minHeight: "calc(100vh - 200px)", padding: "32px 24px 34px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>

          {step === 1 && (
            <>
              <FormCard title="Funeral home details">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <Field label="Funeral home name" full>
                    <TextInput value={data.fhName} onChange={(v) => update("fhName", v)} placeholder="e.g. Greenfield Funeral Home" />
                  </Field>
                  <Field label="Contact name">
                    <TextInput value={data.contactName} onChange={(v) => update("contactName", v)} placeholder="e.g. James Greenfield" />
                  </Field>
                  <Field label="Email">
                    <TextInput type="email" value={data.email} onChange={(v) => update("email", v)} placeholder="e.g. james@yourfh.com" />
                  </Field>
                  <Field label="Phone">
                    <TextInput type="tel" value={data.phone} onChange={(v) => update("phone", v)} placeholder="e.g. (860) 555-0143" />
                  </Field>
                  <Field label="State">
                    <select
                      value={data.state}
                      onChange={(e) => update("state", e.target.value)}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#1a8fd1"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#e0e4e8"; }}
                      style={{ ...INPUT, cursor: "pointer", appearance: "none", paddingRight: 36,
                        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 13px center",
                      }}
                    >
                      <option value="">Select state…</option>
                      {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="City">
                    <TextInput value={data.city} onChange={(v) => update("city", v)} placeholder="e.g. Hartford" />
                  </Field>
                  <Field label="Street address" full>
                    <TextInput value={data.address} onChange={(v) => update("address", v)} placeholder="e.g. 142 Elm Street, Hartford, CT 06103" />
                  </Field>
                </div>
              </FormCard>
              <CtaRow primaryLabel="Continue →" onPrimary={goNext} primaryDisabled={!step1Valid} />
            </>
          )}

          {step === 2 && (
            <>
              <FormCard title="Payment method">
                <p style={{ fontSize: 14, color: "#888", marginBottom: "1rem" }}>
                  Saved for monthly invoice auto-pay. You won't be charged today.
                </p>
                <div style={{
                  background: "#f8f9fb", border: "1.5px solid #e0e4e8",
                  borderRadius: 10, padding: 18, marginBottom: "1rem",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <span style={{ background: "#635bff", color: "#fff", borderRadius: 5, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>stripe</span>
                    <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>Secure · Encrypted</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Field label="Card number" full>
                      <TextInput
                        value={data.cardNumber}
                        onChange={(v) => update("cardNumber", formatCardNumber(v))}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                      />
                    </Field>
                    <Field label="Expiry">
                      <TextInput
                        value={data.expiry}
                        onChange={(v) => update("expiry", formatExpiry(v))}
                        placeholder="MM / YY"
                        maxLength={7}
                      />
                    </Field>
                    <Field label="CVC">
                      <TextInput
                        value={data.cvc}
                        onChange={(v) => update("cvc", v.replace(/\D/g, "").slice(0, 4))}
                        placeholder="123"
                        maxLength={4}
                      />
                    </Field>
                    <Field label="Name on card" full>
                      <TextInput value={data.cardName} onChange={(v) => update("cardName", v)} placeholder="e.g. James Greenfield" />
                    </Field>
                  </div>
                </div>
              </FormCard>

              <ConnectOnboardingCard
                status={data.connectStatus}
                fhName={data.fhName}
                emailValid={data.email.includes("@")}
                onStart={startConnectOnboarding}
                onResume={resumeConnectOnboarding}
                error={connectError}
              />

              <CtaRow onBack={goBack} primaryLabel="Continue →" onPrimary={goNext} primaryDisabled={!step2Valid} />
            </>
          )}

          {step === 3 && (
            <>
              <FormCard title="Branding & defaults">
                <p style={{ fontSize: 14, color: "#888", marginBottom: "1rem" }}>
                  Applied automatically to every obituary. Update any time in your profile.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <Field label="Default city">
                    <TextInput value={data.defaultCity} onChange={(v) => update("defaultCity", v)} placeholder="e.g. Hartford, CT" />
                  </Field>
                  <Field label="Default return address">
                    <TextInput value={data.defaultReturnAddress} onChange={(v) => update("defaultReturnAddress", v)} placeholder="e.g. 142 Elm St, Hartford CT" />
                  </Field>
                </div>
              </FormCard>
              <CtaRow onBack={goBack} primaryLabel="Create account →" onPrimary={goNext} primaryDisabled={!step3Valid} />
            </>
          )}

          {step === 4 && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{
                width: 64, height: 64, background: "#dcfce7", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 1.25rem",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>
                Account created!
              </div>
              <div style={{ fontSize: 14, color: "#888", lineHeight: 1.7, marginBottom: "2rem" }}>
                Welcome, <strong style={{ color: "#1a1a1a" }}>{data.contactName || "there"}</strong>! Your account is set up and ready to go.
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  fontFamily: "'Open Sans', sans-serif", width: "100%",
                  background: "#1a8fd1", color: "#fff", border: "none",
                  borderRadius: 10, padding: 15, fontSize: 15, fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Go to your dashboard →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
