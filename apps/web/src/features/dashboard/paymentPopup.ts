// Opens a Stripe hosted-invoice URL. By default uses a popup window so the
// caller can wait for it to close (the Stripe webhook has already updated
// the backend by then). When the user has set "open as tab" mode in the
// nav, opens in a regular new tab and resolves immediately — the caller
// then has to refresh manually.
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

export function openPaymentPopup(url: string): Promise<PopupResult> {
  if (tabModeEnabled()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return Promise.resolve({ closed: false, blocked: false });
  }


  const features = "width=820,height=760,menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes";
  const win = window.open(url, "legacy-stripe-payment", features);

  if (!win || win.closed) {
    // Popup blocked — open as a regular new tab and tell the caller it was blocked
    window.open(url, "_blank", "noopener,noreferrer");
    return Promise.resolve({ closed: false, blocked: true });
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
