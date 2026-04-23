import { useEffect, useMemo, useState } from "react";
import { createListing, deleteListing, type Listing, type PaymentMode } from "./api.js";
import { InfoIcon } from "./shared.js";

interface Props {
  onClose: () => void;
  onCreated: () => void | Promise<void>;
  editing?: Listing | null;
  onAddToCart?: (listing: Listing) => void;
}

// Split "John A. Smith" → { first: "John", middle: "A.", last: "Smith" }
function splitName(full: string): { first: string; middle: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return { first: "", middle: "", last: "" };
  if (parts.length === 1) return { first: parts[0], middle: "", last: "" };
  if (parts.length === 2) return { first: parts[0], middle: "", last: parts[1] };
  return { first: parts[0], middle: parts.slice(1, -1).join(" "), last: parts[parts.length - 1] };
}

interface NewspaperOption {
  name: string;
  state: string;      // "CT", "DC", "NY"
  stateName: string;  // "Connecticut", "District of Columbia", "New York"
  city: string;
  cityKey: string;    // slug for dropdown value
  group: string;
  rateFrom: number;
  billingPartner: boolean;
  feePercent: number;
}

const NEWSPAPERS: NewspaperOption[] = [
  { name: "Hartford Courant",    state: "CT", stateName: "Connecticut",           city: "Hartford",   cityKey: "hartford",   group: "Gannett",           rateFrom: 85,  billingPartner: true,  feePercent: 2.0 },
  { name: "New Haven Register",  state: "CT", stateName: "Connecticut",           city: "New Haven",  cityKey: "new-haven",  group: "Hearst Newspapers", rateFrom: 72,  billingPartner: false, feePercent: 0 },
  { name: "Connecticut Post",    state: "CT", stateName: "Connecticut",           city: "Bridgeport", cityKey: "bridgeport", group: "Hearst Newspapers", rateFrom: 68,  billingPartner: false, feePercent: 0 },
  { name: "Washington Post",     state: "DC", stateName: "District of Columbia",  city: "Washington", cityKey: "washington", group: "Nash Holdings",     rateFrom: 520, billingPartner: true,  feePercent: 1.0 },
  { name: "New York Times",      state: "NY", stateName: "New York",              city: "New York",   cityKey: "new-york",   group: "NYT Company",       rateFrom: 780, billingPartner: true,  feePercent: 0.5 },
];

const FH_EMAIL = "james@greenfieldFH.com";

// Favourited publications shown on the Publication step (prototype only — not persisted).
// Matches Joe's 2026-04-23 HTML layout: Hartford Courant (billing partner) + New Haven Register.
const FAVOURITE_NEWSPAPERS: readonly string[] = ["Hartford Courant", "New Haven Register"];

type Step = 1 | 2 | 3 | 4;
type PayChoice = "account" | "card";

