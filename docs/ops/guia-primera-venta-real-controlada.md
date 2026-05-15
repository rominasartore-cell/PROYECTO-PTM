# PTM - Guia primera venta real controlada

## Objetivo

Esta guia ordena el flujo para atender el primer cliente real pagado sin tocar codigo estable.

## Regla principal

No modificar src, Mercado Pago, Supabase ni scripts estables durante la primera operacion real.

La primera venta debe servir para validar operacion, no para seguir programando.

## Flujo completo

### 1. Confirmar pago

- Revisar admin.
- Confirmar que el pago aparezca aprobado.
- Copiar RequestId.
- Confirmar correo del cliente.
- Confirmar patente.

No usar pagos nuevos de prueba. Solo clientes reales.

### 2. Iniciar carpeta operativa del cliente

Ejecutar desde la raiz del proyecto:

powershell:
.\scripts\ops\start-client-case.ps1 -RequestId REQUEST_ID -ClientEmail correo@cliente.cl -Plate PATENTE

Esto crea una carpeta local en:

docs\operations\clientes\REQUEST_ID

### 3. Guardar JSON admin

Guardar el JSON admin de la solicitud en:

docs\operations\clientes\REQUEST_ID\01_admin_json

Nombre recomendado:

admin-request-REQUEST_ID.json

### 4. Revisar datos postpago

Antes de generar documentos, confirmar:

- Nombre cliente.
- RUT.
- Domicilio.
- Comuna.
- Profesion u oficio.
- Correo.
- Patente.

Si faltan datos, pedirlos antes de generar entrega.

### 5. Generar entrega

Ejecutar desde la raiz del proyecto:

powershell:
.\scripts\ops\generate-real-delivery.ps1 -RequestId REQUEST_ID -AdminJsonPath .\docs\operations\clientes\REQUEST_ID\01_admin_json\admin-request-REQUEST_ID.json

El resultado principal queda en:

docs\deliveries\REQUEST_ID

### 6. Revisar control de calidad

Antes de enviar al cliente, confirmar:

- VALIDACION_ENTREGA.md indica APROBADO.
- AUDITORIA_ENTREGA.md indica APROBADO.
- No hay textos pendientes.
- No hay placeholders visibles.
- El ZIP existe.
- Los escritos corresponden a las multas potencialmente prescritas.
- No se inventa rol de causa si no aparece en certificado.

### 7. Revision visual

Abrir y revisar manualmente:

- informe.
- instructivo.
- solicitudes de prescripcion.
- ZIP final.

La auditoria automatica no reemplaza la revision profesional final.

### 8. Enviar documentos

Enviar correo de documentos listos desde admin o por flujo operativo definido.

Registrar:

- fecha de envio.
- correo usado.
- archivos enviados.
- observaciones.

### 9. Cerrar caso

Actualizar el seguimiento local del cliente:

docs\operations\clientes\REQUEST_ID\SEGUIMIENTO_CLIENTE.md

Marcar:

- pago confirmado.
- datos completos.
- entrega generada.
- revision visual hecha.
- documentos enviados.

## Criterio para escalar

Despues de 1 a 3 clientes reales controlados sin incidentes, se puede aumentar trafico.

No activar campana fuerte antes de validar al menos una entrega real completa.

## Incidentes que obligan a pausar

- Pago aprobado no aparece en admin.
- Cliente no puede completar datos.
- Generador falla.
- Validacion no aprueba.
- Auditoria no aprueba.
- Documento contiene placeholders.
- Datos del cliente aparecen mal.
- ZIP no se genera.

Si ocurre cualquiera de esos casos, pausar entrega y corregir antes de enviar.
