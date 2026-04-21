import { useEffect, useState } from "react";
import { createListing } from "./api.js";

interface Props {
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}

const NEWSPAPERS = [
  { name: "Hartford Courant", rate: 85 },
  { name: "New Haven Register", rate: 72 },
  { name: "Connecticut Post", rate: 68 },
];

export function NewObituaryModal({ onClose, onCreated }: Props) {
  const [deceasedName, setDeceasedName] = useState("");
  const [newspaper, setNewspaper] = useState(NEWSPAPERS[0].name);
  const [publicationDate, setPublicationDate] = useState("");
  const [amount, setAmount] = useState("125");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number.parseFloat(amount);
    if (!deceasedName.trim()) { setError("Please enter the deceased's name."); return; }
    if (!Number.isFinite(amt) || amt <= 0) { setError("Amount must be greater than 0."); return; }

    setSubmitting(true);
    try {
      await createListing({
        deceasedName: deceasedName.trim(),
        newspapers: [newspaper],
        publicationDate: publicationDate || null,
        amountUsd: amt,
      });
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="obit-form-overlay"
      style={{ display: "block", position: "fixed", inset: 0, zIndex: 2000, overflowY: "auto" }}
      onClick={onClose}
    >
      <div className="page" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <h1 className="page-title">New Obituary</h1>

        <form className="form-card" onSubmit={submit}>
          <div className="card-header-row">
            <h2>Obituary details</h2>
            <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
          <div className="card-subtitle">Creates a Stripe invoice for the funeral home and awards loyalty points.</div>
          <hr className="card-divider" />

          <div className="form-row cols-1">
            <div className="field">
              <label>Deceased's name <span className="req">*</span></label>
              <input
                type="text"
                value={deceasedName}
                onChange={(e) => setDeceasedName(e.target.value)}
                placeholder="e.g. Margaret L. Thompson"
                autoFocus
              />
            </div>
          </div>

          <div className="form-row cols-2">
            <div className="field">
              <label>Newspaper <span className="req">*</span></label>
              <select
                value={newspaper}
                onChange={(e) => setNewspaper(e.target.value)}
                style={{ fontFamily: "'Open Sans',sans-serif", fontSize: 14, color: "#1a1a1a", background: "#f5f7f9", border: "1.5px solid #e0e4e8", borderRadius: 8, padding: "12px 14px", outline: "none", minHeight: 52 }}
              >
                {NEWSPAPERS.map((n) => (
                  <option key={n.name} value={n.name}>{n.name} — from ${n.rate}/col. in.</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Publication date</label>
              <input
                type="date"
                value={publicationDate}
                onChange={(e) => setPublicationDate(e.target.value)}
              />
              <div className="field-hint">Leave blank to keep as pending.</div>
            </div>
          </div>

          <div className="form-row cols-2">
            <div className="field">
              <label>Invoice amount (USD) <span className="req">*</span></label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Loyalty points earned</label>
              <input type="text" value="+30 pts" readOnly className="prefilled" />
            </div>
          </div>

          {error && (
            <div className="deadline-warn" style={{ display: "flex", background: "#fdecea", color: "#7d2b24", border: "1px solid #f5c6c2" }}>
              ⚠️ {error}
            </div>
          )}

          <div className="cta-row" style={{ marginTop: 16 }}>
            <button type="button" className="btn-draft" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn-continue" disabled={submitting}>
              {submitting ? "Creating invoice…" : "Submit & create invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
