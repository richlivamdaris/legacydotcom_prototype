import { useCallback, useEffect, useState } from "react";
import type { InvoiceRow, Listing, LoyaltyState } from "./features/dashboard/api.js";
import {
  fetchInvoices,
  fetchListings,
  fetchLoyalty,
  syncListings,
} from "./features/dashboard/api.js";
import { OverviewTab } from "./features/dashboard/OverviewTab.js";
import { InvoicesTab } from "./features/dashboard/InvoicesTab.js";
import { ListingsTab } from "./features/dashboard/ListingsTab.js";
import { LoyaltyTab } from "./features/dashboard/LoyaltyTab.js";
import { NewObituaryModal } from "./features/dashboard/NewObituaryModal.js";
import { RedeemModal } from "./features/dashboard/RedeemModal.js";

type TabName = "overview" | "invoices" | "listings" | "loyalty";

export function App() {
  const [tab, setTab] = useState<TabName>("overview");
  const [listings, setListings] = useState<Listing[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newObitOpen, setNewObitOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemDefaults, setRedeemDefaults] = useState<{ amount: number; pts: number } | null>(null);
  const [admin, setAdmin] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("legacy-admin") === "1";
  });

  function toggleAdmin() {
    setAdmin((prev) => {
      const next = !prev;
      window.localStorage.setItem("legacy-admin", next ? "1" : "0");
      return next;
    });
  }

  const refreshAll = useCallback(async () => {
    try {
      setError(null);
      const [syncedListings, invs, loy] = await Promise.all([
        syncListings().catch(() => null),
        fetchInvoices(),
        fetchLoyalty(),
      ]);
      if (syncedListings) setListings(syncedListings);
      else setListings(await fetchListings());
      setInvoices(invs);
      setLoyalty(loy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  function openRedeem(amount: number, pts: number) {
    setRedeemDefaults({ amount, pts });
    setRedeemOpen(true);
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <nav className="nav">
        <div style={{ width: 100 }} />
        <div className="nav-brand">
          <div className="logo">app<span>.</span></div>
          <div className="powered">powered by Obituaries.com</div>
        </div>
        <div className="nav-right">
          <span className="nav-fh-name">Greenfield Funeral Home</span>
          <div className="nav-avatar" title="Account">GF</div>
        </div>
      </nav>

      <div className="header-band">
        <div className="header-top">
          <div className="header-greeting">
            <div className="greeting-label">Funeral Home Portal</div>
            <h1>Good morning, Greenfield</h1>
            <div className="header-meta">
              <span>{today}</span>
              <span className="dot" />
              <span>Account #FH-00842</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              className="btn-new-obit"
              onClick={toggleAdmin}
              title={admin ? "Admin mode is ON — click to turn off" : "Admin mode is OFF — click to turn on"}
              style={{
                background: admin ? "rgba(126,232,162,0.25)" : "rgba(255,255,255,0.08)",
                borderColor: admin ? "rgba(126,232,162,0.7)" : "rgba(255,255,255,0.25)",
              }}
            >
              {admin ? "● Admin ON" : "○ Admin"}
            </button>
            <button className="btn-new-obit" onClick={() => setNewObitOpen(true)}>+ New Obituary</button>
          </div>
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>Overview</button>
        <button className={`tab-btn ${tab === "invoices" ? "active" : ""}`} onClick={() => setTab("invoices")}>Invoices</button>
        <button className={`tab-btn ${tab === "listings" ? "active" : ""}`} onClick={() => setTab("listings")}>Listings</button>
        <button className={`tab-btn ${tab === "loyalty" ? "active" : ""}`} onClick={() => setTab("loyalty")}>Loyalty</button>
      </div>

      <div className="content">
        {loading && <div className="empty">Loading…</div>}
        {error && (
          <div className="alert overdue">
            <div className="alert-icon">⚠️</div>
            <div>
              <strong>Could not load dashboard data.</strong><br />
              {error}
              <div className="alert-actions">
                <button className="btn-alert primary" onClick={() => { setLoading(true); void refreshAll(); }}>Retry</button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {tab === "overview" && (
              <OverviewTab
                listings={listings}
                invoices={invoices}
                loyalty={loyalty}
                onGoto={setTab}
              />
            )}
            {tab === "invoices" && <InvoicesTab invoices={invoices} onRefresh={refreshAll} />}
            {tab === "listings" && (
              <ListingsTab
                listings={listings}
                onNew={() => setNewObitOpen(true)}
              />
            )}
            {tab === "loyalty" && loyalty && (
              <LoyaltyTab loyalty={loyalty} admin={admin} onRedeem={openRedeem} />
            )}
          </>
        )}
      </div>

      {newObitOpen && (
        <NewObituaryModal
          onClose={() => setNewObitOpen(false)}
          onCreated={async () => {
            setNewObitOpen(false);
            await refreshAll();
            setTab("listings");
          }}
        />
      )}

      {redeemOpen && loyalty && (
        <RedeemModal
          loyalty={loyalty}
          defaults={redeemDefaults}
          onClose={() => setRedeemOpen(false)}
          onRedeemed={async () => {
            await refreshAll();
          }}
        />
      )}
    </>
  );
}
