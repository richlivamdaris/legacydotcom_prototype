import { useCallback, useEffect, useState } from "react";
import type { Listing, LoyaltyState, MonthlyInvoiceRow } from "./features/dashboard/api.js";
import {
  fetchInvoices,
  fetchListings,
  fetchLoyalty,
  syncListings,
} from "./features/dashboard/api.js";
import { OverviewTab } from "./features/dashboard/OverviewTab.js";
import { InvoicesTab } from "./features/dashboard/InvoicesTab.js";
import { ListingsTab, ListingDetailsModal } from "./features/dashboard/ListingsTab.js";
import { LoyaltyTab } from "./features/dashboard/LoyaltyTab.js";
import { ServiceFeesTab } from "./features/dashboard/ServiceFeesTab.js";
import { NewObituaryModal } from "./features/dashboard/NewObituaryModal.js";
import { RedeemModal } from "./features/dashboard/RedeemModal.js";
import { CartDrawer, type CartItem } from "./features/dashboard/CartDrawer.js";
import { TAB_MODE_KEY, tabModeEnabled } from "./features/dashboard/paymentPopup.js";
import { CreateAccountWizard } from "./features/signup/CreateAccountWizard.js";

type TabName = "overview" | "invoices" | "listings" | "loyalty" | "service-fees";

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "1";
}
function saveFlag(key: string, value: boolean): boolean {
  window.localStorage.setItem(key, value ? "1" : "0");
  return value;
}

