import Link from "next/link";
import PublicSiteHeader from "@/components/ptm/PublicSiteHeader";
import PurchaseEmailNotice from "@/components/ptm/PurchaseEmailNotice";
import { getStoredPayment } from "@/lib/storage/payment-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
    params: Promise<{
        requestId: string;
    }>;
    searchParams?: Promise<{
        mock?: string;
        status?: string;
        email?: string;
        correo?: string;
    }>;
};

type PaymentStatus = "approved" | "pending" | "rejected";

function normalizeStatus(status?: string): PaymentStatus {
    const value = String(status ?? "").trim().toLowerCase();

    if (value === "approved" || value === "success") return "approved";
    if (
        value === "pending" ||
        value === "in_process" ||
        value === "created" ||
        value === "unknown"
    ) {
        return "pending";
    }

    if (
        value === "rejected" ||
        value === "failure" ||
        value === "failed" ||
        value === "cancelled" ||
        value === "canceled" ||
        value === "refunded" ||
        value === "charged_back"
    ) {
        return "rejected";
    }

    return "pending";
}

function decodeValue(value?: string) {
    if (!value) return "";

    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function getStatusCopy(status: PaymentStatus) {
    if (status === "pending") {
        return {
            badge: "Pago pendiente",
            title: "Tu pago esta siendo revisado",
            subtitle:
                "Cuando Mercado Pago confirme la transaccion, prepararemos tu informe, borradores de escritos y guia de tramitacion personal.",
            cardTitle: "Solicitud recibida correctamente",
            cardText:
                "Guardamos tu solicitud y estamos esperando la confirmacion del pago para iniciar la preparacion de tus documentos.",
            alert:
                "El pago figura como pendiente. Si ya pagaste correctamente, espera la confirmacion o contacta soporte indicando tu numero de solicitud.",
        };
    }

    if (status === "rejected") {
        return {
            badge: "Pago no aprobado",
            title: "No pudimos confirmar el pago",
            subtitle:
                "La operacion no figura como aprobada. Puedes volver a intentar el pago o contactar soporte si crees que se trata de un error.",
            cardTitle: "Producto aun no activado",
            cardText:
                "Para preparar tus documentos necesitamos que el pago quede aprobado por Mercado Pago.",
            alert:
                "El estado del pago no figura como aprobado. Si pagaste correctamente, revisa tu correo o contacta soporte.",
        };
    }

    return {
        badge: "Compra confirmada",
        title: "Tu compra ha sido procesada con exito",
        subtitle:
            "Dentro de las proximas 24 horas recibiras tu informe, borradores de escritos y guia de tramitacion personal en el correo electronico asociado a tu compra.",
        cardTitle: "Producto solicitado correctamente",
        cardText:
            "Estamos preparando tus documentos para enviarlos al correo asociado a la compra.",
        alert: "",
    };
}

export default async function ResultadosPage({ params, searchParams }: PageProps) {
    const resolvedParams = await params;
    const resolvedSearchParams = searchParams ? await searchParams : {};

    const requestId = resolvedParams.requestId;
    const storedPayment = await getStoredPayment(requestId);

    const urlStatus = normalizeStatus(resolvedSearchParams.status);
    const storedStatus = storedPayment ? normalizeStatus(storedPayment.status) : null;
    const status = storedStatus ?? urlStatus;

    const isMock = resolvedSearchParams.mock === "true" || Boolean(storedPayment?.mock);
    const copy = getStatusCopy(status);

    const customerEmail =
        storedPayment?.customerEmail ||
        storedPayment?.payerEmail ||
        decodeValue(resolvedSearchParams.email ?? resolvedSearchParams.correo);

    return (
        <>
            <PublicSiteHeader />

            <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
                <section className="mx-auto w-full max-w-7xl px-4 pb-8 pt-12 sm:px-6 lg:px-8">
                    <div className="max-w-5xl">
                        <div className="mb-4 inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-widest text-emerald-700 shadow-sm">
                            {copy.badge}
                        </div>

                        <h1 className="text-5xl font-black leading-none tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                            {copy.title}
                        </h1>

                        <p className="mt-6 max-w-5xl text-left text-lg font-semibold leading-8 text-slate-600 sm:text-xl">
                            {copy.subtitle}
                        </p>

                        <div className="mt-6 flex flex-wrap gap-2 text-xs font-black text-slate-600">
                            <span className="rounded-full bg-white px-3 py-2 shadow-sm">
                                {status === "approved" ? "Pago confirmado" : "Pago no confirmado"}
                            </span>
                            <span className="rounded-full bg-white px-3 py-2 shadow-sm">
                                {status === "approved" ? "Producto en preparacion" : "Esperando confirmacion"}
                            </span>
                            <span className="rounded-full bg-white px-3 py-2 shadow-sm">
                                Entrega por correo
                            </span>

                            {isMock ? (
                                <span className="rounded-full bg-amber-50 px-3 py-2 text-amber-700 shadow-sm">
                                    Modo prueba
                                </span>
                            ) : null}

                            {storedPayment ? (
                                <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-700 shadow-sm">
                                    Estado verificado
                                </span>
                            ) : (
                                <span className="rounded-full bg-amber-50 px-3 py-2 text-amber-700 shadow-sm">
                                    Estado no verificado
                                </span>
                            )}
                        </div>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/10">
                        <div className="bg-gradient-to-br from-emerald-600 via-cyan-700 to-blue-700 px-7 py-9 text-white sm:px-10">
                            <p className="mb-6 text-sm font-black tracking-[0.18em] text-white/90">
                                RESULTADO DE LA COMPRA
                            </p>

                            <h2 className="max-w-4xl text-4xl font-black leading-tight sm:text-5xl">
                                {copy.cardTitle}
                            </h2>

                            <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-white/90 sm:text-xl">
                                {copy.cardText}
                            </p>
                        </div>

                        <div className="space-y-5 p-6 sm:p-8">
                            <PurchaseEmailNotice
                                requestId={requestId}
                                initialEmail={customerEmail}
                            />

                            <section className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                                    <p className="text-sm font-black text-blue-700">
                                        INCLUIDO
                                    </p>
                                    <h3 className="mt-3 text-lg font-black text-slate-950">
                                        Informe completo
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        Analisis del certificado y estado de las multas revisadas.
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                                    <p className="text-sm font-black text-emerald-700">
                                        INCLUIDO
                                    </p>
                                    <h3 className="mt-3 text-lg font-black text-slate-950">
                                        Borradores de escritos
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        Formato editable para solicitar la prescripcion personalmente.
                                    </p>
                                </div>

                                <div className="rounded-3xl border border-cyan-100 bg-cyan-50 p-5">
                                    <p className="text-sm font-black text-cyan-700">
                                        INCLUIDO
                                    </p>
                                    <h3 className="mt-3 text-lg font-black text-slate-950">
                                        Guia paso a paso
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        Instrucciones simples para realizar la tramitacion personal.
                                    </p>
                                </div>
                            </section>

                            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                                <h3 className="text-lg font-black text-amber-900">
                                    Importante
                                </h3>

                                <p className="mt-2 text-sm font-semibold leading-6 text-amber-900/80">
                                    Si no recibes el correo dentro del plazo indicado, revisa primero tu carpeta de spam, promociones o correo no deseado.
                                </p>
                            </section>

                            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                <h3 className="text-lg font-black text-slate-950">
                                    Soporte de entrega
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    Si despues de revisar spam no encuentras el correo, contactanos indicando tu numero de solicitud:
                                </p>

                                <p className="mt-3 break-all rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm">
                                    {requestId}
                                </p>
                            </section>

                            {copy.alert ? (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                                    {copy.alert}
                                </div>
                            ) : null}

                            {!storedPayment ? (
                                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                                    No encontramos un registro interno de pago para esta solicitud. Si pagaste correctamente, contacta soporte indicando tu numero de solicitud.
                                </div>
                            ) : null}

                            <div className="grid gap-3 sm:grid-cols-2">
                                <Link
                                    href="/"
                                    className="rounded-2xl border border-blue-200 bg-white px-5 py-4 text-center text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50"
                                >
                                    Volver al inicio
                                </Link>

                                <Link
                                    href="/#analizar"
                                    className="rounded-2xl bg-blue-600 px-5 py-4 text-center text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                                >
                                    Analizar otro certificado
                                </Link>
                            </div>

                            <p className="text-center text-xs leading-5 text-slate-500">
                                Producto informativo y referencial. No constituye patrocinio, representacion judicial ni garantia de resultado ante el Tribunal.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}
