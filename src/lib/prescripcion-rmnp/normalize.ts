export function normalizeCertificateText(text: string): string {
  // Normalizar saltos de línea
  let normalized = text.replace(/\r\n/g, '\n');

  // Unir líneas partidas de infracciones y otros campos largos
  // Patrón: línea termina sin puntuación seguida de línea que no empieza con mayúscula/número
  normalized = normalized.replace(
    /([A-ZÁ-Ú]{2,})\n(?=[a-záéíóúñ])/g,
    '$1 '
  );

  // Reemplazar espacios múltiples por uno solo
  normalized = normalized.replace(/  +/g, ' ');

  // Limpiar espacios al inicio/final de líneas
  normalized = normalized
    .split('\n')
    .map(line => line.trim())
    .join('\n');

  // Eliminar líneas vacías múltiples consecutivas
  normalized = normalized.replace(/\n\n\n+/g, '\n\n');

  return normalized;
}

export function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const cleaned = value.trim();

  // DD-MM-YYYY HH:MM:SS
  let match = cleaned.match(
    /(\d{1,2})-(\d{1,2})-(\d{4})\s*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?/
  );
  if (match) {
    const [, day, month, year] = match;
    const d = String(day).padStart(2, '0');
    const m = String(month).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  // DD/MM/YYYY
  match = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    const d = String(day).padStart(2, '0');
    const m = String(month).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  // DD.MM.YYYY
  match = cleaned.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    const d = String(day).padStart(2, '0');
    const m = String(month).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  // YYYY-MM-DD (ya normalizado)
  match = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return cleaned.substring(0, 10);
  }

  return null;
}

export function parseUtmAmount(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/[\d,]+/);
  if (!match) return null;
  const numStr = match[0].replace(/,/, '.');
  const num = parseFloat(numStr);
  return isNaN(num) ? null : num;
}

export function parseClpLikeAmount(
  value: string | null | undefined
): number | null {
  if (!value) return null;
  const cleaned = value
    .trim()
    .replace(/\./g, '')
    .replace(/,/, '.')
    .match(/[\d.]+/)?.[0];
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num);
}

export function normalizePlate(value: string | null | undefined): string | null {
  if (!value) return null;

  let plate = value.toUpperCase().trim();

  // Reemplazar punto por guion
  plate = plate.replace(/\./g, '-');

  // Eliminar espacios
  plate = plate.replace(/\s/g, '');

  // Formato ABCD-12 o ABCD12 → ABCD-12
  const match1 = plate.match(/^([A-Z]{2,4})[\-]?(\d{1,4})$/);
  if (match1) {
    const [, letters, numbers] = match1;
    return `${letters}-${numbers}`;
  }

  // Formato ABCD-12-8 (con dígito verificador) → ABCD-12
  const match2 = plate.match(/^([A-Z]{2,4})[\-]?(\d{1,4})[\-]?\d?$/);
  if (match2) {
    const [, letters, numbers] = match2;
    return `${letters}-${numbers}`;
  }

  return plate || null;
}

export function normalizeCourtName(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim().toUpperCase();

  // Remover número al inicio si existe
  // "2 POLICIA LOCAL DE SAN BERNARDO" → "POLICIA LOCAL DE SAN BERNARDO"
  return cleaned.replace(/^\d+\s+/, '').trim() || null;
}
