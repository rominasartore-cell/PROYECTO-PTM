type PaymentResultPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PaymentResultPage({ searchParams }: PaymentResultPageProps) {
  const params = await searchParams;
  const mpResult = getString(params.mp_result);
  const status = getString(params.status) ?? getString(params.collection_status);
  const paymentId = getString(params.payment_id) ?? getString(params.collection_id);
  const externalReference = getString(params.external_reference);

  const title =
    mpResult === "success" || status === "approved"
      ? "Pago recibido"
      : mpResult === "pending" || status === "pending"
        ? "Pago pendiente"
        : mpResult === "failure" || status === "rejected"
          ? "Pago no aprobado"
          : "Resultado del pago";

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <section className="rounded-2xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Mercado Pago</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">{title}</h1>
        <p className="mt-4 text-slate-700">
          Estamos verificando el estado del pago en el backend. Si el pago fue aprobado, recibirás la confirmación y los documentos según el flujo configurado.
        </p>

        <dl className="mt-6 space-y-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          {status ? (
            <div className="flex justify-between gap-4">
              <dt className="font-medium">Estado informado</dt>
              <dd>{status}</dd>
            </div>
          ) : null}
          {paymentId ? (
            <div className="flex justify-between gap-4">
              <dt className="font-medium">Payment ID</dt>
              <dd>{paymentId}</dd>
            </div>
          ) : null}
          {externalReference ? (
            <div className="flex justify-between gap-4">
              <dt className="font-medium">Referencia</dt>
              <dd className="break-all text-right">{externalReference}</dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-6 text-sm text-slate-500">
          Revisa también spam/promociones si esperas un correo de confirmación.
        </p>
      </section>
    </main>
  );
}
