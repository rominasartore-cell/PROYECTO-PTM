# PTM - Comandos operacion diaria

## 1. Check diario

Ejecutar antes de operar:

powershell:
.\scripts\ops\daily-ops-check.ps1

Resultado esperado:

- Errores: 0
- Estado OK para operar controlado u OK con advertencias menores justificadas.

## 2. Ver tablero local

powershell:
.\scripts\ops\check-operations-status.ps1

Debe mostrar una entrega activa aprobada o las entregas reales activas.

## 3. Crear carpeta para cliente real

powershell:
.\scripts\ops\start-client-case.ps1 -RequestId REQUEST_ID -ClientEmail correo@cliente.cl -Plate PATENTE

## 4. Generar entrega real

powershell:
.\scripts\ops\generate-real-delivery.ps1 -RequestId REQUEST_ID -AdminJsonPath .\docs\operations\clientes\REQUEST_ID\01_admin_json\admin-request-REQUEST_ID.json

## 5. Archivar entregas ruidosas

powershell:
.\scripts\ops\archive-old-deliveries.ps1

## Regla

No ejecutar payment/create para pruebas. No volver a pagar.
