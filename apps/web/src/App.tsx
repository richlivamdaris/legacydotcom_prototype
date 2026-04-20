import { useState } from "react";
import { PlaceOrderForm } from "./features/stripe-demo/PlaceOrderForm.js";
import { InvoiceList } from "./features/stripe-demo/InvoiceList.js";
import { LastOrderCard } from "./features/stripe-demo/LastOrderCard.js";
import type { CreateInvoiceResult } from "./features/stripe-demo/api.js";

export function App() {
  const [lastResult, setLastResult] = useState<CreateInvoiceResult | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  function handleCreated(result: CreateInvoiceResult) {
    setLastResult(result);
    setRefreshToken((n) => n + 1);
  }

  return (
    <div className="app">
      <header>
        <h1>Memoriams Portal</h1>
        <span className="tag">Stripe demo — test mode</span>
      </header>

      {lastResult && <LastOrderCard result={lastResult} />}

      <div className="grid">
        <PlaceOrderForm onCreated={handleCreated} />
        <InvoiceList refreshToken={refreshToken} />
      </div>
    </div>
  );
}
