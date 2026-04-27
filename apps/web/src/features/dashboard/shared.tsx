import { useEffect, useRef, useState } from "react";
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

// Shared filter primitives — used by InvoicesTab and ListingsTab so both
// filter rows share the same visual language (search pill + dropdown pills
// separated by thin dividers).

export function FilterDivider() {
  return <div style={{ width: 1, height: 24, background: "#e5e7eb", flexShrink: 0 }} />;
}

export function FilterSearch({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ position: "relative", minWidth: 200, maxWidth: 240 }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "inline-flex", pointerEvents: "none" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          fontFamily: "'Open Sans', sans-serif", fontSize: 13, fontWeight: 600,
          color: "#555", background: "#f3f4f6",
          border: "1.5px solid transparent", borderRadius: 8,
          padding: "0 12px 0 34px", height: 40, width: "100%",
          outline: "none", transition: "border-color 0.15s, background 0.15s",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#1a8fd1"; e.currentTarget.style.background = "#fff"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "#f3f4f6"; }}
      />
    </div>
  );
}

export interface DropdownOption {
  value: string;
  label: string;
  danger?: boolean;
}

export function PillDropdown({ value, prefix, label, options, onChange }: {
  value: string;
  prefix: string;
  label: string;
  options: DropdownOption[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          fontFamily: "'Open Sans', sans-serif", fontSize: 13, fontWeight: 600,
          background: "#f3f4f6", border: "none", borderRadius: 8,
          padding: "0 14px", height: 40, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 5,
          color: "#555", transition: "background 0.15s",
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = "#e9eaec"; }}
        onMouseOut={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
      >
        <span>{prefix}: {label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          background: "#fff", border: "1.5px solid #e5e7eb",
          borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          minWidth: 150, zIndex: 200, overflow: "hidden",
          maxHeight: 280, overflowY: "auto",
        }}>
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  width: "100%", textAlign: "left",
                  padding: "9px 14px", fontSize: 13, fontWeight: 600,
                  background: active ? "#f3f4f6" : "none",
                  border: "none", cursor: "pointer",
                  fontFamily: "'Open Sans', sans-serif",
                  color: opt.danger ? "#dc2626" : "#555",
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = opt.danger ? "#fef2f2" : "#f3f4f6"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = active ? "#f3f4f6" : "none"; }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
