# PTM - Manual de operacion controlada

## Estado del proyecto

PTM se encuentra listo para operacion controlada.

Estado validado:

- Produccion publica OK.
- SEO critico OK.
- Mercado Pago real y webhook OK.
- Pago real aprobado validado previamente.
- Datos postpago funcionando.
- Generador unico de entrega funcionando.
- Validacion de entrega APROBADO.
- Auditoria de entrega APROBADO.
- Git limpio.

## Regla principal

No modificar codigo estable salvo bug real detectado en operacion.

## Flujo cuando llega un cliente

1. Cliente entra a prescribetumulta.cl.
2. Sube certificado de multas.
3. Sistema entrega resultado preliminar.
4. Cliente paga por Mercado Pago.
5. Cliente completa datos para documentos.
6. Se revisa la solicitud en admin.
7. Se descarga o prepara JSON admin.
8. Se ejecuta generador unico local.
9. Se revisa visualmente el ZIP.
10. Se envia correo de documentos listos.
11. Se marca internamente como entregado o gestionado.

## Comando base de entrega

```powershell
.\scripts\ops\generate-real-delivery.ps1 -RequestId "REQUEST_ID" -AdminJsonPath ".\tmp\admin-request-REQUEST_ID.json"
```

## Antes de enviar al cliente

Revisar siempre:

- Nombre del cliente.
- Patente.
- Cantidad de multas.
- Multas potencialmente prescritas.
- Monto referencial.
- Escritos generados.
- Que no existan textos pendientes.
- Que auditoria indique APROBADO.
- Que validacion indique APROBADO.

## No hacer

- No volver a pagar para probar.
- No tocar Mercado Pago si ya funciona.
- No editar scripts estables por ansiedad.
- No lanzar campana grande antes de 1 a 3 clientes reales controlados.
- No enviar ZIP sin revision visual.

## Criterio para pasar a marketing

Pasar a marketing solo despues de completar al menos una entrega real revisada de punta a punta.
