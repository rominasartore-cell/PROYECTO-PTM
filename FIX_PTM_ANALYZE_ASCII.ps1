# FIX_PTM_ANALYZE_ASCII.ps1
# ASCII-only script. No accented chars in source to avoid old PowerShell encoding errors.

$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Users\romis\OneDrive\Escritorio\PROYECTO PTM\prescribe-tu-multa\prescribe-tu-multa"

Write-Host "============================================================"
Write-Host "FIX PTM ANALYZE - ASCII SAFE"
Write-Host "============================================================"

if (!(Test-Path $ProjectRoot)) {
  Write-Host "ERROR: Project folder not found:" -ForegroundColor Red
  Write-Host $ProjectRoot
  exit 1
}

Set-Location $ProjectRoot
Write-Host "Project:" $ProjectRoot

$CoreDir = Join-Path $ProjectRoot "src\lib\prescripcion-rmnp"
$ApiAnalyzeDir = Join-Path $ProjectRoot "src\app\api\analyze"
$ApiAnalyzeRoute = Join-Path $ApiAnalyzeDir "route.ts"

if (!(Test-Path $CoreDir)) {
  Write-Host "ERROR: RMNP core folder not found:" -ForegroundColor Red
  Write-Host $CoreDir
  exit 1
}

New-Item -ItemType Directory -Force -Path $ApiAnalyzeDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = Join-Path $ProjectRoot "backup_fix_analyze_$Stamp"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

Write-Host ""
Write-Host "Backup:"
Write-Host $BackupDir

$FilesToBackup = @(
  "src\lib\prescripcion-rmnp\extract-text.ts",
  "src\lib\prescripcion-rmnp\types.ts",
  "src\lib\prescripcion-rmnp\calculate-prescription.ts",
  "src\app\api\analyze\route.ts"
)

foreach ($rel in $FilesToBackup) {
  $src = Join-Path $ProjectRoot $rel
  if (Test-Path $src) {
    $dest = Join-Path $BackupDir ($rel -replace '[\\/:*?"<>|]', '_')
    Copy-Item $src $dest -Force
  }
}

Write-Host ""
Write-Host "1) Replacing old REQUIERE_REVISION variants in src..."

$oldWithAccent = "REQUIERE_REVISI" + [char]0x00D3 + "N"
$oldMojibake1 = "REQUIERE_REVISI" + [char]0x00C3 + [char]0x201C + "N"
$oldMojibake2 = "REQUIERE_REVISI" + [char]0x00C3 + [char]0x0093 + "N"

Get-ChildItem ".\src" -Recurse -Include *.ts,*.tsx | ForEach-Object {
  $p = $_.FullName
  $c = [System.IO.File]::ReadAllText($p)
  $n = $c.Replace($oldWithAccent, "REQUIERE_REVISION")
  $n = $n.Replace($oldMojibake1, "REQUIERE_REVISION")
  $n = $n.Replace($oldMojibake2, "REQUIERE_REVISION")
  if ($n -ne $c) {
    [System.IO.File]::WriteAllText($p, $n, [System.Text.Encoding]::UTF8)
    Write-Host "Updated:" $p
  }
}

Write-Host ""
Write-Host "2) Writing extract-text.ts without pdfjs/worker..."

$ExtractText = @'
import { normalizeCertificateText } from './normalize';

