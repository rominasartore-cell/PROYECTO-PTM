"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const ADMIN_TOKEN_KEY = "ptm-admin-token";

type ManagementStatus =
  | "pending_review"
  | "in_progress"
  | "documents_sent"
  | "closed";

type JsonRecord = Record<string, unknown>;

type ApiResponse = {
  ok?: boolean;
  status?: ManagementStatus;
  note?: string;
  updatedAt?: string | null;
  error?: string;
  message?: string;
};

type PaidVerification = {
  loading: boolean;
  approved: boolean;
  source: string;
  status: string;
  paidAt: string;
  amount: number;
  product: string;
  error: string;
};

type EditableDoc = {
  id: string;
  title: string;
  filename: string;
  content: string;
};

const STATUS_OPTIONS: Array<{
  value: ManagementStatus;
  label: string;
  description: string;
}> = [
  {
    value: "pending_review",
    label: "Pendiente de revisión",
    description: "Solicitud creada o pagada, aún no revisada.",
  },
  {
    value: "in_progress",
    label: "En preparación",
    description: "Caso en revisión o documentos en preparación.",
  },
  {
    value: "documents_sent",
    label: "Documentos enviados",
    description: "Informe o documentos ya enviados al cliente.",
  },
  {
    value: "closed",
    label: "Cerrado",
    description: "Gestión terminada.",
  },
];

const INITIAL_PAID: PaidVerification = {
  loading: true,
  approved: false,
  source: "",
  status: "",
  paidAt: "",
  amount: 0,
  product: "",
  error: "",
};

function getRequestIdFromParams(params: ReturnType<typeof useParams>): string {
  const raw = params?.requestId;
  if (Array.isArray(raw)) return raw[0] || "";
  return typeof raw === "string" ? raw : "";
}

function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

function buildAdminHeaders(): HeadersInit {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function pickString(record: JsonRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && value !== "") return String(value);
  }
  return fallback;
}

