import { useEffect, useState } from "react";
import { formatCurrency } from "./shared.js";
import { openPaymentPopup } from "./paymentPopup.js";

export interface CartItem {
  invoiceId: string;
  friendlyId: string;
  deceasedName: string;
  newspaper: string;
  amountUsd: number;
  hostedInvoiceUrl: string | null;
  billingPartner: boolean;
}

interface Props {
  open: boolean;
  items: CartItem[];
  onClose: () => void;
  onRemove: (invoiceId: string) => void;
  onClear: () => void;
  onAllPaid: () => Promise<void> | void;
  onPopupBlocked?: () => void;
}

export function CartDrawer({ open, items, onClose, onRemove, onClear, onAllPaid, onPopupBlocked }: Props) {
  const [payIndex, setPayIndex] = useState<number | null>(null);
  const paying = payIndex !== null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !paying) onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, paying]);

  async function payAll() {
    let blockedAny = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.hostedInvoiceUrl) continue;
      setPayIndex(i);
      const result = await openPaymentPopup(item.hostedInvoiceUrl);
      if (result.blocked) blockedAny = true;
    }
    setPayIndex(null);
    if (blockedAny && onPopupBlocked) onPopupBlocked();
    await onAllPaid();
  }

  const total = items.reduce((s, i) => s + i.amountUsd, 0);
  const partnerCount = items.filter((i) => i.billingPartner).length;
  const nonPartnerCount = items.length - partnerCount;

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 1800,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s",
        }}
        onClick={onClose}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: open ? 0 : -460,
          width: 440,
          maxWidth: "90vw",
          height: "100vh",
          background: "#fff",
          zIndex: 1900,
          boxShadow: "-10px 0 30px rgba(0,0,0,0.12)",
          transition: "right 0.25s ease",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ background: "linear-gradient(135deg, #1a8fd1 0%, #0a4a8a 100%)", color: "#fff", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>🛒 Pay invoices together</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
              {items.length} item{items.length !== 1 ? "s" : ""}
              {partnerCount > 0 && `  ·  ${partnerCount} billing partner`}
              {nonPartnerCount > 0 && `  ·  ${nonPartnerCount} other`}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "50%", width: 32, height: 32, fontSize: 16, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          {items.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🛒</div>
              Your cart is empty. Go to the Invoices tab and click <strong>+ Cart</strong> next to an unpaid invoice to group payments.
            </div>
          ) : (
            items.map((i) => (
              <div key={i.invoiceId} style={{ border: "1px solid #e4e8ed", borderRadius: 10, padding: "12px 14px", marginBottom: 10, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{i.friendlyId}</div>
                    <div style={{ fontSize: 14, color: "#1a1a1a", marginTop: 2 }}>{i.deceasedName}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{i.newspaper}</div>
                    {i.billingPartner && (
                      <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, color: "#15803d", background: "#dcfce7", borderRadius: 10, padding: "2px 8px", marginTop: 4 }}>
                        Billing partner
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>{formatCurrency(i.amountUsd)}</div>
                    <button type="button" onClick={() => onRemove(i.invoiceId)} style={{ background: "none", border: "none", color: "#c0392b", fontSize: 11, cursor: "pointer", marginTop: 6, fontWeight: 600 }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div style={{ borderTop: "1px solid #e4e8ed", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: "#555" }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: "#1a8fd1" }}>{formatCurrency(total)}</span>
            </div>
            <button
              type="button"
              onClick={() => void payAll()}
              disabled={paying}
              style={{
                width: "100%",
                fontFamily: "'Open Sans', sans-serif",
                background: paying ? "#888" : "#1a8fd1",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "14px",
                fontSize: 15,
                fontWeight: 700,
                cursor: paying ? "wait" : "pointer",
                marginBottom: 8,
              }}
            >
              {paying
                ? `Paying ${payIndex! + 1} of ${items.length}…`
                : `Pay all ${items.length} invoice${items.length !== 1 ? "s" : ""} →`}
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={paying}
              style={{ width: "100%", background: "#fff", color: paying ? "#ccc" : "#888", border: "1.5px solid #e4e8ed", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 600, cursor: paying ? "not-allowed" : "pointer" }}
            >
              Clear cart
            </button>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 10, textAlign: "center", lineHeight: 1.5 }}>
              Each invoice opens in a Stripe payment popup. Close the popup after paying — the list auto-updates.
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
