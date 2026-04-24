// Opens a Stripe hosted-invoice URL. Two modes:
//
// - Popup mode: opens in a sized child window and resolves when the user
//   closes it. By that point Stripe has already delivered the webhook,
//   so the caller can refresh immediately.
//
// - Tab mode: `window.open(url, "_blank", "noopener,noreferrer")` can't be
//   tracked (noopener severs the handle), so we instead wait for this tab
//   to lose and regain focus (Page Visibility API). When the user finishes
//   paying in the new tab and comes back to us, `visibilitychange` fires,
//   we wait a brief moment for the webhook to land, then resolve.
//
// Falls back to a tab when the popup is blocked; in that case `blocked`
// is true so the caller can show a hint to click Refresh.

export const TAB_MODE_KEY = "legacy-open-as-tab";

export interface PopupResult {
  closed: boolean;
  blocked: boolean;
}

// Tab mode defaults to ON — only "0" disables it. A missing or unrecognised
// value still resolves to tab mode so the demo works out-of-the-box without
// the user having to flip the toggle.
export function tabModeEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(TAB_MODE_KEY) !== "0";
}

// Resolves the next time the user is viewing this tab again. If the tab
// is already visible at the point we're called (user never switched), we
// fall back to a short timer so callers that don't rely on focus return
// don't hang forever. `maxWaitMs` caps the wait so we always resolve.
function waitForTabReturn(maxWaitMs = 10 * 60 * 1000): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      document.removeEventListener("visibilitychange", onChange);
      window.removeEventListener("focus", onFocus);
      window.clearTimeout(fallback);
      // Give Stripe's webhook a beat to hit our backend before the caller refreshes.
      window.setTimeout(resolve, 400);
    };
    const onChange = () => { if (document.visibilityState === "visible") done(); };
    const onFocus = () => done();

    document.addEventListener("visibilitychange", onChange);
    window.addEventListener("focus", onFocus);
    const fallback = window.setTimeout(done, maxWaitMs);
  });
}

export async function openPaymentPopup(url: string): Promise<PopupResult> {
  if (tabModeEnabled()) {
    window.open(url, "_blank", "noopener,noreferrer");
    // Wait for the user to return to our tab before resolving, so the
    // caller's refresh sees the paid state set by the webhook.
    await waitForTabReturn();
    return { closed: false, blocked: false };
  }

  const features = "width=820,height=760,menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes";
  const win = window.open(url, "legacy-stripe-payment", features);

  if (!win || win.closed) {
    // Popup blocked — open as a regular new tab and tell the caller it was blocked
    window.open(url, "_blank", "noopener,noreferrer");
    await waitForTabReturn();
    return { closed: false, blocked: true };
  }

  return new Promise<PopupResult>((resolve) => {
    const id = window.setInterval(() => {
      if (win.closed) {
        window.clearInterval(id);
        resolve({ closed: true, blocked: false });
      }
    }, 600);
  });
}