export function NewObituaryModal({ onClose, onCreated, editing, onAddToCart }: Props) {
  const isEditing = Boolean(editing);
  const initialName = useMemo(() => splitName(editing?.deceasedName ?? ""), [editing]);
  const initialState = useMemo(() => {
    // Guess the state from the newspaper if we have one
    const np = NEWSPAPERS.find((n) => n.name === editing?.newspaper);
    return np?.state ?? "CT";
  }, [editing]);

  const [step, setStep] = useState<Step>(1);

  const [newspaperName, setNewspaperName] = useState<string>(
    editing?.newspaper && NEWSPAPERS.some((n) => n.name === editing.newspaper)
      ? editing.newspaper
      : "Hartford Courant",
  );
  const [pubDate, setPubDate] = useState<string>(
    editing?.publicationDate ?? new Date().toISOString().slice(0, 10),
  );
  const [firstName, setFirstName] = useState(initialName.first);
  const [middleName, setMiddleName] = useState(initialName.middle);
  const [lastName, setLastName] = useState(initialName.last);
  const [city, setCity] = useState("Hartford");
  const [state, setState] = useState(initialState);
  const [dob, setDob] = useState("");
  const [dod, setDod] = useState(editing?.dateOfDeath ?? "");
  const [obitText, setObitText] = useState(editing?.obituaryText ?? "");

  const [pubSelected, setPubSelected] = useState<boolean>(isEditing);
  const [pubFinderOpen, setPubFinderOpen] = useState(false);
  const [payChoice, setPayChoice] = useState<PayChoice>("account");
  const [newCardOpen, setNewCardOpen] = useState(false);
  const [obitWriterNote, setObitWriterNote] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    ref: string;
    pointsEarned: number;
    newBalance: number;
  } | null>(null);

  const newspaper = useMemo(() => NEWSPAPERS.find((n) => n.name === newspaperName) ?? NEWSPAPERS[0], [newspaperName]);

  const words = obitText.trim() ? obitText.trim().split(/\s+/).length : 0;
  const wordPct = Math.min(100, Math.round((words / 250) * 100));
  const wordBarColor = words > 300 ? "#ef4444" : words >= 150 ? "#16a34a" : "#1a8fd1";

  const age = useMemo(() => {
    const d1 = parseLooseDate(dob);
    const d2 = parseLooseDate(dod);
    if (!d1 || !d2 || d2 <= d1) return "";
    let a = d2.getFullYear() - d1.getFullYear();
    const m = d2.getMonth() - d1.getMonth();
    if (m < 0 || (m === 0 && d2.getDate() < d1.getDate())) a -= 1;
    return a >= 0 && a < 130 ? String(a) : "";
  }, [dob, dod]);

  const deceasedFullName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(" ");
  const estimatedPrice = newspaper.rateFrom;
  const partnerFeeUsd = newspaper.billingPartner ? (estimatedPrice * newspaper.feePercent) / 100 : 0;

  const deadlineText = useMemo(() => deadlineFor(pubDate), [pubDate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function validateStep2(): string | null {
    if (!firstName.trim() || !lastName.trim()) return "Please enter the deceased's first and last name.";
    if (!city.trim() || !state.trim()) return "Please enter city and state.";
    if (!dod.trim()) return "Date of death is required.";
    if (!obitText.trim()) return "Obituary text is required.";
    return null;
  }

  async function removeEditingDraft() {
    if (editing && ["draft", "pending", "upcoming"].includes(editing.status)) {
      try { await deleteListing(editing.id); } catch (err) {
        console.warn("Couldn't delete old listing:", err);
      }
    }
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await removeEditingDraft();
      const res = await createListing({
        deceasedName: deceasedFullName,
        newspapers: [newspaperName],
        publicationDate: pubDate || null,
        amountUsd: estimatedPrice,
        paymentMode: (payChoice === "account" ? "on_account" : "invoice") as PaymentMode,
        notificationEmail: FH_EMAIL,
        dateOfDeath: dod || null,
        obituaryText: obitText,
      });
      setConfirmation({
        ref: res.listing.friendlyInvoiceId,
        pointsEarned: res.pointsEarned,
        newBalance: 0,
      });
      setStep(4);
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveAsDraft() {
    setError(null);
    if (!firstName.trim() && !lastName.trim() && !obitText.trim()) {
      setError("Nothing to save yet — add a name or some text first.");
      return;
    }
    setSubmitting(true);
    try {
      await removeEditingDraft();
      await createListing({
        deceasedName: deceasedFullName || "(untitled draft)",
        newspapers: [newspaperName],
        publicationDate: pubDate || null,
        amountUsd: estimatedPrice,
        paymentMode: (payChoice === "account" ? "on_account" : "invoice") as PaymentMode,
        notificationEmail: FH_EMAIL,
        dateOfDeath: dod || null,
        obituaryText: obitText,
        asDraft: true,
      });
      await onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSubmitting(false);
    }
  }

  async function addToCart() {
    setError(null);
    if (!firstName.trim() && !lastName.trim() && !obitText.trim()) {
      setError("Add a name or some text before adding to cart.");
      return;
    }
    setSubmitting(true);
    try {
      await removeEditingDraft();
      const res = await createListing({
        deceasedName: deceasedFullName || "(untitled draft)",
        newspapers: [newspaperName],
        publicationDate: pubDate || null,
        amountUsd: estimatedPrice,
        paymentMode: (payChoice === "account" ? "on_account" : "invoice") as PaymentMode,
        notificationEmail: FH_EMAIL,
        dateOfDeath: dod || null,
        obituaryText: obitText,
        asDraft: true,
      });
      if (onAddToCart) onAddToCart(res.listing);
      await onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to cart");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="obit-form-overlay"
      style={{ display: "block", position: "fixed", inset: 0, zIndex: 1000, overflowY: "auto" }}
    >
      {/* Sticky nav */}
      <div style={{ background: "#fff", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem", borderBottom: "1px solid #e8e8e8", position: "sticky", top: 0, zIndex: 10 }}>
        <button type="button" onClick={onClose} style={{ fontFamily: "'Open Sans',sans-serif", background: "none", border: "none", fontSize: 14, fontWeight: 600, color: "#888", cursor: "pointer", padding: "8px 0" }}>
          ← Back to Dashboard
        </button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.5px" }}>app<span style={{ color: "#1a8fd1", fontSize: 26 }}>.</span></div>
          <div style={{ fontSize: 11, color: "#999" }}>powered by Obituaries.com</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>Greenfield Funeral Home</span>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#1a8fd1,#0a4a8a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>GF</div>
        </div>
      </div>

      <div className="page">
        <h1 className="page-title">{isEditing ? "Edit Obituary Order" : "New Obituary Order"}</h1>

        <div className="stepper">
          <StepDot num={1} label="Publication" current={step} />
          <div className="step-line" />
          <StepDot num={2} label="Obituary Details" current={step} />
          <div className="step-line" />
          <StepDot num={3} label="Payment" current={step} />
        </div>

        {step === 1 && (
          <div className="step-screen active">
            {/* ─── Publication ─── */}
            <div className="form-card">
              <div className="card-header-row"><h2>Publication</h2></div>
              <hr className="card-divider" />

              {pubSelected ? (
                <div style={{ background: "#f0f7fd", border: "2px solid #1a8fd1", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{newspaper.name}</div>
                    <div style={{ fontSize: 14, color: "#888", marginTop: 2 }}>
                      {newspaper.city}, {newspaper.state} · {newspaper.group} · {newspaper.billingPartner ? "Newspaper billing partner" : `Your rate: from $${newspaper.rateFrom.toFixed(2)}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPubSelected(false)}
                    style={{ fontFamily: "'Open Sans',sans-serif", fontSize: 14, fontWeight: 600, color: "#1a8fd1", background: "none", border: "1.5px solid #b8d9ef", borderRadius: 7, padding: "8px 16px", cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    Change publication
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Your favourited publications</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {FAVOURITE_NEWSPAPERS.map((favName) => {
                        const fav = NEWSPAPERS.find((n) => n.name === favName);
                        if (!fav) return null;
                        return (
                          <div
                            key={fav.name}
                            className="fav-row"
                            onClick={() => { setNewspaperName(fav.name); setPubSelected(true); setError(null); }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>{fav.name}</div>
                              <div style={{ fontSize: 13, color: "#888" }}>{fav.city}, {fav.state} · {fav.group}</div>
                            </div>
                            {fav.billingPartner ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d", background: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" }}>Billing partner</span>
                            ) : (
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#555", whiteSpace: "nowrap" }}>From ${fav.rateFrom.toFixed(2)}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "0.75rem" }}>
                    <hr style={{ flex: 1, border: "none", borderTop: "1px solid #e4e8ed" }} />
                    <span style={{ fontSize: 13, color: "#aaa", whiteSpace: "nowrap" }}>or find a different publication</span>
                    <hr style={{ flex: 1, border: "none", borderTop: "1px solid #e4e8ed" }} />
                  </div>

                  <button
                    type="button"
                    onClick={() => setPubFinderOpen(true)}
                    style={{ fontFamily: "'Open Sans',sans-serif", fontSize: 14, fontWeight: 600, color: "#555", background: "#f3f4f6", border: "1.5px solid #d1d5db", borderRadius: 8, padding: "0 20px", height: 40, cursor: "pointer", width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    Find a Publication
                  </button>
                </>
              )}
            </div>

            {error && (
              <div className="deadline-warn" style={{ background: "#fdecea", color: "#7d2b24", border: "1px solid #f5c6c2" }}>
                ⚠️ {error}
              </div>
            )}

            <div className="cta-row" style={{ marginTop: "1.5rem" }}>
              <button type="button" className="btn-draft" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="btn-continue"
                onClick={() => {
                  if (!pubSelected) { setError("Please select a publication to continue."); return; }
                  setError(null);
                  setStep(2);
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-screen active">
            {/* ─── Publication Date ─── */}
            <div className="form-card">
              <h2>Publication Date <span className="req">*</span></h2>
              <hr className="card-divider" style={{ marginTop: "0.75rem" }} />
              <div className="field">
                <label>Select publication date</label>
                <input
                  type="date"
                  value={pubDate}
                  onChange={(e) => setPubDate(e.target.value)}
                  style={{ maxWidth: 320 }}
                />
              </div>
              {deadlineText && (
                <div className="deadline-warn" style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span><strong>Copy deadline for {deadlineText.label}:</strong>&nbsp; {deadlineText.deadline} — submit before then to guarantee inclusion</span>
                </div>
              )}
            </div>

            {/* ─── Deceased's Information ─── */}
            <div className="form-card">
              <div className="card-header-row"><h2>Deceased's Information</h2></div>
              <p className="card-subtitle">Enter the information exactly as you'd like it displayed in the obituary.</p>

              <div className="form-row cols-3">
                <div className="field">
                  <label>First Name <span className="req">*</span></label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" autoFocus />
                </div>
                <div className="field">
                  <label>Middle Name</label>
                  <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Optional" />
                </div>
                <div className="field">
                  <label>Last Name <span className="req">*</span></label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
                </div>
              </div>
              <div className="form-row cols-3-1">
                <div className="field">
                  <label>City of Last Residence <span className="req">*</span></label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="field">
                  <label>State <span className="req">*</span></label>
                  <input type="text" value={state} onChange={(e) => setState(e.target.value)} />
                </div>
              </div>
              <div className="form-row cols-3">
                <div className="field">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    min="1900-01-01"
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="field">
                  <label>Date of Death <span className="req">*</span></label>
                  <input
                    type="date"
                    value={dod}
                    onChange={(e) => setDod(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="field">
                  <label>Age</label>
                  <input type="text" value={age} readOnly placeholder="Auto-calculated" className={age ? "autocalc" : ""} />
                  {age && <div className="autocalc-tag">Auto-calculated</div>}
                </div>
              </div>
            </div>

            {/* ─── Obituary Text ─── */}
            <div className="form-card">
              <div className="card-header-row"><h2>Obituary Text <span className="req">*</span></h2></div>
              <hr className="card-divider" style={{ marginTop: "0.75rem" }} />
              <div className="word-guide">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a5f8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <div>
                  <strong>Standard obituaries are 150–250 words</strong> — this gives enough space to tell the person's story without significantly increasing the print cost. Longer text will be reflected in the final price on the next screen.
                </div>
              </div>
              <div className="field">
                <label>Obituary Text</label>
                <textarea
                  value={obitText}
                  onChange={(e) => setObitText(e.target.value)}
                  placeholder="Type or paste the obituary here."
                />
              </div>
              <div className="word-count-bar">
                <div className="word-count-track">
                  <div className="word-count-fill" style={{ width: `${wordPct}%`, background: wordBarColor }} />
                </div>
              </div>
              <div className="obitwriter-shortcut">
                <span className="word-stats">{words} words &nbsp;·&nbsp; {obitText.length} characters</span>
                <button
                  type="button"
                  className="obitwriter-btn"
                  onClick={() => setObitWriterNote(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    <path d="M5 3v4" />
                    <path d="M19 17v4" />
                    <path d="M3 5h4" />
                    <path d="M17 19h4" />
                  </svg>
                  Draft with ObitWriter AI instead →
                  <InfoIcon note="Prototype only: ObitWriter AI drafting assistant is not wired up in this build." />
                </button>
              </div>
            </div>

            {error && (
              <div className="deadline-warn" style={{ background: "#fdecea", color: "#7d2b24", border: "1px solid #f5c6c2" }}>
                ⚠️ {error}
              </div>
            )}

            {/* ─── How would you like to proceed? ─── */}
            <div className="form-card" style={{ marginTop: "1rem" }}>
              <h2 style={{ marginBottom: 0 }}>How would you like to proceed?</h2>
              <hr className="card-divider" />

              <button
                type="button"
                onClick={() => {
                  const v = validateStep2();
                  if (v) { setError(v); return; }
                  setError(null);
                  setStep(3);
                }}
                style={{
                  fontFamily: "'Open Sans',sans-serif",
                  width: "100%",
                  height: 52,
                  background: "#1a8fd1",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  marginBottom: 12,
                }}
              >
                Review &amp; Pay →
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 1, background: "#e4e8ed" }} />
                <span style={{ fontSize: 11, color: "#bbb", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "#e4e8ed" }} />
              </div>

              <button
                type="button"
                onClick={() => void addToCart()}
                disabled={submitting}
                style={{
                  fontFamily: "'Open Sans',sans-serif",
                  width: "100%",
                  height: 44,
                  background: "#fff",
                  color: "#555",
                  border: "1.5px solid #d1d5db",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="21" r="1" />
                  <circle cx="19" cy="21" r="1" />
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                </svg>
                Add to cart — pay for multiple obituaries at once
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: "1.5rem" }}>
              <button type="button" className="btn-draft" onClick={() => { setError(null); setStep(1); }}>
                ← Back
              </button>
              <button
                type="button"
                className="btn-draft"
                onClick={() => void saveAsDraft()}
                disabled={submitting}
              >
                {submitting ? "Saving…" : "Save as Draft"}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-screen active">
            <div className="form-card">
              <h2>Review &amp; Payment</h2>
              <p className="card-subtitle">Confirm your order and choose how to pay.</p>
              <hr className="card-divider" />

              {/* Order summary */}
              <div style={{ background: "#f8f9fb", borderRadius: 10, padding: "14px 18px", marginBottom: "1.25rem" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Order details</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
                  <SummaryRow label="Deceased" value={deceasedFullName || "—"} />
                  <SummaryRow label="Publication" value={newspaper.name} />
                  <SummaryRow label="Date" value={formatPubDate(pubDate)} />
                  <SummaryRow label="Words" value={`${words} words`} />
                  <SummaryRow label="Estimated price" value={<span><strong style={{ color: "#1a8fd1" }}>~${estimatedPrice.toFixed(2)}</strong> <span style={{ fontSize: 12, color: "#aaa", fontWeight: 400 }}>(confirmed on format)</span></span>} />
                  {newspaper.billingPartner && (
                    <SummaryRow label="Service fee to publisher" value={<span style={{ color: "#15803d", fontWeight: 700 }}>{newspaper.feePercent}% (~${partnerFeeUsd.toFixed(2)})</span>} />
                  )}
                  <SummaryRow label="Loyalty points" value={<span style={{ color: "#b45309", fontWeight: 700 }}>+30 pts</span>} />
                </div>
              </div>

              {/* Payment method */}
              <div style={{ fontSize: 13, fontWeight: 700, color: "#444", marginBottom: 10 }}>Payment method</div>
              <div className="payment-options">
                <div
                  className={`payment-opt ${payChoice === "account" ? "selected" : ""}`}
                  onClick={() => setPayChoice("account")}
                >
                  <div className="pay-radio" />
                  <div style={{ flex: 1 }}>
                    <div className="pay-label">
                      Add to monthly invoice
                      <span className="pay-badge">Recommended</span>
                    </div>
                    <div className="pay-desc" style={{ marginBottom: 10 }}>Added to your running monthly statement and auto-charged on the 1st of next month.</div>
                    <div style={{ background: "#f8f9fb", border: "1px solid #e4e8ed", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ background: "#1a1a1a", color: "#fff", borderRadius: 4, fontSize: 10, fontWeight: 700, padding: "3px 7px" }}>VISA</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>•••• •••• •••• 4242</div>
                        <div style={{ fontSize: 11, color: "#888" }}>Exp 08/28 · Card on file</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#2e7d32", background: "#e8f5e9", borderRadius: 4, padding: "3px 8px" }}>Auto next month</span>
                    </div>
                  </div>
                </div>

                <div
                  className={`payment-opt ${payChoice === "card" ? "selected" : ""}`}
                  onClick={() => setPayChoice("card")}
                >
                  <div className="pay-radio" />
                  <div style={{ flex: 1 }}>
                    <div className="pay-label">Pay now by card</div>
                    <div className="pay-desc" style={{ marginBottom: 10 }}>Charge immediately to your card on file or a new one.</div>
                    {!newCardOpen ? (
                      <div style={{ background: "#f8f9fb", border: "1px solid #e4e8ed", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ background: "#1a1a1a", color: "#fff", borderRadius: 4, fontSize: 10, fontWeight: 700, padding: "3px 7px" }}>VISA</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>•••• •••• •••• 4242</div>
                          <div style={{ fontSize: 11, color: "#888" }}>Exp 08/28 · Card on file</div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setNewCardOpen(true); }}
                          style={{ fontSize: 12, fontWeight: 600, color: "#666", background: "#fff", border: "1px solid #dde2e8", borderRadius: 5, padding: "4px 10px", cursor: "pointer" }}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="stripe-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="stripe-header">
                          <span className="stripe-lock">stripe</span>
                          <span>Secure payment powered by Stripe</span>
                          <button
                            type="button"
                            onClick={() => setNewCardOpen(false)}
                            style={{ marginLeft: "auto", fontSize: 11, color: "#888", background: "none", border: "none", cursor: "pointer" }}
                          >
                            Use card on file
                          </button>
                        </div>
                        <div className="card-input-row"><div className="card-input-mock">Card number</div></div>
                        <div className="card-input-row cols-2"><div className="card-input-mock">MM / YY</div><div className="card-input-mock">CVC</div></div>
                        <div className="card-input-row"><div className="card-input-mock">Name on card</div></div>
                        <div className="card-brands">
                          <div className="card-brand">VISA</div>
                          <div className="card-brand">MC</div>
                          <div className="card-brand">AMEX</div>
                          <div className="card-brand">DISC</div>
                        </div>
                        <div style={{ marginTop: 14, borderTop: "1px solid #e4e8ed", paddingTop: 14 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#aaa", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>Or pay with</div>
                          <div className="digital-wallets">
                            <button type="button" className="wallet-btn apple" onClick={(e) => e.stopPropagation()}>Apple Pay</button>
                            <button type="button" className="wallet-btn google" onClick={(e) => e.stopPropagation()}>
                              <span style={{ fontWeight: 700, color: "#4285f4" }}>G</span>
                              <span style={{ fontWeight: 700, color: "#ea4335" }}>o</span>
                              <span style={{ fontWeight: 700, color: "#fbbc04" }}>o</span>
                              <span style={{ fontWeight: 700, color: "#34a853" }}>g</span>
                              <span style={{ fontWeight: 700, color: "#4285f4" }}>l</span>
                              <span style={{ fontWeight: 700, color: "#ea4335" }}>e</span> Pay
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Partner billing notice (only visible for billing partners) */}
              {newspaper.billingPartner && (
                <div style={{ marginTop: 16, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 30, height: 30, background: "#16a34a", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#15803d", marginBottom: 3 }}>Newspaper billing partner</div>
                    <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.6 }}>
                      <strong>{newspaper.name}</strong> is a billing partner. Legacy collects a {newspaper.feePercent}% service fee (~${partnerFeeUsd.toFixed(2)}) from the publisher — it's invoiced separately on the Service Fees tab.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="deadline-warn" style={{ background: "#fdecea", color: "#7d2b24", border: "1px solid #f5c6c2" }}>
                ⚠️ {error}
              </div>
            )}

            <div className="cta-row" style={{ marginTop: "1.5rem" }}>
              <button type="button" className="btn-draft" onClick={() => setStep(2)}>Back</button>
              <button type="button" className="btn-continue" onClick={submit} disabled={submitting}>
                {submitting ? "Placing order…" : "Place Order →"}
              </button>
            </div>
          </div>
        )}

        {step === 4 && confirmation && (
          <div className="step-screen active">
            {/* Hero success */}
            <div style={{ textAlign: "center", padding: "2.25rem 1rem 1.75rem", color: "#fff" }}>
              <div style={{ width: 64, height: 64, background: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.35)", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="m9 11 3 3L22 4" />
                </svg>
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Order placed</h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
                Submitted to <strong style={{ color: "#fff" }}>{newspaper.name}</strong> for <strong style={{ color: "#fff" }}>{formatPubDate(pubDate)}</strong>
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "5px 14px", marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                Ref: <strong style={{ color: "#fff", letterSpacing: "0.04em" }}>{confirmation.ref}</strong>
              </div>
            </div>

            {/* White container */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e4e8ed", overflow: "hidden", marginBottom: "1rem" }}>
              {/* Loyalty banner */}
              <div style={{ background: "linear-gradient(135deg,#1a8fd1 0%,#0a4a8a 100%)", padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
                <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: "50%", width: 72, height: 72, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid rgba(255,255,255,0.3)" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1 }}>+{confirmation.pointsEarned}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>points</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>You earned {confirmation.pointsEarned} loyalty points!</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
                    Visit the Loyalty tab for your latest balance and redemption options.
                  </div>
                </div>
              </div>

              {/* What happens next */}
              <div style={{ padding: "20px 24px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#aaa", marginBottom: 16 }}>What happens next</div>

                <NextStep
                  badge="✓"
                  badgeColor="#2e7d32"
                  badgeBg="#e8f5e9"
                  title={`Submitted to ${newspaper.name}`}
                  desc={deadlineText ? `Edits accepted until ${deadlineText.deadline}. After that, copy is locked for print.` : "Your listing has been received."}
                />
                <NextStep
                  badge={pubDate ? pubDate.slice(5, 7) + "/" + pubDate.slice(8, 10) : "—"}
                  badgeColor="#1a5f8a"
                  badgeBg="#e8f4fb"
                  title={`Published ${formatPubDate(pubDate)}`}
                  desc={`Print and online at legacy.com. Confirmation sent to ${FH_EMAIL}.`}
                />
                <NextStep
                  badge={payChoice === "account" ? "1st" : "$"}
                  badgeColor="#8a6200"
                  badgeBg="#fff8e1"
                  title={payChoice === "account"
                    ? `~$${estimatedPrice.toFixed(2)} added to next monthly invoice`
                    : `Invoice for ~$${estimatedPrice.toFixed(2)} created`}
                  desc={payChoice === "account"
                    ? `No action needed. Auto-charged to Visa •••• 4242 on the 1st of next month.`
                    : `A Stripe hosted invoice page is available — view it from the Invoices tab.`}
                  last
                />
              </div>

              {/* Action buttons */}
              <div style={{ padding: "0 24px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <button type="button" className="btn-done-secondary" onClick={onClose}>Back to Dashboard</button>
                <button
                  type="button"
                  className="btn-done-primary"
                  onClick={() => {
                    setStep(1);
                    setPubSelected(false);
                    setFirstName(""); setMiddleName(""); setLastName("");
                    setDob(""); setDod(""); setObitText("");
                    setConfirmation(null);
                  }}
                >
                  Place another obituary
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {pubFinderOpen && (
        <PubFinderModal
          current={newspaperName}
          onSelect={(name) => { setNewspaperName(name); setPubSelected(true); setPubFinderOpen(false); setError(null); }}
          onClose={() => setPubFinderOpen(false)}
        />
      )}

      {obitWriterNote && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2100, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setObitWriterNote(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: 14, maxWidth: 440, margin: "2rem", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: "linear-gradient(135deg,#1d4ed8 0%,#1e3a8a 100%)", padding: "16px 22px", color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 700 }}>ObitWriter AI</span>
              <button
                type="button"
                onClick={() => setObitWriterNote(false)}
                style={{ marginLeft: "auto", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "50%", width: 28, height: 28, fontSize: 13, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 20, fontSize: 14, color: "#333", lineHeight: 1.6 }}>
              ObitWriter AI isn't wired up in this prototype. In the full product, clicking this would open a guided drafting assistant that produces a respectful obituary from a few biographical prompts.
            </div>
            <div style={{ padding: "0 20px 20px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setObitWriterNote(false)}
                style={{ fontFamily: "'Open Sans',sans-serif", fontSize: 14, fontWeight: 700, color: "#fff", background: "#1d4ed8", border: "none", borderRadius: 8, padding: "10px 22px", cursor: "pointer" }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepDot({ num, label, current }: { num: number; label: string; current: number }) {
  const state = current === num ? "current" : current > num ? "done" : "pending";
  const labelMuted = current < num;
  return (
    <div className="step">
      <div className={`step-circle ${state === "done" ? "done" : state === "current" ? "current" : "pending"}`}>
        {state === "done" ? "✓" : num}
      </div>
      <div className={`step-label ${labelMuted ? "muted" : ""}`}>{label}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <span style={{ color: "#888" }}>{label}</span>
      <span style={{ color: "#1a1a1a", fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function NextStep({ badge, badgeColor, badgeBg, title, desc, last }: { badge: string; badgeColor: string; badgeBg: string; title: string; desc: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: last ? "none" : "1px solid #f0f3f7" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: badgeBg, border: `2px solid ${badgeColor}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: badgeColor, flexShrink: 0 }}>
        {badge}
      </div>
      <div style={{ paddingTop: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Change Publication modal — State → City → Publication cascading
// ─────────────────────────────────────────────────────────────
function PubFinderModal({ current, onSelect, onClose }: { current: string; onSelect: (name: string) => void; onClose: () => void }) {
  const initial = NEWSPAPERS.find((n) => n.name === current) ?? NEWSPAPERS[0];
  const [stateCode, setStateCode] = useState(initial.state);
  const [cityKey, setCityKey] = useState(initial.cityKey);
  const [pubName, setPubName] = useState(initial.name);
  const [addToFavs, setAddToFavs] = useState(false);

  const states = useMemo(() => {
    const s = new Map<string, string>();
    NEWSPAPERS.forEach((n) => s.set(n.state, n.stateName));
    return Array.from(s.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, []);

  const cities = useMemo(() => {
    const s = new Map<string, string>();
    NEWSPAPERS.filter((n) => n.state === stateCode).forEach((n) => s.set(n.cityKey, n.city));
    return Array.from(s.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [stateCode]);

  const publications = useMemo(
    () => NEWSPAPERS.filter((n) => n.state === stateCode && n.cityKey === cityKey),
    [stateCode, cityKey],
  );

  useEffect(() => {
    // Reset city when state changes unless still valid
    if (!cities.some(([k]) => k === cityKey)) {
      setCityKey(cities[0]?.[0] ?? "");
    }
  }, [cities, cityKey]);

  useEffect(() => {
    if (!publications.some((p) => p.name === pubName)) {
      setPubName(publications[0]?.name ?? "");
    }
  }, [publications, pubName]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 540, margin: "2rem", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ background: "#1a8fd1", padding: "16px 22px", display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Find a Publication</span>
          <button type="button" onClick={onClose} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "50%", width: 30, height: 30, fontSize: 14, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "22px 24px 16px" }}>
          <p style={{ fontSize: 13, color: "#555", marginBottom: "1.25rem", lineHeight: 1.55 }}>
            Select a publication to get started. You can save it to your favourites list by checking <strong>Add to Favourites</strong>.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 14, fontWeight: 600, color: "#444", display: "block", marginBottom: 6 }}>State</label>
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                style={selectStyle}
              >
                {states.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 600, color: "#444", display: "block", marginBottom: 6 }}>City</label>
              <select
                value={cityKey}
                onChange={(e) => setCityKey(e.target.value)}
                style={selectStyle}
              >
                {cities.map(([key, city]) => (
                  <option key={key} value={key}>{city}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 14, fontWeight: 600, color: "#444", display: "block", marginBottom: 4 }}>
                Publication <span style={{ fontSize: 12, fontWeight: 400, color: "#aaa" }}>(type to search or select from list)</span>
              </label>
              <select
                value={pubName}
                onChange={(e) => setPubName(e.target.value)}
                style={selectStyle}
              >
                {publications.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.city}, {p.state}){p.billingPartner ? " — Billing partner" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
              <input
                type="checkbox"
                id="add-to-favs"
                checked={addToFavs}
                onChange={(e) => setAddToFavs(e.target.checked)}
                style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#1a8fd1" }}
              />
              <label htmlFor="add-to-favs" style={{ fontSize: 13, color: "#444", cursor: "pointer" }}>
                Add to Favourites
                <span style={{ marginLeft: 8, verticalAlign: "middle", display: "inline-flex" }}>
                  <InfoIcon note="Prototype only: favourites aren't persisted in this build." />
                </span>
              </label>
            </div>
          </div>
        </div>
        <div style={{ padding: "12px 24px 20px", display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #f0f3f7" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ fontFamily: "'Open Sans',sans-serif", fontSize: 14, fontWeight: 600, color: "#888", background: "#fff", border: "1.5px solid #dde2e8", borderRadius: 8, padding: "12px 22px", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => pubName && onSelect(pubName)}
            disabled={!pubName}
            style={{ fontFamily: "'Open Sans',sans-serif", fontSize: 14, fontWeight: 700, color: "#fff", background: pubName ? "#1a8fd1" : "#ccc", border: "none", borderRadius: 8, padding: "12px 28px", cursor: pubName ? "pointer" : "not-allowed" }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  fontFamily: "'Open Sans', sans-serif",
  fontSize: 14,
  color: "#1a1a1a",
  background: "#f5f7f9",
  border: "1.5px solid #e0e4e8",
  borderRadius: 8,
  padding: "12px 14px",
  width: "100%",
  outline: "none",
  minHeight: 52,
  cursor: "pointer",
};

function parseLooseDate(s: string): Date | null {
  if (!s.trim()) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (iso) {
    const d = new Date(iso + "T12:00:00");
    return isNaN(d.getTime()) ? null : d;
  }
  if (us) {
    const d = new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2]));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatPubDate(iso: string): string {
  if (!iso) return "Pending";
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d.getTime())) return "Pending";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

const DEADLINES: Record<string, string> = {
  Monday: "Today at 4:00 PM ET",
  Tuesday: "Monday at 4:00 PM ET",
  Wednesday: "Tuesday at 4:00 PM ET",
  Thursday: "Wednesday at 4:00 PM ET",
  Friday: "Thursday at 4:00 PM ET",
  Saturday: "Friday at 4:00 PM ET",
  Sunday: "Friday at 2:00 PM ET",
};

function deadlineFor(iso: string): { label: string; deadline: string } | null {
  if (!iso) return null;
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
  const short = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const deadline = DEADLINES[dayName] ?? "Check with publication";
  return { label: short, deadline };
}
