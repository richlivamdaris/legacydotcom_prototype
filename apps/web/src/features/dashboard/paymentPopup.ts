// Opens a Stripe hosted-invoice URL in a popup window, resolves when the
// popup closes. The Stripe webhook has already updated the backend by then,
// so the caller can refresh state from the API and see the new status.
//
// Falls back to opening in a new tab when the popup is blocked; in that
// case the promise resolves immediately and the caller should show a hint
// to click Refresh manually.

export interface PopupResult {
  closed: boolean;
  blocked: boolean;
}

export function openPaymentPopup(url: string): Promise<PopupResult> {
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
