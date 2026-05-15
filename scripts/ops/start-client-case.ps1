param(
  [Parameter(Mandatory=$true)]
  [string]$RequestId,

  [Parameter(Mandatory=$false)]
  [string]$ClientEmail = "",

  [Parameter(Mandatory=$false)]
  [string]$Plate = ""
)

$ErrorActionPreference = "Stop"

function Write-Box($text) {
  Write-Host ""
  Write-Host "============================================================"
  Write-Host (" " + $text)
  Write-Host "============================================================"
}

function Find-ProjectRoot {
  $dir = Split-Path -Parent $PSCommandPath
  while ($dir -and (Test-Path $dir)) {
    $package = Join-Path $dir "package.json"
    $src = Join-Path $dir "src"
    if ((Test-Path $package) -and (Test-Path $src)) {
      return $dir
    }
    $parent = Split-Path -Parent $dir
    if ($parent -eq $dir) { break }
    $dir = $parent
  }
  throw "No se pudo detectar la raiz del proyecto PTM."
}

Write-Box "PTM - INICIAR CARPETA OPERATIVA CLIENTE"

$projectRoot = Find-ProjectRoot
Set-Location $projectRoot

$clientRoot = Join-Path $projectRoot ("docs\operations\clientes\" + $RequestId)
$adminDir = Join-Path $clientRoot "01_admin_json"
$clientDataDir = Join-Path $clientRoot "02_client_data"
$deliveryDir = Join-Path $clientRoot "03_delivery_zip"
$reviewDir = Join-Path $clientRoot "04_revision"
$sendDir = Join-Path $clientRoot "05_envio"
$logsDir = Join-Path $clientRoot "logs"

$dirs = @($clientRoot, $adminDir, $clientDataDir, $deliveryDir, $reviewDir, $sendDir, $logsDir)
foreach ($d in $dirs) {
  if (!(Test-Path $d)) {
    New-Item -ItemType Directory -Path $d -Force | Out-Null
  }
}

$trackingPath = Join-Path $clientRoot "SEGUIMIENTO_CLIENTE.md"
$commandsPath = Join-Path $clientRoot "COMANDOS_ENTREGA.md"
$readmePath = Join-Path $clientRoot "README.md"
$now = Get-Date -Format "dd-MM-yyyy HH:mm"

$trackingLines = @()
$trackingLines += "# PTM - Seguimiento cliente"
$trackingLines += ""
$trackingLines += "## Identificacion"
$trackingLines += ""
$trackingLines += ("- RequestId: " + $RequestId)
$trackingLines += "- Cliente:"
$trackingLines += ("- Correo: " + $ClientEmail)
$trackingLines += ("- Patente: " + $Plate)
$trackingLines += ("- Fecha apertura: " + $now)
$trackingLines += "- Estado: abierto"
$trackingLines += ""
$trackingLines += "## Pago"
$trackingLines += ""
$trackingLines += "- [ ] Pago aprobado"
$trackingLines += "- [ ] RequestId confirmado"
$trackingLines += "- [ ] Correo coincide"
$trackingLines += "- [ ] Patente coincide"
$trackingLines += ""
$trackingLines += "## Datos postpago"
$trackingLines += ""
$trackingLines += "- [ ] Cliente completo formulario de datos"
$trackingLines += "- [ ] RUT revisado"
$trackingLines += "- [ ] Domicilio revisado"
$trackingLines += "- [ ] Comuna revisada"
$trackingLines += "- [ ] Profesion/oficio revisado"
$trackingLines += ""
$trackingLines += "## Generacion entrega"
$trackingLines += ""
$trackingLines += "- [ ] JSON admin guardado en 01_admin_json"
$trackingLines += "- [ ] Generador unico ejecutado"
$trackingLines += "- [ ] ZIP copiado en 03_delivery_zip"
$trackingLines += ""
$trackingLines += "## Control calidad"
$trackingLines += ""
$trackingLines += "- [ ] Validacion APROBADO"
$trackingLines += "- [ ] Auditoria APROBADO"
$trackingLines += "- [ ] Hallazgos 0"
$trackingLines += "- [ ] Revision visual realizada"
$trackingLines += ""
$trackingLines += "## Envio"
$trackingLines += ""
$trackingLines += "- [ ] Correo documentos listos enviado"
$trackingLines += "- [ ] Cliente notificado"
$trackingLines += "- [ ] Registro interno actualizado"
$trackingLines += ""
$trackingLines += "## Observaciones"
$trackingLines += ""
$trackingLines += "-"
$trackingLines | Set-Content -Path $trackingPath -Encoding UTF8

$adminJsonRel = ".\docs\operations\clientes\" + $RequestId + "\01_admin_json\admin-request-" + $RequestId + ".json"
$q = [char]34
$deliveryCommand = ".\scripts\ops\generate-real-delivery.ps1 -RequestId " + $q + $RequestId + $q + " -AdminJsonPath " + $q + $adminJsonRel + $q

$commandsLines = @()
$commandsLines += "# PTM - Comandos entrega cliente"
$commandsLines += ""
$commandsLines += "RequestId:"
$commandsLines += $RequestId
$commandsLines += ""
$commandsLines += "1. Guardar JSON admin en:"
$commandsLines += $adminDir
$commandsLines += ""
$commandsLines += "Nombre recomendado:"
$commandsLines += ("admin-request-" + $RequestId + ".json")
$commandsLines += ""
$commandsLines += "2. Generar entrega desde la raiz del proyecto:"
$commandsLines += $deliveryCommand
$commandsLines += ""
$commandsLines += "3. Revisar salida principal en:"
$commandsLines += (".\docs\deliveries\" + $RequestId)
$commandsLines += ""
$commandsLines += "4. Copiar ZIP final a:"
$commandsLines += $deliveryDir
$commandsLines | Set-Content -Path $commandsPath -Encoding UTF8

$readmeLines = @()
$readmeLines += "# PTM - Carpeta operativa cliente"
$readmeLines += ""
$readmeLines += "Esta carpeta sirve para ordenar la operacion de una solicitud pagada."
$readmeLines += ""
$readmeLines += "Carpetas:"
$readmeLines += "- 01_admin_json: guardar JSON admin de la solicitud."
$readmeLines += "- 02_client_data: respaldos de datos postpago si corresponde."
$readmeLines += "- 03_delivery_zip: copiar ZIP final revisado."
$readmeLines += "- 04_revision: notas de revision visual."
$readmeLines += "- 05_envio: constancias de envio o correos."
$readmeLines += "- logs: salidas o reportes de comandos."
$readmeLines += ""
$readmeLines += "No subir esta carpeta a Git."
$readmeLines | Set-Content -Path $readmePath -Encoding UTF8

Write-Host ""
Write-Host "[OK] Carpeta operativa creada:"
Write-Host $clientRoot
Write-Host ""
Write-Host "[OK] Archivos creados:"
Write-Host $trackingPath
Write-Host $commandsPath
Write-Host $readmePath
Write-Host ""
Write-Host "Siguiente: guardar JSON admin en 01_admin_json y ejecutar comando de COMANDOS_ENTREGA.md"

Write-Box "PTM - CLIENTE OPERATIVO INICIADO"
