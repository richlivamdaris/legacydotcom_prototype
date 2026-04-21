import { useState, useMemo } from "react";
import type { Listing } from "./api.js";
import { StatusBadge, formatCurrency } from "./shared.js";

interface Props {
  listings: Listing[];
  onNew: () => void;
}

type Filter = "all" | "published" | "pending" | "upcoming" | "draft";

export function ListingsTab({ listings, onNew }: Props) {
  const [statusFilter, setStatusFilter] = useState<Filter>("all");
  const [newspaperFilter, setNewspaperFilter] = useState("all");
  const [search, setSearch] = useState("");

  const newspapers = useMemo(() => {
    const s = new Set<string>();
    listings.forEach((l) => l.newspaper && l.newspaper !== "—" && s.add(l.newspaper));
    return Array.from(s).sort();
  }, [listings]);

  const filtered = listings.filter((l) => {
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    const matchesPaper = newspaperFilter === "all" || l.newspaper === newspaperFilter;
    const matchesSearch = !search || l.deceasedName.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesPaper && matchesSearch;
  });

  const filters: Array<{ v: Filter; label: string }> = [
    { v: "all", label: "All" },
    { v: "published", label: "Published" },
    { v: "pending", label: "Pending" },
    { v: "upcoming", label: "Scheduled" },
    { v: "draft", label: "Draft" },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">All listings</div>
        <span className="card-action" onClick={onNew}>+ New Obituary →</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 0 16px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 280 }}>
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#aaa", pointerEvents: "none" }}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            style={{ fontFamily: "'Open Sans',sans-serif", fontSize: 13, color: "#1a1a1a", background: "#f5f7f9", border: "1.5px solid #e0e4e8", borderRadius: 7, padding: "7px 12px 7px 34px", width: "100%", outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", gap: 4, background: "#f5f7f9", borderRadius: 8, padding: 4 }}>
          {filters.map((f) => (
            <button
              key={f.v}
              className={`filter-pill ${statusFilter === f.v ? "active" : ""}`}
              onClick={() => setStatusFilter(f.v)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={newspaperFilter}
          onChange={(e) => setNewspaperFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All newspapers</option>
          {newspapers.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <table className="listing-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Newspaper</th>
            <th>Publication date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Submitted</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr><td colSpan={7} className="empty">No listings match the selected filters.</td></tr>
          )}
          {filtered.map((l) => (
            <tr key={l.id}>
              <td style={{ fontWeight: 600 }}>{l.deceasedName}</td>
              <td>{l.newspaper}</td>
              <td>{l.publicationDate ?? "—"}</td>
              <td>
                <span className={`inv-amount ${l.status === "published" ? "green" : ""}`}>
                  {formatCurrency(l.amountUsd)}
                </span>
              </td>
              <td><StatusBadge status={l.status} /></td>
              <td style={{ color: "#888" }}>{l.submittedAt}</td>
              <td>
                {l.invoiceHostedUrl ? (
                  <a className="btn-view" href={l.invoiceHostedUrl} target="_blank" rel="noreferrer">View invoice</a>
                ) : (
                  <button className="btn-view">View</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
