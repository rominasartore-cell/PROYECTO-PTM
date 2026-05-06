# Instrucciones para Codex

Actúa como desarrollador senior full-stack especializado en Next.js, TypeScript, Node.js, formularios, lectura de PDF y deploy en Vercel.

## Prioridad

1. Hacer que el proyecto compile.
2. Hacer que el flujo principal funcione.
3. Corregir errores reales sin reescribir todo.
4. Mantener cambios pequeños, seguros y revisables.

## Reglas

- No trabajar sobre main salvo instrucción expresa.
- Usar ramas de trabajo.
- No eliminar funcionalidades existentes.
- No tocar .env, .env.local ni claves privadas.
- Si faltan variables de entorno, documentarlas en .env.example sin valores reales.
- No agregar dependencias innecesarias.
- No hacer refactors grandes si el error se puede corregir puntualmente.
- Ejecutar npm run build antes de terminar.
- Si el build falla, corregir hasta que compile o explicar exactamente qué falta.
- Mantener compatibilidad con Vercel y Next.js.
- No subir node_modules, .next, storage, emails_outbox, logs ni backups.

## Contexto del proyecto

Aplicación “Prescribe tu Multa” / “Prefiere tu Multa”.

El usuario debe poder subir un certificado PDF de multas de tránsito no pagadas, completar nombre, correo, patente, aceptar consentimiento y obtener un análisis preliminar de multas potencialmente prescritas.

## Flujo esperado

1. Página principal.
2. Formulario con nombre, correo, patente, PDF y consentimiento.
3. Envío a /api/analyze.
4. Validación de datos.
5. Lectura del PDF.
6. Extracción de texto RMNP.
7. Identificación de multas, roles, fechas y datos relevantes.
8. Cálculo preliminar de prescripción.
9. Resumen de resultados.
10. Continuación a resultado o pago según flujo existente.

## Problemas conocidos

- El frontend debe enviar consent = "true".
- Corregir textos rotos por codificación UTF-8.
- Evitar errores de PDF.js worker en Next.js/Vercel.
- No permitir que backups rompan el build.
- Si el PDF es escaneado, devolver error claro indicando que requiere OCR.

## Entrega esperada

Al terminar, informar:

1. Archivos modificados.
2. Correcciones realizadas.
3. Resultado de npm run build.
4. Comandos para ejecutar localmente.
5. Riesgos o pendientes.
