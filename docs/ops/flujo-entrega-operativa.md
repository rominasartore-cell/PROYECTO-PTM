# PTM - Flujo operativo de entrega

## Estado

Este flujo genera una entrega local completa para una solicitud pagada de Prescribe tu Multa.

El generador unico se encuentra en:

`scripts/ops/generate-real-delivery.ps1`

## Objetivo

Reemplazar la ejecucion manual de varios scripts por un solo comando seguro.

El flujo genera:

- `delivery-data.json`
- informe en Markdown
- instructivo en Markdown
- solicitudes de prescripcion editables
- validacion de entrega
- export HTML
- ZIP final
- auditoria de entrega

## Comando de uso

Ejecutar desde la raiz del proyecto:

```powershell
.\scripts\ops\generate-real-delivery.ps1 -RequestId "REQUEST_ID_AQUI" -AdminJsonPath ".\tmp\admin-request-REQUEST_ID_AQUI.json"
```

## Ejemplo validado

```powershell
.\scripts\ops\generate-real-delivery.ps1 -RequestId "ptm-1778707733393-wi39ig77" -AdminJsonPath ".\tmp\admin-request-ptm-1778707733393-wi39ig77.json"
```

## Validacion esperada

El flujo debe terminar con:

- Validacion: APROBADO
- Auditoria: APROBADO
- Hallazgos: 0
- ZIP final creado en `docs/deliveries/[requestId]`

## Reglas de seguridad

- No toca Mercado Pago.
- No toca Supabase.
- No toca produccion.
- No toca codigo de frontend/backend.
- No modifica `src`.
- Solo orquesta scripts locales ya validados.
- Las entregas generadas quedan dentro de `docs/deliveries`, carpeta ignorada por Git.

## Scripts internos ejecutados

El generador llama, en orden:

1. `create-delivery-data-from-admin-json.ps1`
2. `sync-client-data-to-delivery.ps1`
3. `normalize-delivery-roles.ps1`
4. `create-delivery-package.ps1`
5. `validate-delivery-package.ps1`
6. `export-delivery-html.ps1`
7. `build-delivery-zip.ps1`
8. `audit-delivery-package.ps1`

## Ultima validacion conocida

RequestId validado:

`ptm-1778707733393-wi39ig77`

Resultado:

- Total multas: 14
- Potencialmente prescritas: 7
- No prescritas/vigentes: 7
- Monto referencial prescrito: $670.586
- Validacion entrega: APROBADO
- Auditoria entrega: APROBADO
- Hallazgos: 0
- ZIP final creado correctamente
