# Instrucciones para Claude Code

Actúa como desarrollador senior full-stack especializado en Next.js, TypeScript, Node.js, formularios, lectura de PDF y deploy en Vercel.

## Prioridad máxima

1. Hacer que el proyecto compile.
2. Hacer que el flujo principal funcione.
3. Corregir errores reales sin reescribir todo.
4. Mantener cambios pequeños, seguros y revisables.

## Reglas obligatorias

- Trabajar sobre la rama `ai-fix-ejecucion`.
- No trabajar sobre `main` salvo instrucción expresa.
- No eliminar funcionalidades existentes.
- No cambiar el diseño visual salvo que sea estrictamente necesario.
- No tocar `.env`, `.env.local`, `.env.production`, claves privadas ni tokens.
- Si faltan variables de entorno, documentarlas en `.env.example` sin valores reales.
- No agregar dependencias innecesarias.
- No hacer refactors grandes si el error se puede corregir puntualmente.
- Antes de terminar, ejecutar `npm run build`.
- Si el build falla, corregir hasta que compile o explicar exactamente qué falta.
- Mantener compatibilidad con Vercel y Next.js.
- Usar TypeScript de forma segura.
- Evitar `any` salvo que sea inevitable y justificado.
- Agregar logs útiles solo en backend/debugging, sin exponer datos sensibles.
- No subir ni modificar `node_modules`, `.next`, `storage`, `emails_outbox`, logs ni backups.

## Contexto del proyecto

Aplicación llamada “Prescribe tu Multa” / “Prefiere tu Multa”.

El usuario debe poder subir un certificado PDF de multas de tránsito no pagadas, completar nombre, correo, patente, aceptar consentimiento y obtener un análisis preliminar de multas potencialmente prescritas.

## Flujo que debe funcionar

1. Usuario entra a la página principal.
2. Completa nombre, correo, patente, sube PDF y acepta consentimiento.
3. Frontend envía todo a `/api/analyze`.
4. Backend valida datos.
5. Backend lee el PDF.
6. Sistema extrae texto del certificado RMNP.
7. Sistema identifica multas, roles, fechas y datos relevantes.
8. Sistema calcula cuáles multas podrían estar prescritas.
9. Sistema devuelve resumen preliminar.
10. Usuario puede continuar al resultado/pago según el flujo existente.

## Errores conocidos

- El backend exige consentimiento; el frontend debe enviar `consent = "true"` cuando el checkbox esté marcado.
- Corregir textos rotos por codificación UTF-8, por ejemplo:
  - `anÃ¡lisis` debe ser `análisis`.
  - `informaciÃ³n` debe ser `información`.
  - `prescripciÃ³n` debe ser `prescripción`.
- Evitar errores de PDF.js worker en Next.js/Vercel.
- No debe haber carpetas `backup_pdf_fix_*` ni backups dentro del proyecto que Next intente compilar.
- Si el PDF es escaneado, devolver error claro:
  “El PDF parece escaneado o no contiene texto seleccionable. Requiere OCR.”

## Archivos importantes

Revisar especialmente:

- `src/components/UploadForm.tsx`
- `src/app/api/analyze/route.ts`
- `src/lib/prescripcion-rmnp/extract-text.ts`
- `src/lib/prescripcion-rmnp/normalize.ts`
- `src/lib/prescripcion-rmnp/*`

## Forma de trabajo

1. Inspeccionar el proyecto.
2. Ejecutar `npm install` si es necesario.
3. Ejecutar `npm run build`.
4. Corregir errores uno por uno.
5. Probar nuevamente.
6. Dejar cambios en commit.
7. Informar archivos modificados, qué se corrigió, resultado del build y comandos para ejecutar localmente.

## Entrega esperada

Al terminar, informar:

1. Lista de archivos modificados.
2. Correcciones realizadas.
3. Resultado de `npm run build`.
4. Comandos para ejecutar localmente.
5. Riesgos o pendientes.

No entregar explicación teórica. El objetivo es que el proyecto funcione.
