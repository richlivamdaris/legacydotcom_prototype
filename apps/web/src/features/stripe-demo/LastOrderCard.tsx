import type { CreateInvoiceResult } from "./api.js";

interface Props {
  result: CreateInvoiceResult;
}

export function LastOrderCard({ result }: Props) {
  return (
    <div className="alert alert-success" style={{ marginBottom: 20 }}>
      <div>
        <strong>Invoice created.</strong> Status: {result.status ?? "unknown"} ·
        Amount due ${result.amountDueUsd.toFixed(2)} · {result.invoiceId}
      </div>
      {result.hostedInvoiceUrl && (
        <a
          className="cta"
          href={result.hostedInvoiceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open hosted invoice →
        </a>
      )}
      <div style={{ fontSize: 12, marginTop: 8, opacity: 0.85 }}>
        Pay with test card <code>4242 4242 4242 4242</code>, any future expiry,
        any CVC. Watch the backend console for webhook events.
      </div>
    </div>
  );
}
