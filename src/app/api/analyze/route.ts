import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  extractTextFromPdf,
  parseRmnpCertificate,
} from '@/lib/prescripcion-rmnp';

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

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as File).arrayBuffer === 'function' &&
    typeof (value as File).name === 'string'
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get('file');
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const plate = String(formData.get('plate') || '').trim();
    const rawConsent =
      formData.get('consent') ??
      formData.get('consentAccepted') ??
      formData.get('acceptConsent') ??
      formData.get('privacyConsent');

    const consent = String(rawConsent || '').trim().toLowerCase();

    const consentAccepted =
      consent === 'true' ||
      consent === 'on' ||
      consent === '1' ||
      consent === 'yes';

    if (!name) {
      return NextResponse.json(
        { ok: false, error: 'El nombre es obligatorio.' },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: 'El correo electronico no es valido.' },
        { status: 400 }
      );
    }

    if (!plate) {
      return NextResponse.json(
        { ok: false, error: 'La patente es obligatoria.' },
        { status: 400 }
      );
    }

    if (!consentAccepted) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Debes aceptar el consentimiento para procesar el certificado.',
        },
        { status: 400 }
      );
    }

    if (!isUploadedFile(file)) {
      return NextResponse.json(
        { ok: false, error: 'Debes subir un archivo PDF.' },
        { status: 400 }
      );
    }

    const fileName = file.name || '';
    const fileType = file.type || '';

    if (!fileName.toLowerCase().endsWith('.pdf') && fileType !== 'application/pdf') {
      return NextResponse.json(
        { ok: false, error: 'El archivo debe ser PDF.' },
        { status: 400 }
      );
    }

    const requestId = randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());

    if (!buffer.length) {
      return NextResponse.json(
        { ok: false, error: 'El archivo PDF esta vacio.' },
        { status: 400 }
      );
    }

    const extracted = await extractTextFromPdf(buffer);
    const parsed = await parseRmnpCertificate(extracted.text, requestId);

    if (!parsed.certificate.vehiclePlateNormalized) {
      parsed.certificate.vehiclePlateRaw = plate;
      parsed.certificate.vehiclePlateNormalized = normalizeInputPlate(plate);
      parsed.warnings.push(
        'No se detecto patente en el certificado; se uso la patente ingresada por el usuario.'
      );
    }

    const hasPotentialPrescription = parsed.summary.prescribedCount > 0;

    return NextResponse.json({
      ok: true,
      requestId: parsed.requestId,
      customer: {
        name,
        email,
        plate: normalizeInputPlate(plate),
      },
      certificate: parsed.certificate,
      fines: parsed.fines,
      summary: parsed.summary,
      warnings: parsed.warnings,
      extractedAt: parsed.extractedAt,

      // Campos duplicados a nivel superior para compatibilidad con frontend simple.
      totalFines: parsed.summary.totalFines,
      prescribedCount: parsed.summary.prescribedCount,
      notPrescribedCount: parsed.summary.notPrescribedCount,
      reviewCount: parsed.summary.reviewCount,
      hasPotentialPrescription,
      message: hasPotentialPrescription
        ? `Detectamos ${parsed.summary.prescribedCount} multa(s) potencialmente prescrita(s).`
        : 'No se detectaron multas potencialmente prescritas con los datos extraidos.',
    });
  } catch (error: any) {
    console.error('[api/analyze] ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Error interno al analizar el certificado.',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
