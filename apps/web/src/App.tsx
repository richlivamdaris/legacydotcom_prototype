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
import { ProfileDrawer } from "./features/profile/ProfileDrawer.js";

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
  const [profileOpen, setProfileOpen] = useState(false);
  const [accountSetupDone, setAccountSetupDone] = useState<boolean>(() => readFlag("legacy-account-setup-done"));
  const [accountOverdue, setAccountOverdue] = useState<boolean>(() => readFlag("legacy-account-overdue"));

  function toggleAdmin() { setAdmin((prev) => saveFlag("legacy-admin", !prev)); }
  function toggleFreeze() { setFreeze((prev) => saveFlag("legacy-freeze", !prev)); }
  function toggleSimulateError() { setSimulateError((prev) => saveFlag("legacy-sim-error", !prev)); }
  function toggleTabMode() { setTabMode((prev) => saveFlag(TAB_MODE_KEY, !prev)); }

  function toggleOverdue() {
    setAccountOverdue((prev) => {
      const next = saveFlag("legacy-account-overdue", !prev);
      if (next) setTab("invoices");
      return next;
    });
  }

  function payOverdueAndUnlock() {
    setAccountOverdue(saveFlag("legacy-account-overdue", false));
  }

  function handleNewObit() {
    if (accountOverdue) {
      setPopup({
        tone: "error",
        title: "Account restricted — payment overdue",
        body: "New obituary submissions are paused until your outstanding balance is settled. Clear the overdue invoice (INV-2026-02 · $980.00) to reactivate your account.",
      });
      return;
    }
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
      {/* Solid blue nav — brand left, controls right. Insight AI + admin
          toggles live in the floating stack at bottom-right. */}
      <nav style={{ background: "#1a8fd1", height: 72, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1 }}>
              app<span style={{ color: "rgba(255,255,255,0.6)" }}>.</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", paddingLeft: 10, borderLeft: "1px solid rgba(255,255,255,0.25)" }}>
              powered by Obituaries.com
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
              onClick={() => setProfileOpen(true)}
              style={{ position: "relative", width: 38, height: 38, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none", padding: 0, flexShrink: 0 }}
              title={accountSetupDone ? "View profile & settings" : "View profile — account setup needed"}
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
            <button type="button" className={`tab-btn ${tab === "invoices" ? "active" : ""}`} onClick={() => setTab("invoices")}>
              Invoices
              {accountOverdue && (
                <span
                  aria-label="Account overdue"
                  style={{ display: "inline-block", width: 7, height: 7, background: "#ef4444", borderRadius: "50%", marginLeft: 6, verticalAlign: "middle", flexShrink: 0 }}
                />
              )}
            </button>
            <button type="button" className={`tab-btn ${tab === "listings" ? "active" : ""}`} onClick={() => setTab("listings")}>Listings</button>
            <button type="button" className={`tab-btn ${tab === "loyalty" ? "active" : ""}`} onClick={() => setTab("loyalty")}>Loyalty</button>
            {admin && (
              <button type="button" className={`tab-btn ${tab === "service-fees" ? "active" : ""}`} onClick={() => setTab("service-fees")}>Service Fees</button>
            )}
          </div>
          <button
            type="button"
            onClick={handleNewObit}
            title={accountOverdue ? "Account restricted — clear overdue invoice first" : ""}
            style={{
              height: 42,
              background: "#1a8fd1",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "0 22px",
              fontSize: 14,
              fontWeight: 700,
              cursor: accountOverdue ? "not-allowed" : "pointer",
              fontFamily: "'Open Sans', sans-serif",
              whiteSpace: "nowrap",
              transition: "background 0.15s, opacity 0.15s",
              opacity: accountOverdue ? 0.45 : 1,
            }}
          >
            + New Obituary
          </button>
        </div>
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
                accountOverdue={accountOverdue}
                onPayOverdue={payOverdueAndUnlock}
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

      {profileOpen && (
        <ProfileDrawer
          onClose={() => setProfileOpen(false)}
          onNewAccount={() => setCreateAccountOpen(true)}
          setupNeeded={!accountSetupDone}
        />
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

      {/* Floating demo-control stack — anchored bottom-right, never scrolls.
          Right-aligned + content-sized so buttons hug the right edge and
          only extend leftward as far as their label needs. Order top→bottom:
          Toggle overdue, (admin-only) Freeze + Pay Error, Legacy.com Admin,
          Insight AI (amdaris.com link, bottom). */}
      <div
        style={{
          position: "fixed", bottom: 16, right: 16, zIndex: 2147483646,
          display: "flex", flexDirection: "column", gap: 6,
          alignItems: "stretch", pointerEvents: "auto",
        }}
      >
        {/* Toggle Overdue */}
        <StackBtn
          onClick={toggleOverdue}
          active={accountOverdue}
          activeColor="#ef4444"
          activeHover="#c0392b"
          title={accountOverdue ? "Overdue simulation is ON — click to turn off" : "Simulate an overdue account (demo control)"}
          icon={(
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          )}
        >
          {accountOverdue ? "Overdue: ON" : "Toggle overdue"}
        </StackBtn>

        {/* Open-in-tab mode (Stripe invoice / onboarding window) */}
        <StackBtn
          onClick={toggleTabMode}
          active={tabMode}
          activeColor="#16a34a"
          activeHover="#15803d"
          activeBg="#dcfce7"
          title={tabMode
            ? "Stripe invoices open in a new tab — click to switch to popup window"
            : "Stripe invoices open in a popup window — click to switch to new tab"}
          icon={<span style={{ fontSize: 11, lineHeight: 1 }}>{tabMode ? "⇱" : "⧉"}</span>}
        >
          {tabMode ? "Open in: Tab" : "Open in: Popup"}
        </StackBtn>

        {/* Admin-only: Freeze */}
        {admin && (
          <StackBtn
            onClick={toggleFreeze}
            active={freeze}
            activeColor="#c0392b"
            activeHover="#a93226"
            activeBg="#fdecea"
            title={freeze ? "Account is frozen — new obituaries blocked" : "Freeze is off"}
            icon={<span style={{ fontSize: 11 }}>❄</span>}
          >
            {freeze ? "Freeze: ON" : "Freeze: off"}
          </StackBtn>
        )}

        {/* Admin-only: Pay Error */}
        {admin && (
          <StackBtn
            onClick={toggleSimulateError}
            active={simulateError}
            activeColor="#b45309"
            activeHover="#92400e"
            activeBg="#fef3c7"
            title={simulateError ? "Payments will fail (simulated)" : "Simulate payment error off"}
            icon={<span style={{ fontSize: 11 }}>⚠</span>}
          >
            {simulateError ? "Pay Error: ON" : "Pay Error: off"}
          </StackBtn>
        )}

        {/* Admin */}
        <StackBtn
          onClick={toggleAdmin}
          active={admin}
          activeColor="#16a34a"
          activeHover="#15803d"
          activeBg="#dcfce7"
          title={admin ? "Admin mode is ON — click to turn off" : "Admin mode is OFF — click to turn on"}
          icon={<span style={{ fontSize: 10, lineHeight: 1 }}>{admin ? "●" : "○"}</span>}
        >
          Admin
        </StackBtn>

        {/* Insight AI — links to amdaris.com. Kept at the bottom of the stack. */}
        <a
          href="https://www.amdaris.com"
          target="_blank"
          rel="noopener noreferrer"
          title="Insight AI — visit amdaris.com"
          style={{
            textDecoration: "none",
            fontFamily: "'Open Sans', sans-serif", fontSize: 11, fontWeight: 600,
            background: "#fff", border: "1.5px solid #dde2e8",
            borderRadius: 8, padding: "5px 10px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            display: "flex", alignItems: "center", gap: 6,
            cursor: "pointer",
            transition: "border-color 0.15s",
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = "#aaa"; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = "#dde2e8"; }}
        >
          <span style={{ display: "flex", alignItems: "baseline", fontWeight: 800, fontSize: 13, letterSpacing: "-0.3px", lineHeight: 1 }}>
            <span style={{ color: "#1a1a1a" }}>Insight</span>
            <span
              style={{
                marginLeft: 2,
                background: "linear-gradient(90deg, #6f5cff 0%, #c64bd6 60%, #ff5fa0 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              AI
            </span>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 1, transform: "translateY(-4px)" }} aria-hidden="true">
              <defs>
                <linearGradient id="iai-spark-stack" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#6f5cff" />
                  <stop offset="60%" stopColor="#c64bd6" />
                  <stop offset="100%" stopColor="#ff5fa0" />
                </linearGradient>
              </defs>
              <path d="M12 2 L13.6 8.4 L20 10 L13.6 11.6 L12 18 L10.4 11.6 L4 10 L10.4 8.4 Z" fill="url(#iai-spark-stack)" />
            </svg>
          </span>
          <span
            style={{
              fontSize: 9, fontWeight: 700, color: "#6f5cff",
              background: "#f2eeff", border: "1px solid #ddd5ff",
              borderRadius: 999, padding: "1px 6px", lineHeight: 1.2,
              letterSpacing: "0.02em",
            }}
          >
            v1.2
          </span>
        </a>
      </div>

      {popup && (
        <div
          className="redeem-overlay open"
          onClick={(e) => { if (e.target === e.currentTarget) setPopup(null); }}
        >
          <div className="redeem-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div
              className="redeem-modal-header dark"
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

// Shared styling for the bottom-right floating demo-control stack. Each
// button is a white pill with grey border when idle, flipping to a
// coloured accent when active (red / amber / green). Never scrolls —
// the parent container is position: fixed.
function StackBtn({
  onClick, active, activeColor, activeHover, activeBg,
  title, icon, children,
}: {
  onClick: () => void;
  active: boolean;
  activeColor: string;
  activeHover: string;
  activeBg?: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        fontFamily: "'Open Sans', sans-serif", fontSize: 11, fontWeight: 600,
        background: active ? (activeBg ?? "#fff") : "#fff",
        border: `1.5px solid ${active ? activeColor : "#dde2e8"}`,
        borderRadius: 8, padding: "5px 10px", cursor: "pointer",
        color: active ? activeColor : "#888",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 6,
        whiteSpace: "nowrap",
        transition: "border-color 0.15s, color 0.15s, background 0.15s",
      }}
      onMouseOver={(e) => { e.currentTarget.style.borderColor = active ? activeHover : "#aaa"; }}
      onMouseOut={(e) => { e.currentTarget.style.borderColor = active ? activeColor : "#dde2e8"; }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 11, flexShrink: 0 }}>
        {icon}
      </span>
      <span>{children}</span>
    </button>
  );
}
