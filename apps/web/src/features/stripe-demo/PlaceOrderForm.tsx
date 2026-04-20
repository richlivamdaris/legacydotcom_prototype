import { useMemo, useState } from "react";
import type { CreateInvoiceResult } from "./api.js";
import { createInvoice } from "./api.js";

const NEWSPAPERS = [
  { id: "plain-dealer", name: "Cleveland Plain Dealer", price: 95 },
  { id: "columbus-dispatch", name: "Columbus Dispatch", price: 85 },
  { id: "cincinnati-enquirer", name: "Cincinnati Enquirer", price: 75 },
  { id: "akron-beacon", name: "Akron Beacon Journal", price: 60 },
];

interface Props {
  onCreated: (result: CreateInvoiceResult) => void;
}

export function PlaceOrderForm({ onCreated }: Props) {
  const [funeralHomeName, setFuneralHomeName] = useState("Diane's Funeral Home");
  const [funeralHomeEmail, setFuneralHomeEmail] = useState(
    "diane@dianesfuneralhome.test"
  );
  const [deceasedName, setDeceasedName] = useState("Robert Hayes");
  const [selected, setSelected] = useState<string[]>(["plain-dealer"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPapers = useMemo(
    () => NEWSPAPERS.filter((p) => selected.includes(p.id)),
    [selected]
  );

  const totalUsd = useMemo(
    () => selectedPapers.reduce((sum, p) => sum + p.price, 0),
    [selectedPapers]
  );

  const pointsEarned = Math.round(totalUsd * 0.5);

  function toggleNewspaper(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedPapers.length === 0) {
      setError("Select at least one newspaper.");
      return;
    }
    if (!deceasedName.trim()) {
      setError("Enter the deceased's name.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createInvoice({
        funeralHomeEmail,
        funeralHomeName,
        deceasedName,
        newspapers: selectedPapers.map((p) => p.name),
        amountUsd: totalUsd,
      });
      onCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Place obituary order</h2>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label htmlFor="home-name">Funeral home</label>
        <input
          id="home-name"
          value={funeralHomeName}
          onChange={(e) => setFuneralHomeName(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="home-email">Billing email</label>
        <input
          id="home-email"
          type="email"
          value={funeralHomeEmail}
          onChange={(e) => setFuneralHomeEmail(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="deceased">Deceased name</label>
        <input
          id="deceased"
          value={deceasedName}
          onChange={(e) => setDeceasedName(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label>Newspapers</label>
        <div className="checkboxes">
          {NEWSPAPERS.map((p) => (
            <label key={p.id}>
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={() => toggleNewspaper(p.id)}
              />
              {p.name} · ${p.price}
            </label>
          ))}
        </div>
      </div>

      <div className="summary-row">
        <span>Loyalty points earned</span>
        <span>{pointsEarned.toLocaleString()} pts</span>
      </div>
      <div className="summary-row total">
        <span>Total</span>
        <span>${totalUsd.toFixed(2)}</span>
      </div>

      <button type="submit" disabled={submitting} style={{ marginTop: 12 }}>
        {submitting ? "Creating invoice…" : "Create Stripe invoice"}
      </button>
    </form>
  );
}