function pickNumber(record: JsonRecord, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = record[key];
    if (value === null || value === undefined || value === "") continue;

    const normalized =
      typeof value === "string" ? value.replace(/\./g, "").replace(",", ".") : value;

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function isApprovedStatus(value?: string | null): boolean {
  const status = String(value || "").toLowerCase();
  return status === "approved" || status === "paid" || status === "completed";
}

function isPaymentOnlySource(value?: string | null): boolean {
  return String(value || "").toLowerCase() === "payment_only";
}

function formatDate(value?: string | null): string {
  if (!value) return "Sin actualización";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getStatusClasses(status: ManagementStatus): string {
  if (status === "pending_review") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "in_progress") return "border-teal-200 bg-teal-50 text-teal-800";
  if (status === "documents_sent") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-slate-200 bg-slate-100 text-slate-800";
}

function getStatusDot(status: ManagementStatus): string {
  if (status === "pending_review") return "bg-amber-500";
  if (status === "in_progress") return "bg-teal-500";
  if (status === "documents_sent") return "bg-emerald-500";
  return "bg-slate-500";
}

function getStatusLabel(status: ManagementStatus): string {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
}

function getNextStepText(status: ManagementStatus): string {
  if (status === "documents_sent") {
    return "Entrega registrada: los documentos ya figuran como enviados.";
  }

  if (status === "closed") {
    return "Gestión cerrada: no quedan acciones obligatorias pendientes.";
  }

  if (status === "in_progress") {
    return "Siguiente paso: terminar preparación, validar ZIP y enviar documentos listos.";
  }

  return "Siguiente paso: revisar datos del cliente y preparar entrega documental.";
}

function getNoticeClasses(status: ManagementStatus): string {
  if (status === "documents_sent" || status === "closed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (status === "in_progress") {
    return "border-teal-200 bg-teal-50 text-teal-900";
  }

  return "border-amber-200 bg-amber-50 text-amber-900";
}

function safeFilePart(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function buildLocalDeliveryCommand(requestId: string): string {
  const safeRequestId = requestId.replace(/"/g, "");
  const jsonName = `admin-request-${safeRequestId}.json`;

  return [
    '$ErrorActionPreference = "Stop"',
    "",
    '$project = "C:\\Users\\romis\\OneDrive\\Escritorio\\PROYECTO PTM\\prescribe-tu-multa\\prescribe-tu-multa"',
    "Set-Location $project",
    "",
    `$RequestId = "${safeRequestId}"`,
    `$AdminJsonPath = Join-Path $env:USERPROFILE "Downloads\\${jsonName}"`,
    "",
    "if (!(Test-Path $AdminJsonPath)) {",
    '  throw "No existe JSON admin descargado: $AdminJsonPath"',
    "}",
    "",
    "powershell -ExecutionPolicy Bypass -File .\\scripts\\ops\\generate-real-delivery.ps1 `",
    "  -RequestId $RequestId `",
    "  -AdminJsonPath $AdminJsonPath",
  ].join("\n");
}

function buildReviewEditCommand(requestId: string): string {
  const safeRequestId = requestId.replace(/"/g, "");

  return [
    '$ErrorActionPreference = "Stop"',
    "",
    '$project = "C:\\Users\\romis\\OneDrive\\Escritorio\\PROYECTO PTM\\prescribe-tu-multa\\prescribe-tu-multa"',
    "Set-Location $project",
    "",
    `$RequestId = "${safeRequestId}"`,
    '$DeliveryDir = Join-Path $project ("docs\\deliveries\\" + $RequestId)',
    "",
    "if (!(Test-Path $DeliveryDir)) {",
    '  throw "No existe carpeta de entrega. Primero genera documentos con generate-real-delivery.ps1: $DeliveryDir"',
    "}",
    "",
    "$codeCommand = Get-Command code -ErrorAction SilentlyContinue",
    "if ($codeCommand) {",
    "  code $DeliveryDir",
    "} else {",
    "  explorer.exe $DeliveryDir",
    "}",
  ].join("\n");
}

function getDeepArray(record: JsonRecord, paths: string[][]): unknown[] {
  for (const path of paths) {
    let current: unknown = record;

    for (const key of path) {
      current = asRecord(current)[key];
    }

    const values = asArray(current);
    if (values.length > 0) return values;
  }

  return [];
}

function getDeepRecord(record: JsonRecord, paths: string[][]): JsonRecord {
  for (const path of paths) {
    let current: unknown = record;

    for (const key of path) {
      current = asRecord(current)[key];
    }

    const result = asRecord(current);
    if (Object.keys(result).length > 0) return result;
  }

  return {};
}

function normalizeFine(value: unknown, index: number): JsonRecord {
  const fine = asRecord(value);
  return {
    numero: pickString(fine, ["numero", "number", "index"], String(index + 1)),
    rol: pickString(fine, ["rolCausa", "rol", "role", "caseRole"], "Rol no informado"),
    tribunal: pickString(fine, ["tribunal", "court", "juzgado", "courtName"], "Tribunal no informado"),
    comunaTribunal: pickString(fine, ["comunaTribunal", "comuna", "courtCommune"], "Comuna no informada"),
    fechaIngreso: pickString(fine, ["fechaIngresoRmnp", "rmnpDate", "fechaRmnp", "date"], "Fecha no informada"),
    fechaPrescripcion: pickString(fine, ["fechaPrescripcionReferencial", "estimatedPrescriptionDate", "prescriptionDate"], "Fecha referencial no informada"),
    montoUtm: pickString(fine, ["montoMultaUtm", "montoUtm", "amountUtm", "utm", "monto"], "Monto no informado"),
    infraccion: pickString(fine, ["infraccion", "infraction", "description"], "Infracción no informada"),
    estado: pickString(fine, ["estado", "status"], "Estado no informado"),
  };
}

function isPrescribedFine(value: unknown): boolean {
  const fine = asRecord(value);
  const status = pickString(fine, ["estado", "status", "situacion"], "").toLowerCase();

  return (
    status.includes("prescrit") ||
    fine.potencialmentePrescrita === true ||
    fine.isPrescribed === true ||
    fine.prescrita === true
  );
}

function buildFineList(fines: JsonRecord[]): string {
  if (fines.length === 0) return "- No se informaron multas para esta categoría.";

  return fines
    .map((fine, index) => {
      return [
        `### Multa ${index + 1}`,
        "",
        `- Rol: ${fine.rol}`,
        `- Tribunal: ${fine.tribunal}`,
        `- Comuna tribunal: ${fine.comunaTribunal}`,
        `- Fecha ingreso RMNP: ${fine.fechaIngreso}`,
        `- Fecha estimada/referencial: ${fine.fechaPrescripcion}`,
        `- Monto UTM: ${fine.montoUtm}`,
        `- Infracción: ${fine.infraccion}`,
        `- Estado: ${fine.estado}`,
      ].join("\n");
    })
    .join("\n\n");
}

function buildEditableDocs(requestId: string, row: JsonRecord): EditableDoc[] {
  const payment = asRecord(row.payment);
  const clientData =
    asRecord(row.client_data).rut || asRecord(row.clientData).rut
      ? asRecord(row.client_data || row.clientData)
      : getDeepRecord(row, [["data", "client_data"], ["data", "clientData"]]);

  const analysis = getDeepRecord(row, [
    ["analysis"],
    ["raw_analysis_json"],
    ["data", "raw_analysis_json"],
    ["data", "analysis"],
    ["result"],
  ]);

  const merged = {
    ...payment,
    ...analysis,
    ...clientData,
    ...row,
  };

  const name = pickString(
    merged,
    ["customer_name", "customerName", "name", "nombre", "nombreCliente"],
    "Cliente no informado"
  );
  const email = pickString(
    merged,
    ["customer_email", "customerEmail", "email", "correo", "emailCliente"],
    "Correo no informado"
  );
  const plate = pickString(
    merged,
    ["vehicle_plate", "plate", "patente"],
    "Patente no informada"
  );
  const rut = pickString(merged, ["rutSolicitante", "rut"], "RUT no informado");
  const domicilio = pickString(
    merged,
    ["domicilioSolicitante", "domicilio", "address"],
    "Domicilio no informado"
  );
  const comuna = pickString(
    merged,
    ["comunaSolicitante", "comuna", "commune"],
    "Comuna no informada"
  );
  const profession = pickString(
    merged,
    ["profesionOficio", "profesion", "profession"],
    "Profesión u oficio no informado"
  );

  const rawLogs = getDeepArray(row, [
    ["analysis", "logs"],
    ["result", "logs"],
    ["raw_analysis_json", "logs"],
    ["data", "raw_analysis_json", "logs"],
    ["data", "raw_analysis_json", "analysis", "logs"],
    ["data", "raw_analysis_json", "result", "logs"],
  ]);

  const fines = rawLogs.map(normalizeFine);
  const prescribedFines = fines.filter((fine) => isPrescribedFine(fine));
  const nonPrescribedFines = fines.filter((fine) => !isPrescribedFine(fine));

  const totalMultas = pickNumber(
    merged,
    ["totalMultas", "totalFines", "total_multas"],
    fines.length
  );
  const totalPrescritas = pickNumber(
    merged,
    [
      "totalPotencialmentePrescritas",
      "prescribedCount",
      "potentiallyPrescribed",
      "multasPotencialmentePrescritas",
      "multasSusceptibles",
    ],
    prescribedFines.length
  );
  const montoReferencial = pickNumber(
    merged,
    [
      "montoReferencialPrescrito",
      "montoPotencial",
      "montoPotencialPesos",
      "potentialAmount",
      "amount",
    ],
    0
  );

  const today = new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
  }).format(new Date());

  const header = [
    `Request ID: ${requestId}`,
    `Cliente: ${name}`,
    `Correo: ${email}`,
    `Patente: ${plate}`,
    `Fecha edición: ${today}`,
  ].join("\n");

  const informe = [
    "# Informe de análisis de prescripción de multas",
    "",
    header,
    "",
    "## Resumen",
    "",
    `- Total de multas revisadas: ${totalMultas || "No informado"}`,
    `- Multas potencialmente prescritas: ${totalPrescritas || 0}`,
    `- Monto referencial asociado: ${montoReferencial > 0 ? formatMoney(montoReferencial) : "No informado"}`,
    "",
    "## Multas potencialmente prescritas",
    "",
    buildFineList(prescribedFines),
    "",
    "## Multas no prescritas o vigentes",
    "",
    buildFineList(nonPrescribedFines),
    "",
    "## Nota legal",
    "",
    "Este informe es referencial y se basa en los datos visibles en el certificado revisado. No constituye representación judicial ni garantiza que el tribunal declare la prescripción.",
  ].join("\n");

  const instructivo = [
    "# Instructivo de tramitación personal",
    "",
    header,
    "",
    "## Pasos sugeridos",
    "",
    "1. Revisar que los datos personales estén correctos.",
    "2. Revisar que la patente y las multas correspondan al certificado.",
    "3. Presentar la solicitud ante el Juzgado de Policía Local competente.",
    "4. Adjuntar certificado RMNP/RMTNP y documentos de identificación si corresponde.",
    "5. Hacer seguimiento de la resolución del tribunal.",
    "",
    "## Advertencia",
    "",
    "El tribunal puede exigir antecedentes adicionales o rechazar la solicitud según los antecedentes del caso.",
  ].join("\n");

  const solicitudBase = [
    "# Solicitud de prescripción de multa",
    "",
    "S.J.L. DE POLICÍA LOCAL COMPETENTE",
    "",
    `${name}, RUT ${rut}, domiciliado/a en ${domicilio}, comuna de ${comuna}, profesión u oficio ${profession}, correo electrónico ${email}, respecto del vehículo patente ${plate}, a US. respetuosamente digo:`,
    "",
    "Que vengo en solicitar se declare la prescripción de la o las multas individualizadas, de acuerdo con los antecedentes contenidos en el certificado de multas de tránsito no pagadas.",
    "",
    "## Multas incluidas en esta solicitud",
    "",
    buildFineList(prescribedFines),
    "",
    "POR TANTO,",
    "",
    "Solicito a US. tener por presentada esta solicitud y resolver conforme a derecho.",
    "",
    "Firma: ______________________________",
  ].join("\n");

  const checklist = [
    "# Checklist de revisión antes de enviar",
    "",
    header,
    "",
    "- [ ] Datos del cliente revisados.",
    "- [ ] Patente revisada.",
    "- [ ] Total de multas revisado.",
    "- [ ] Multas potencialmente prescritas revisadas.",
    "- [ ] Monto referencial revisado.",
    "- [ ] Solicitud editable revisada.",
    "- [ ] Sin placeholders visibles.",
    "- [ ] ZIP final validado.",
    "- [ ] Auditoría aprobada.",
  ].join("\n");

  return [
    {
      id: "informe",
      title: "Informe",
      filename: `informe-${safeFilePart(requestId)}.md`,
      content: informe,
    },
    {
      id: "solicitud",
      title: "Solicitud",
      filename: `solicitud-prescripcion-${safeFilePart(requestId)}.md`,
      content: solicitudBase,
    },
    {
      id: "instructivo",
      title: "Instructivo",
      filename: `instructivo-${safeFilePart(requestId)}.md`,
      content: instructivo,
    },
    {
      id: "checklist",
      title: "Checklist",
      filename: `checklist-${safeFilePart(requestId)}.md`,
      content: checklist,
    },
  ];
}

export default function RequestManagementStatusCard() {
  const params = useParams();
  const requestId = useMemo(() => getRequestIdFromParams(params), [params]);

  const [status, setStatus] = useState<ManagementStatus>("pending_review");
  const [note, setNote] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [localDeliveryMessage, setLocalDeliveryMessage] = useState("");
  const [localDeliveryError, setLocalDeliveryError] = useState("");
  const [editorMessage, setEditorMessage] = useState("");
  const [editorError, setEditorError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editableDocs, setEditableDocs] = useState<EditableDoc[]>([]);
  const [activeDocId, setActiveDocId] = useState("informe");
  const [paidVerification, setPaidVerification] = useState<PaidVerification>(INITIAL_PAID);

  const activeDoc = editableDocs.find((doc) => doc.id === activeDocId) || editableDocs[0];

  async function fetchAdminRequestPayload(): Promise<any> {
    if (!requestId) throw new Error("No se detectó requestId.");

    const query = new URLSearchParams({
      search: requestId,
      limit: "100",
      ts: String(Date.now()),
    });

    const response = await fetch(`/api/admin/requests?${query.toString()}`, {
      method: "GET",
      cache: "no-store",
      headers: buildAdminHeaders(),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || data?.ok === false) {
      throw new Error(
        data?.error ||
          data?.message ||
          `No se pudo obtener JSON admin. HTTP ${response.status}`
      );
    }

    return data;
  }

  function findMatchingRequest(data: any): JsonRecord | null {
    const rows = Array.isArray(data?.requests)
      ? data.requests
      : Array.isArray(data?.data)
        ? data.data
        : data?.data
          ? [data.data]
          : [];

    const found =
      rows.find((row: any) => {
        const payment = asRecord(row?.payment);
        const candidates = [
          row?.request_id,
          row?.requestId,
          row?.id,
          row?.external_reference,
          row?.externalReference,
          payment.requestId,
          payment.externalReference,
        ];

        return candidates.some((value) => String(value || "").trim() === requestId);
      }) ||
      rows[0] ||
      null;

    return found ? asRecord(found) : null;
  }

  async function downloadAdminJson() {
    try {
      setLocalDeliveryMessage("");
      setLocalDeliveryError("");

      const data = await fetchAdminRequestPayload();
      const content = JSON.stringify(data, null, 2);
      downloadTextFile(`admin-request-${requestId}.json`, content, "application/json;charset=utf-8");

      setLocalDeliveryMessage(`JSON admin descargado: admin-request-${requestId}.json`);
    } catch (error) {
      setLocalDeliveryError(
        error instanceof Error
          ? error.message
          : "Error inesperado descargando JSON admin."
      );
    }
  }

  async function copyLocalDeliveryCommand() {
    try {
      setLocalDeliveryMessage("");
      setLocalDeliveryError("");

      if (!requestId) throw new Error("No se detectó requestId.");

      const command = buildLocalDeliveryCommand(requestId);
      await navigator.clipboard.writeText(command);

      setLocalDeliveryMessage("Comando local copiado. Primero descarga el JSON admin.");
    } catch (error) {
      setLocalDeliveryError(
        error instanceof Error ? error.message : "No se pudo copiar el comando local."
      );
    }
  }

  async function copyReviewEditCommand() {
    try {
      setLocalDeliveryMessage("");
      setLocalDeliveryError("");

      if (!requestId) throw new Error("No se detectó requestId.");

      const command = buildReviewEditCommand(requestId);
      await navigator.clipboard.writeText(command);

      setLocalDeliveryMessage("Comando para revisar/editar documentos copiado.");
    } catch (error) {
      setLocalDeliveryError(
        error instanceof Error ? error.message : "No se pudo copiar el comando de revisión."
      );
    }
  }

  function downloadTextFile(filename: string, content: string, type = "text/markdown;charset=utf-8") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function loadEditorDocs() {
    try {
      setEditorError("");
      setEditorMessage("");

      const data = await fetchAdminRequestPayload();
      const found = findMatchingRequest(data);

      if (!found) {
        throw new Error("No se encontró la solicitud para armar documentos editables.");
      }

      const docs = buildEditableDocs(requestId, found);

      setEditableDocs(docs);
      setActiveDocId(docs[0]?.id || "informe");
      setEditorOpen(true);
      setEditorMessage("Documentos cargados para edición en panel.");
    } catch (error) {
      setEditorError(
        error instanceof Error
          ? error.message
          : "Error inesperado cargando editor de documentos."
      );
    }
  }

  function updateActiveDocContent(content: string) {
    if (!activeDoc) return;

    setEditableDocs((docs) =>
      docs.map((doc) => (doc.id === activeDoc.id ? { ...doc, content } : doc))
    );
  }

  async function copyActiveDoc() {
    if (!activeDoc) return;

    await navigator.clipboard.writeText(activeDoc.content);
    setEditorMessage(`Documento copiado: ${activeDoc.title}`);
  }

  function downloadActiveDoc() {
    if (!activeDoc) return;

    downloadTextFile(activeDoc.filename, activeDoc.content);
    setEditorMessage(`Documento descargado: ${activeDoc.filename}`);
  }

  function downloadAllDocs() {
    editableDocs.forEach((doc) => downloadTextFile(doc.filename, doc.content));
    setEditorMessage("Documentos descargados. Revisa Descargas.");
  }

  async function loadPaidVerification() {
    if (!requestId) {
      setPaidVerification({
        ...INITIAL_PAID,
        loading: false,
        error: "No se detectó requestId.",
      });
      return;
    }

    setPaidVerification((current) => ({ ...current, loading: true, error: "" }));

    try {
      const data = await fetchAdminRequestPayload();
      const found = findMatchingRequest(data);

      if (!found) {
        setPaidVerification({
          ...INITIAL_PAID,
          loading: false,
          error: "No se encontró la solicitud para verificar pago.",
        });
        return;
      }

      const payment = asRecord(found.payment);
      const merged = {
        ...payment,
        ...found,
      };

      const commercialStatus = pickString(
        merged,
        ["payment_status", "paymentStatus", "purchase_status", "purchaseStatus", "status"],
        ""
      );

      setPaidVerification({
        loading: false,
        approved: isApprovedStatus(commercialStatus),
        status: commercialStatus,
        source: pickString(merged, ["source"], ""),
        paidAt: pickString(merged, ["payment_paid_at", "paymentPaidAt", "paid_at", "paidAt"], ""),
        amount: pickNumber(merged, ["payment_amount", "paymentAmount", "amount", "transaction_amount"], 0),
        product: pickString(merged, ["product", "payment_product"], ""),
        error: "",
      });
    } catch (error) {
      setPaidVerification({
        ...INITIAL_PAID,
        loading: false,
        error: error instanceof Error ? error.message : "Error inesperado verificando pago.",
      });
    }
  }

  async function loadStatus() {
    if (!requestId) {
      setLoading(false);
      setErrorMessage("No se detectó requestId.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/admin/requests/${encodeURIComponent(requestId)}/management-status?ts=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `No se pudo cargar el estado. HTTP ${response.status}`);
      }

      setStatus(data.status || "pending_review");
      setNote(data.note || "");
      setUpdatedAt(data.updatedAt || null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado cargando estado interno."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
    loadPaidVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => {
    function handleRefresh() {
      loadStatus();
      loadPaidVerification();
    }

    window.addEventListener("ptm-management-status-refresh", handleRefresh);

    return () => {
      window.removeEventListener("ptm-management-status-refresh", handleRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  async function saveStatus() {
    if (!requestId) {
      setErrorMessage("No se detectó requestId.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/admin/requests/${encodeURIComponent(requestId)}/management-status?ts=${Date.now()}`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            note,
          }),
        }
      );

      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `No se pudo guardar el estado. HTTP ${response.status}`);
      }

      setStatus(data.status || status);
      setNote(data.note || note);
      setUpdatedAt(data.updatedAt || new Date().toISOString());
      setMessage(data.message || "Estado interno actualizado.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado guardando estado interno."
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedOption = STATUS_OPTIONS.find((item) => item.value === status);
  const isPaymentOnly = isPaymentOnlySource(paidVerification.source);
  const canPrepareLocalDelivery = paidVerification.approved && !isPaymentOnly;

  return (
    <section className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-teal-50 px-4 py-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                Gestión
              </span>

              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${getStatusClasses(status)}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(status)}`} />
                {loading ? "Cargando..." : getStatusLabel(status)}
              </span>
            </div>

            <h2 className="mt-2 text-base font-black text-slate-950">
              Estado interno
            </h2>

            <p className="mt-0.5 text-xs leading-5 text-slate-600">
              Seguimiento operativo manual de esta solicitud.
            </p>
          </div>

          <button
            type="button"
            onClick={saveStatus}
            disabled={loading || saving}
            className="inline-flex min-w-[130px] items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <div className="p-4">
        {paidVerification.loading ? (
          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
            Verificando pago de la solicitud...
          </div>
        ) : paidVerification.approved ? (
          <>
            {isPaymentOnly ? (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-red-900">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-800">
                    Alerta operativa
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-800">
                    Pago sin análisis
                  </span>
                </div>

                <p className="mt-2 text-sm font-black">
                  Pago aprobado sin análisis asociado.
                </p>

                <p className="mt-1 text-xs font-semibold leading-5">
                  Esta solicitud tiene pago registrado, pero no contiene análisis ni multas detectadas. No generar documentos desde esta ficha hasta revisar el origen del pago.
                </p>
              </div>
            ) : null}

            <div className={`mb-3 rounded-lg border px-3 py-3 ${getNoticeClasses(status)}`}>
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide">
                      Solicitud pagada verificada
                    </span>
                    <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide">
                      {status === "documents_sent" || status === "closed"
                        ? "Entrega registrada"
                        : status === "in_progress"
                          ? "En preparación"
                          : "Pendiente de preparar"}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-black">
                    Pago aprobado confirmado. {getNextStepText(status)}
                  </p>

                  <p className="mt-1 text-xs font-semibold leading-5 opacity-80">
                    {isPaymentOnly
                      ? "Antes de generar entrega, confirma que exista análisis asociado y que la ficha no sea solo un registro de pago."
                      : "Revisa datos del cliente, edita documentos si corresponde, genera/valida la entrega y luego envía documentos listos."}
                  </p>
                </div>

                <div className="grid min-w-[160px] gap-1 text-xs font-bold md:text-right">
                  <span>{formatMoney(paidVerification.amount)}</span>
                  <span>{paidVerification.paidAt ? formatDate(paidVerification.paidAt) : "Pago sin fecha"}</span>
                  {paidVerification.product ? <span>{paidVerification.product}</span> : null}
                </div>
              </div>
            </div>

            {canPrepareLocalDelivery ? (
              <div className="mb-3 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-3 text-cyan-950">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-cyan-800">
                      Documentos y entrega
                    </span>

                    <p className="mt-2 text-sm font-black">
                      Edita documentos en este panel o genera la entrega local.
                    </p>

                    <p className="mt-1 text-xs font-semibold leading-5 text-cyan-800">
                      La edición en panel permite copiar o descargar Markdown. La entrega ZIP final sigue validándose localmente antes de enviar.
                    </p>
                  </div>

                  <div className="grid gap-2 md:min-w-[240px]">
                    <button
                      type="button"
                      onClick={loadEditorDocs}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-slate-800"
                    >
                      Abrir editor documentos
                    </button>

                    <button
                      type="button"
                      onClick={downloadAdminJson}
                      className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-cyan-800"
                    >
                      Descargar JSON admin
                    </button>

                    <button
                      type="button"
                      onClick={copyLocalDeliveryCommand}
                      className="rounded-lg border border-cyan-700 bg-white px-3 py-2 text-xs font-black text-cyan-900 shadow-sm transition hover:bg-cyan-100"
                    >
                      Copiar comando generar
                    </button>

                    <button
                      type="button"
                      onClick={copyReviewEditCommand}
                      className="rounded-lg border border-amber-600 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900 shadow-sm transition hover:bg-amber-100"
                    >
                      Copiar comando revisar local
                    </button>
                  </div>
                </div>

                {editorOpen && editableDocs.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-slate-950">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-black">
                          Editor rápido de documentos
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Revisa y edita antes de descargar o copiar.
                        </p>
                      </div>

                      <select
                        value={activeDoc?.id || ""}
                        onChange={(event) => setActiveDocId(event.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900"
                      >
                        {editableDocs.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <textarea
                      value={activeDoc?.content || ""}
                      onChange={(event) => updateActiveDocContent(event.target.value)}
                      className="mt-3 min-h-[360px] w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    />

                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      <button
                        type="button"
                        onClick={copyActiveDoc}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-900 hover:bg-slate-50"
                      >
                        Copiar documento
                      </button>

                      <button
                        type="button"
                        onClick={downloadActiveDoc}
                        className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-black text-white hover:bg-cyan-800"
                      >
                        Descargar este .md
                      </button>

                      <button
                        type="button"
                        onClick={downloadAllDocs}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800"
                      >
                        Descargar todos
                      </button>
                    </div>
                  </div>
                ) : null}

                {localDeliveryMessage ? (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    {localDeliveryMessage}
                  </div>
                ) : null}

                {localDeliveryError ? (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                    {localDeliveryError}
                  </div>
                ) : null}

                {editorMessage ? (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    {editorMessage}
                  </div>
                ) : null}

                {editorError ? (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                    {editorError}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : paidVerification.error ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            No se pudo verificar pago desde esta tarjeta: {paidVerification.error}
          </div>
        ) : null}

        <div className="grid gap-2 md:grid-cols-[1fr_1fr_2fr]">
          <div className={`rounded-lg border px-3 py-2.5 ${getStatusClasses(status)}`}>
            <p className="text-[10px] font-black uppercase tracking-wide opacity-70">
              Estado actual
            </p>
            <p className="mt-1 text-sm font-black">
              {loading ? "Cargando..." : getStatusLabel(status)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              Actualización
            </p>
            <p className="mt-1 text-sm font-black">
              {formatDate(updatedAt)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              Descripción
            </p>
            <p className="mt-1 text-xs font-bold leading-5">
              {selectedOption?.description || "Sin descripción"}
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[240px_1fr]">
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              Cambiar estado
            </span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ManagementStatus)}
              disabled={loading || saving}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              Nota interna opcional
            </span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={loading || saving}
              placeholder="Ej: informe en preparación, pendiente revisar PDF..."
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
            />
          </label>
        </div>

        {message ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}
