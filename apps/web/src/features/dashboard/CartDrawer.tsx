import { useEffect } from "react";
import { formatCurrency } from "./shared.js";

export interface CartItem {
  invoiceId: string;
  friendlyId: string;
  deceasedName: string;
  newspaper: string;
  publicationDate: string | null;
  amountUsd: number;
  hostedInvoiceUrl: string | null;
  billingPartner: boolean;
}

interface Props {
  open: boolean;
  items: CartItem[];
  onClose: () => void;
  onRemove: (invoiceId: string) => void;
  onCheckout: () => void;
}

function formatPubDate(iso: string | null): string {
  if (!iso) return "Draft — no date yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function CartDrawer({ open, items, onClose, onRemove, onCheckout }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const count = items.length;
  const total = items.reduce((s, i) => s + i.amountUsd, 0);
  const partnerBilled = 0; // Reserved — billing partners invoice the FH directly outside our cart

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.4)", zIndex: 5000,
          display: open ? "block" : "none",
        }}
      />
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed", top: 0,
          right: open ? 0 : -460,
          width: 440, maxWidth: "100vw", height: "100%",
          background: "#fff", zIndex: 5001,
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          display: "flex", flexDirection: "column",
          transition: "right 0.3s ease",
          fontFamily: "'Open Sans', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{
          background: "#1a8fd1", padding: "0 1.5rem", height: 72,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Obituary Cart</span>
            <span style={{
              background: "rgba(255,255,255,0.2)", borderRadius: 20,
              padding: "2px 10px", fontSize: 12, fontWeight: 700, color: "#fff",
            }}>
              {count} item{count !== 1 ? "s" : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%",
              width: 32, height: 32, color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Items list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
          {count === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#bbb" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px", display: "block" }}>
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#aaa", marginBottom: 6 }}>
                Your cart is empty
              </div>
              <div style={{ fontSize: 13, color: "#ccc" }}>
                Add obituaries to checkout multiple at once
              </div>
            </div>
          ) : (
            items.map((i) => (
              <div key={i.invoiceId} style={{
                background: "#fff", border: "1px solid #e4e8ed", borderRadius: 10,
                padding: "14px 16px", marginBottom: 10,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>
                      {i.deceasedName}
                    </div>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      {i.newspaper} &nbsp;·&nbsp; {formatPubDate(i.publicationDate)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(i.invoiceId)}
                    style={{
                      background: "none", border: "none",
                      cursor: "pointer",
                      color: "#ccc", padding: 2, flexShrink: 0,
                    }}
                    title="Remove"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {i.billingPartner ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d", background: "#dcfce7", borderRadius: 10, padding: "3px 10px" }}>
                      Billing partner
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#1a5f8a", background: "#e8f4fb", borderRadius: 10, padding: "3px 10px" }}>
                      Standard billing
                    </span>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                    {formatCurrency(i.amountUsd)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {count > 0 && (
          <div style={{
            borderTop: "1px solid #e4e8ed", padding: "1.25rem 1.5rem",
            flexShrink: 0, background: "#fff",
          }}>
            {/* Summary */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#888" }}>Obituaries in cart</span>
                <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{count}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#888" }}>Newspaper billed</span>
                <span style={{ fontWeight: 600, color: "#888" }}>{formatCurrency(partnerBilled)}</span>
              </div>
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 13, paddingTop: 8, borderTop: "1px solid #f0f3f7",
              }}>
                <span style={{ fontWeight: 700, color: "#1a1a1a" }}>Due today / this invoice</span>
                <span style={{ fontWeight: 700, color: "#1a8fd1", fontSize: 16 }}>
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            {/* Checkout all — opens the standalone checkout page */}
            <button
              type="button"
              onClick={onCheckout}
              style={{
                width: "100%", height: 48,
                background: "#1a8fd1",
                color: "#fff", border: "none", borderRadius: 10,
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                transition: "background 0.15s", marginBottom: 10,
                fontFamily: "'Open Sans', sans-serif",
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = "#1480be"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "#1a8fd1"; }}
            >
              Checkout all →
            </button>

            {/* Continue adding */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "100%", height: 40,
                background: "#fff", color: "#888",
                border: "1.5px solid #e4e8ed", borderRadius: 10,
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                fontFamily: "'Open Sans', sans-serif",
              }}
            >
              Continue adding
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