export interface ExtractionResult {
  text: string;
  isScanned: boolean;
  pageCount: number;
  hasSelectableText: boolean;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  try {
    // pdf-parse@1.1.1 classic.
    // Use lib/pdf-parse.js to avoid pdf.worker.mjs and test/data/05-versions-space.pdf issues.
    // Do not use PDFParse class, pdfjs-dist, pdf.worker or getTextContent here.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');

    const data = await pdfParse(buffer);

    const text = normalizeCertificateText(data.text || '');
    const pageCount = data.numpages || 0;
    const hasSelectableText = text.trim().length > 50;

    if (!hasSelectableText && pageCount > 0) {
      throw new Error('El PDF parece escaneado o no contiene texto seleccionable. Requiere OCR.');
    }

    if (!hasSelectableText) {
      throw new Error('No se pudo extraer texto del PDF. Verifica que sea un certificado RMNP valido.');
    }

    return {
      text,
      isScanned: false,
      pageCount,
      hasSelectableText: true,
    };
  } catch (error: any) {
    if (error.message?.includes('escaneado') || error.message?.includes('OCR')) {
      throw error;
    }

    if (error instanceof Error) {
      throw new Error(`Error al extraer texto del PDF: ${error.message}`);
    }

    throw new Error('Error al extraer texto del PDF: Unknown error');
  }
}
'@
[System.IO.File]::WriteAllText((Join-Path $CoreDir "extract-text.ts"), $ExtractText, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "3) Writing minimal /api/analyze route..."

$AnalyzeRoute = @'
import { analyzeCertificate } from '../../../lib/prescripcion-rmnp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeInputPlate(plate: string): string {
  const value = String(plate || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/\./g, '-')
    .trim();

  const fourLetters = value.match(/^([A-Z]{4})-?(\d{2})$/);
  if (fourLetters) return `${fourLetters[1]}-${fourLetters[2]}`;

  const twoLetters = value.match(/^([A-Z]{2})-?(\d{4})$/);
  if (twoLetters) return `${twoLetters[1]}-${twoLetters[2]}`;

  return value;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const plate = String(formData.get('plate') || '').trim();
    const consent = String(formData.get('consent') || '').trim();
    const file = formData.get('file');

    if (!name) {
      return Response.json({ ok: false, error: 'El nombre es obligatorio.' }, { status: 400 });
    }

    if (!email || !isValidEmail(email)) {
      return Response.json({ ok: false, error: 'El correo electronico no es valido.' }, { status: 400 });
    }

    if (!plate) {
      return Response.json({ ok: false, error: 'La patente es obligatoria.' }, { status: 400 });
    }

    if (consent !== 'true') {
      return Response.json({ ok: false, error: 'Debes aceptar el consentimiento para procesar el certificado.' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return Response.json({ ok: false, error: 'Debes subir un archivo PDF.' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return Response.json({ ok: false, error: 'El archivo debe ser PDF.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const requestId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `REQ-${Date.now()}`;

    const analysis = await analyzeCertificate(buffer, requestId);

    if (!analysis.certificate.vehiclePlateNormalized) {
      analysis.certificate.vehiclePlateRaw = plate;
      analysis.certificate.vehiclePlateNormalized = normalizeInputPlate(plate);
      analysis.warnings.push('No se detecto patente en el certificado; se uso la patente ingresada por el usuario.');
    }

    return Response.json({
      ok: true,
      requestId,
      customer: {
        name,
        email,
        plate: normalizeInputPlate(plate),
      },
      ...analysis,
    });
  } catch (error: any) {
    console.error('[api/analyze] ERROR:', error);

    return Response.json(
      {
        ok: false,
        error: error?.message || 'Error interno al analizar el certificado.',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
'@
[System.IO.File]::WriteAllText($ApiAnalyzeRoute, $AnalyzeRoute, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "4) Checking problematic patterns..."

$Bad = Get-ChildItem ".\src" -Recurse -Include *.ts,*.tsx | Select-String -Pattern "pdfjs|pdf.worker|getTextContent|PDFParse|REQUIERE_REVISI"
if ($Bad) {
  Write-Host "WARNING: Problematic patterns still found:" -ForegroundColor Yellow
  $Bad | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "OK: no problematic patterns found."
}

Write-Host ""
Write-Host "5) Ensuring pdf-parse classic..."
npm uninstall pdf-parse | Out-Host
npm install pdf-parse@1.1.1 | Out-Host

Write-Host ""
Write-Host "6) Killing port 3000 if needed..."
$Net = netstat -ano | findstr :3000
if ($Net) {
  $Lines = $Net -split "`n"
  foreach ($Line in $Lines) {
    if ($Line -match "LISTENING\s+(\d+)") {
      $ProcId = [int]$Matches[1]
      try {
        Stop-Process -Id $ProcId -Force
        Write-Host "Stopped PID:" $ProcId
      } catch {
        Write-Host "Could not stop PID $ProcId"
      }
    }
  }
} else {
  Write-Host "No server on port 3000."
}

Write-Host ""
Write-Host "7) Removing .next..."
if (Test-Path ".next") {
  Remove-Item -Recurse -Force ".next"
  Write-Host ".next removed."
} else {
  Write-Host ".next did not exist."
}

Write-Host ""
Write-Host "============================================================"
Write-Host "FIX APPLIED"
Write-Host "Backup:" $BackupDir
Write-Host "============================================================"
Write-Host ""
Write-Host "NEXT:"
Write-Host "npm run build"
Write-Host "npm run dev"
Write-Host ""
Write-Host "Then in another PowerShell:"
Write-Host 'curl.exe -i -X POST http://localhost:3000/api/analyze `'
Write-Host '  -F "name=Cliente Prueba" `'
Write-Host '  -F "email=cliente@test.cl" `'
Write-Host '  -F "plate=FWTH90" `'
Write-Host '  -F "consent=true" `'
Write-Host '  -F "file=@.\fixtures\certificado-rmnp-real.pdf;type=application/pdf"'
