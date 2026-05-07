"use client";

import { useState } from "react";

type CheckoutProButtonProps = {
  quoteToken: string;
  label?: string;
  className?: string;
};

export function CheckoutProButton({
  quoteToken,
  label = "Comprar informe y escritos",
  className,
}: CheckoutProButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteToken }),
      });

      const data = await response.json();
      if (!response.ok || !data?.ok || !data?.initPoint) {
        throw new Error(data?.error ?? "No se pudo iniciar el pago");
      }

      window.location.href = data.initPoint;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado al iniciar el pago");
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading || !quoteToken}
        className={
          className ??
          "w-full rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {loading ? "Redirigiendo a Mercado Pago..." : label}
      </button>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