export function App() {
  const [tab, setTab] = useState<TabName>("overview");
  const [listings, setListings] = useState<Listing[]>([]);
  const [invoices, setInvoices] = useState<MonthlyInvoiceRow[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newObitOpen, setNewObitOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemDefaults, setRedeemDefaults] = useState<{ amount: number; pts: number } | null>(null);
  const [admin, setAdmin] = useState<boolean>(() => readFlag("legacy-admin"));
  const [freeze, setFreeze] = useState<boolean>(() => readFlag("legacy-freeze"));
  const [simulateError, setSimulateError] = useState<boolean>(() => readFlag("legacy-sim-error"));
  const [tabMode, setTabMode] = useState<boolean>(() => tabModeEnabled());
  const [popup, setPopup] = useState<{ title: string; body: string; tone: "warn" | "error" | "info" } | null>(null);

  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [openListing, setOpenListing] = useState<Listing | null>(null);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [accountSetupDone, setAccountSetupDone] = useState<boolean>(() => readFlag("legacy-account-setup-done"));

  function toggleAdmin() { setAdmin((prev) => saveFlag("legacy-admin", !prev)); }
  function toggleFreeze() { setFreeze((prev) => saveFlag("legacy-freeze", !prev)); }
  function toggleSimulateError() { setSimulateError((prev) => saveFlag("legacy-sim-error", !prev)); }
  function toggleTabMode() { setTabMode((prev) => saveFlag(TAB_MODE_KEY, !prev)); }

  function handleNewObit() {
    if (freeze) {
      setPopup({
        tone: "warn",
        title: "Account temporarily suspended",
        body: "Your account is temporarily suspended due to outstanding invoices older than 5 days. Please settle these invoices to reactivate your account.",
      });
      return;
    }
    setNewObitOpen(true);
  }

  function handlePayError() {
    setPopup({
      tone: "error",
      title: "Payment could not be processed",
      body: "We were unable to process the payment for this invoice. The card issuer declined the transaction (simulated). Please try a different payment method or contact support. The invoice remains unpaid.",
    });
  }

  function removeFromCart(invoiceId: string) {
    setCart((prev) => prev.filter((c) => c.invoiceId !== invoiceId));
  }

  function addListingToCart(listing: Listing) {
    setCart((prev) => {
      if (prev.some((c) => c.invoiceId === listing.id)) return prev;
      return [
        ...prev,
        {
          invoiceId: listing.id,
          friendlyId: listing.friendlyInvoiceId,
          deceasedName: listing.deceasedName,
          newspaper: listing.newspaper,
          amountUsd: listing.amountUsd,
          hostedInvoiceUrl: null,
          billingPartner: listing.billingPartner,
        },
      ];
    });
    setCartOpen(true);
  }

  async function onCartAllPaid() {
    if (simulateError) { handlePayError(); return; }
    await refreshAll();
  }

  function onPopupBlocked() {
    setPopup({
      tone: "warn",
      title: "Popup blocked",
      body: "Your browser blocked the payment popup. The invoice opened in a new tab instead.",
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

  useEffect(() => {
    if (!admin && tab === "service-fees") setTab("overview");
  }, [admin, tab]);

  function openRedeem(amount: number, pts: number) {
    setRedeemDefaults({ amount, pts });
    setRedeemOpen(true);
  }

  const cartCount = cart.length;

  return (
    <>
      {/* Solid blue nav — brand left, Insight AI logo center, cart + admin + avatar right */}
      <nav style={{ background: "#1a8fd1", height: 72, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", height: "100%", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifySelf: "start" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1 }}>
              app<span style={{ color: "rgba(255,255,255,0.6)" }}>.</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", paddingLeft: 10, borderLeft: "1px solid rgba(255,255,255,0.25)" }}>
              powered by Obituaries.com
            </div>
          </div>

          <div style={{ justifySelf: "center", display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 22, padding: "6px 14px 6px 16px", boxShadow: "0 2px 10px rgba(0,0,0,0.12)" }}>
            <div style={{ display: "flex", alignItems: "baseline", fontFamily: "'Open Sans', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px", lineHeight: 1 }}>
              <span style={{ color: "#1a1a1a" }}>Insight</span>
              <span
                style={{
                  marginLeft: 4,
                  background: "linear-gradient(90deg, #6f5cff 0%, #c64bd6 60%, #ff5fa0 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                AI
              </span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 3, transform: "translateY(-7px)" }} aria-hidden="true">
                <defs>
                  <linearGradient id="iai-spark" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#6f5cff" />
                    <stop offset="60%" stopColor="#c64bd6" />
                    <stop offset="100%" stopColor="#ff5fa0" />
                  </linearGradient>
                </defs>
                <path d="M12 2 L13.6 8.4 L20 10 L13.6 11.6 L12 18 L10.4 11.6 L4 10 L10.4 8.4 Z" fill="url(#iai-spark)" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#6f5cff",
                background: "#f2eeff",
                border: "1px solid #ddd5ff",
                borderRadius: 999,
                padding: "2px 8px",
                lineHeight: 1.2,
                letterSpacing: "0.02em",
              }}
            >
              v1.0
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, justifySelf: "end" }}>
            <button
              type="button"
              onClick={toggleTabMode}
              title={tabMode ? "Stripe invoices open in a new tab — click to switch to popup window" : "Stripe invoices open in a popup window — click to switch to new tab"}
              style={{
                background: tabMode ? "rgba(126,232,162,0.28)" : "transparent",
                border: `1px solid ${tabMode ? "rgba(126,232,162,0.7)" : "rgba(255,255,255,0.35)"}`,
                color: "#fff",
                borderRadius: 20,
                padding: "5px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Open Sans', sans-serif",
              }}
            >
              {tabMode ? "⇱ Open in: Tab" : "⧉ Open in: Popup"}
            </button>
            <button
              type="button"
              onClick={toggleAdmin}
              title={admin ? "Legacy.com Admin mode is ON — click to turn off" : "Legacy.com Admin mode is OFF — click to turn on"}
              style={{
                background: admin ? "rgba(126,232,162,0.28)" : "transparent",
                border: `1px solid ${admin ? "rgba(126,232,162,0.7)" : "rgba(255,255,255,0.35)"}`,
                color: "#fff",
                borderRadius: 20,
                padding: "5px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Open Sans', sans-serif",
              }}
            >
              {admin ? "● Legacy.com Admin" : "○ Legacy.com Admin"}
            </button>
            <button
              type="button"
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.85)", padding: 6, display: "flex" }}
              title="Notifications"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.85)", padding: 6, position: "relative", display: "flex" }}
              title="Cart"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
              {cartCount > 0 && (
                <span style={{ position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, background: "#ef4444", borderRadius: "50%", fontSize: 10, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                  {cartCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setCreateAccountOpen(true)}
              style={{ position: "relative", width: 38, height: 38, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none", padding: 0, flexShrink: 0 }}
              title={accountSetupDone ? "Account setup complete — click to add another account" : "Account setup needed — click to complete"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <rect x="11" y="0" width="2" height="7" rx="1" fill="#1a8fd1" />
                <rect x="8" y="2" width="8" height="2" rx="1" fill="#1a8fd1" />
                <polygon points="2,11 12,5 22,11" fill="#1a8fd1" />
                <rect x="3" y="11" width="18" height="13" rx="1" fill="#1a8fd1" />
                <path d="M9.5 24 L9.5 18.5 C9.5 15.5 14.5 15.5 14.5 18.5 L14.5 24 Z" fill="rgba(10,74,138,0.3)" />
                <rect x="4.5" y="13" width="3.5" height="3.5" rx="0.5" fill="rgba(10,74,138,0.25)" />
                <rect x="16" y="13" width="3.5" height="3.5" rx="0.5" fill="rgba(10,74,138,0.25)" />
              </svg>
              {!accountSetupDone && (
                <span
                  aria-label="Account setup needed"
                  style={{
                    position: "absolute", top: -2, right: -2,
                    minWidth: 14, height: 14, padding: "0 4px",
                    background: "#ef4444", color: "#fff",
                    border: "2px solid #1a8fd1", borderRadius: 999,
                    fontSize: 9, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    lineHeight: 1, fontFamily: "'Open Sans', sans-serif",
                  }}
                >
                  !
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Tab bar — tabs left, + New Obituary right */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e4e8ed", height: 72, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", position: "sticky", top: 72, zIndex: 99 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%" }}>
          <div style={{ display: "flex", gap: 0, height: "100%" }}>
            <button type="button" className={`tab-btn ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>Overview</button>
            <button type="button" className={`tab-btn ${tab === "invoices" ? "active" : ""}`} onClick={() => setTab("invoices")}>Invoices</button>
            <button type="button" className={`tab-btn ${tab === "listings" ? "active" : ""}`} onClick={() => setTab("listings")}>Listings</button>
            <button type="button" className={`tab-btn ${tab === "loyalty" ? "active" : ""}`} onClick={() => setTab("loyalty")}>Loyalty</button>
            {admin && (
              <button type="button" className={`tab-btn ${tab === "service-fees" ? "active" : ""}`} onClick={() => setTab("service-fees")}>Service Fees</button>
            )}
          </div>
          <button
            type="button"
            onClick={handleNewObit}
            style={{
              height: 42,
              background: "#1a8fd1",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "0 22px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Open Sans', sans-serif",
              whiteSpace: "nowrap",
              transition: "background 0.15s",
            }}
          >
            + New Obituary
          </button>
        </div>
      </div>

      {/* Admin toolbar — only shown when admin is on */}
      {admin && (
        <div style={{ background: "#fffbeb", borderBottom: "1px solid #fcd34d", padding: "8px 2rem" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Legacy.com Admin
            </span>
            <button
              type="button"
              onClick={toggleFreeze}
              title={freeze ? "Account is frozen — new obituaries blocked" : "Freeze is off"}
              style={{
                fontFamily: "'Open Sans', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 12px",
                borderRadius: 6,
                border: `1.5px solid ${freeze ? "#c0392b" : "#e0e4e8"}`,
                background: freeze ? "#fdecea" : "#fff",
                color: freeze ? "#c0392b" : "#666",
                cursor: "pointer",
              }}
            >
              {freeze ? "❄ Freeze: ON" : "❄ Freeze: off"}
            </button>
            <button
              type="button"
              onClick={toggleSimulateError}
              title={simulateError ? "Payments will fail (simulated)" : "Simulate payment error off"}
              style={{
                fontFamily: "'Open Sans', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 12px",
                borderRadius: 6,
                border: `1.5px solid ${simulateError ? "#b45309" : "#e0e4e8"}`,
                background: simulateError ? "#fef3c7" : "#fff",
                color: simulateError ? "#b45309" : "#666",
                cursor: "pointer",
              }}
            >
              {simulateError ? "⚠ Pay Error: ON" : "⚠ Pay Error: off"}
            </button>
          </div>
        </div>
      )}

      <div className="content">
        {loading && <div className="empty">Loading…</div>}
        {error && (
          <div className="alert overdue">
            <div className="alert-icon">⚠️</div>
            <div>
              <strong>Could not load dashboard data.</strong><br />
              {error}
              <div className="alert-actions">
                <button type="button" className="btn-alert primary" onClick={() => { setLoading(true); void refreshAll(); }}>Retry</button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {tab === "overview" && (
              <OverviewTab
                listings={listings}
                loyalty={loyalty}
                onGoto={setTab}
                onOpenListing={(l) => {
                  if (l.status === "draft" || l.status === "pending" || l.status === "upcoming") {
                    setEditingListing(l);
                    setNewObitOpen(true);
                  } else {
                    setOpenListing(l);
                  }
                }}
              />
            )}
            {tab === "invoices" && (
              <InvoicesTab
                invoices={invoices}
                onRefresh={refreshAll}
                simulateError={simulateError}
                onPayError={handlePayError}
              />
            )}
            {tab === "listings" && (
              <ListingsTab
                listings={listings}
                onNew={handleNewObit}
                onOpenListing={(l) => {
                  if (l.status === "draft" || l.status === "pending" || l.status === "upcoming") {
                    setEditingListing(l);
                    setNewObitOpen(true);
                  } else {
                    setOpenListing(l);
                  }
                }}
              />
            )}
            {tab === "loyalty" && loyalty && <LoyaltyTab loyalty={loyalty} admin={admin} onRedeem={openRedeem} />}
            {tab === "service-fees" && <ServiceFeesTab />}
          </>
        )}
      </div>

      {newObitOpen && (
        <NewObituaryModal
          editing={editingListing}
          onClose={() => { setNewObitOpen(false); setEditingListing(null); }}
          onCreated={async () => {
            setNewObitOpen(false);
            setEditingListing(null);
            await refreshAll();
            setTab("listings");
          }}
          onAddToCart={addListingToCart}
        />
      )}

      {redeemOpen && loyalty && (
        <RedeemModal
          loyalty={loyalty}
          defaults={redeemDefaults}
          onClose={() => setRedeemOpen(false)}
          onRedeemed={async () => { await refreshAll(); }}
        />
      )}

      <CartDrawer
        open={cartOpen}
        items={cart}
        onClose={() => setCartOpen(false)}
        onRemove={removeFromCart}
        onClear={() => setCart([])}
        onAllPaid={onCartAllPaid}
        onPopupBlocked={onPopupBlocked}
      />

      {openListing && (
        <ListingDetailsModal listing={openListing} onClose={() => setOpenListing(null)} />
      )}

      {createAccountOpen && (
        <CreateAccountWizard
          onClose={() => setCreateAccountOpen(false)}
          onComplete={(d) => {
            console.log("[signup] new account:", d);
            setAccountSetupDone(saveFlag("legacy-account-setup-done", true));
          }}
        />
      )}

      {popup && (
        <div
          className="redeem-overlay open"
          onClick={(e) => { if (e.target === e.currentTarget) setPopup(null); }}
        >
          <div className="redeem-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div
              className="redeem-modal-header"
              style={{
                background:
                  popup.tone === "error" ? "linear-gradient(135deg, #c0392b 0%, #7d2b24 100%)" :
                  popup.tone === "info"  ? "linear-gradient(135deg, #1a8fd1 0%, #0a4a8a 100%)" :
                                            "linear-gradient(135deg, #b45309 0%, #7c2d12 100%)",
              }}
            >
              <h3>
                {popup.tone === "error" ? "⚠️ " : popup.tone === "info" ? "ℹ️ " : "🔒 "}
                {popup.title}
              </h3>
              <button type="button" className="redeem-modal-close" onClick={() => setPopup(null)}>✕</button>
            </div>
            <div className="redeem-body">
              <p style={{ fontSize: 14, color: "#333", lineHeight: 1.6, marginBottom: 20 }}>{popup.body}</p>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setPopup(null)}
                  style={{ fontFamily: "'Open Sans', sans-serif", fontSize: 14, fontWeight: 700, color: "#fff", background: "#1a8fd1", border: "none", borderRadius: 8, padding: "11px 22px", cursor: "pointer" }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
