import { useState } from "react";
import type { Listing } from "./api.js";

// Small circled "i" that shows prototype-only notes on hover. Renders at 14px
// in a muted grey so it reads as a UI hint rather than business content.
export function InfoIcon({ note, size = 14 }: { note: string; size?: number }) {
  const [hover, setHover] = useState(false);
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      tabIndex={0}
      aria-label={note}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#e4e8ed",
        color: "#888",
        fontSize: Math.max(9, size - 4),
        fontWeight: 700,
        fontFamily: "'Open Sans', sans-serif",
        cursor: "help",
        flexShrink: 0,
        outline: "none",
      }}
    >
      i
      {hover && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1a1a1a",
            color: "#fff",
            fontSize: 11,
            fontWeight: 500,
            lineHeight: 1.5,
            padding: "6px 10px",
            borderRadius: 6,
            width: 240,
            whiteSpace: "normal",
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 5000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          {note}
        </span>
      )}
    </span>
  );
}

export function formatCurrency(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `$${v.toFixed(2)}`;
}

const STATUS_LABEL: Record<Listing["status"], string> = {
  draft: "Draft",
  pending: "Pending",
  upcoming: "Scheduled",
  published: "Published",
};

export function StatusBadge({ status }: { status: Listing["status"] }) {
  return <span className={`badge ${status}`}>{STATUS_LABEL[status]}</span>;
}

export function InvoiceStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="badge draft">—</span>;
  if (status === "paid") return <span className="badge paid">Paid</span>;
  if (status === "open") return <span className="badge upcoming">Open</span>;
  if (status === "draft") return <span className="badge draft">Draft</span>;
  if (status === "uncollectible") return <span className="badge overdue">Overdue</span>;
  if (status === "void") return <span className="badge draft">Void</span>;
  return <span className="badge draft">{status}</span>;
}
