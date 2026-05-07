# Admin Dashboard - Guía de Configuración

## Requisitos

- Supabase account (Free tier)
- Node.js 18+

## Paso 1: Crear proyecto en Supabase

1. Ir a https://supabase.com/dashboard
2. Crear un nuevo proyecto (Free tier disponible)
3. Copiar las credenciales:
   - Project URL (será `NEXT_PUBLIC_SUPABASE_URL`)
   - Anon Key (será `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Paso 2: Crear tablas en Supabase

1. En el dashboard de Supabase, ir a SQL Editor
2. Copiar el contenido de `migrations/001_create_requests_table.sql`
3. Ejecutar la query

Esto creará:
- Tabla `analysis_requests`: guarda todas las solicitudes de análisis
- Tabla `admin_notes`: guarda notas internas por solicitud

## Paso 3: Configurar variables de entorno

Agregar a `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=your-hash

# UTM value in CLP
UTM_CLP=65000

# Report price in CLP
REPORT_PRICE_CLP=9990
```

## Paso 4: Generar hash de contraseña

```bash
node scripts/generate-password-hash.js "tu-contraseña-segura"
```

Esto imprimirá el hash. Copialo y agrégalo a `.env.local` como `ADMIN_PASSWORD_HASH`.

## Paso 5: Probar localmente

```bash
npm run dev
```

Acceder a: http://localhost:3000/admin

Login con:
- Usuario: `admin`
- Contraseña: la que usaste en el paso 4

## Funcionalidades del Dashboard

### Listado y Filtros
- Listar todas las solicitudes de análisis
- Filtrar por nombre, correo o patente
- Filtrar por estado (pendiente, aprobado, pagado, rechazado)
- Filtrar por estado de pago
- Paginación

### Métricas
En el dashboard se muestran:
- Total de solicitudes
- Solicitudes pendientes
- Solicitudes aprobadas
- Solicitudes pagadas
- Solicitudes rechazadas
- Pagos aprobados

### Ver Detalle
Desde el listado, hacer click en "Ver" para:
- Ver información completa del cliente
- Ver análisis resumido (multas totales, prescritas, montos)
- Ver análisis completo en formato JSON
- Cambiar estado de la solicitud
- Agregar notas internas
- Ver historial de notas

### Datos Guardados

Cada solicitud guarda:
- `customer_name`: nombre del cliente
- `customer_email`: email del cliente
- `vehicle_plate`: patente normalizada (ej: ABCD-12)
- `fine_count`: cantidad total de multas
- `prescribed_count`: cantidad de multas prescritas
- `total_amount_utm`: monto total en UTM (usando solo "MONTO MULTA-MONEDA")
- `utm_value_clp`: valor del UTM en pesos (desde UTM_CLP en .env.local)
- `raw_analysis_json`: análisis completo del PDF
- `status`: estado interno (pending, approved, paid, rejected)
- `payment_status`: estado del pago (pending, approved, failed)
- `internal_notes`: notas internas del administrador

## Seguridad

- Login con usuario/contraseña simple (contraseña hasheada con SHA256)
- Token de sesión guardado en localStorage
- No usar en producción sin HTTPS
- Para mayor seguridad en producción, considerar:
  - Cambiar a OAuth o Magic Links
  - Implementar RLS (Row Level Security) en Supabase
  - Usar JWT tokens más robustos

## Instalación en Vercel

1. Agregar variables de entorno en Vercel:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD_HASH=... (generado con scripts/generate-password-hash.js)
   UTM_CLP=65000
   ```

2. Deploy normal con `git push`

3. Acceder a `https://tu-dominio.com/admin`

## Troubleshooting

### "Error al conectar a Supabase"
- Verificar que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` están correctas
- Verificar que las tablas existen en Supabase (revisar en SQL Editor)

### "Credenciales inválidas"
- Verificar que `ADMIN_USERNAME` es correcto
- Regenerar el hash con `node scripts/generate-password-hash.js "password"`

### Solicitudes no se guardan en BD
- Las solicitudes se guardan en background (no bloquean la respuesta)
- Revisar logs en Vercel o console.log en desarrollo
- Si `NEXT_PUBLIC_SUPABASE_URL` no está definido, el guardado no ocurre

## Cálculo de Multas

El cálculo usa **solo** el campo "MONTO MULTA-MONEDA" del certificado RMNP:
- Ejemplo: "1,00 UTM" → se guarda como `total_amount_utm = 1.00`
- NO se usan: ARANCEL, TOTAL, roles, fechas, números sueltos
- El valor en CLP se calcula: `total_amount_utm * utm_value_clp`
- El `utm_value_clp` viene de la variable de entorno `UTM_CLP`

## Notas sobre Compatibilidad

- Compatible con Next.js 15+
- Compatible con Supabase Free tier
- Compatible con Vercel (sin archivos locales)
- Compatible con PostgreSQL de Supabase
- Los datos se sincronizan automáticamente con el análisis de PDF
