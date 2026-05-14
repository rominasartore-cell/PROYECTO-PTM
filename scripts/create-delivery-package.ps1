param(
  [Parameter(Mandatory=$true)]
  [string]$RequestId
)

$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $PSScriptRoot
$templateDir = Join-Path $project "docs\templates"
$deliveryRoot = Join-Path $project "docs\deliveries"
$deliveryDir = Join-Path $deliveryRoot $RequestId
$dataFile = Join-Path $deliveryDir "delivery-data.json"
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Read-File($path) {
  return [System.IO.File]::ReadAllText($path)
}

function Write-Utf8File($path, $content) {
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

function Value-Or-Marker($value, $marker) {
  if ($null -eq $value) {
    return $marker
  }

  $text = "$value".Trim()

  if ($text -eq "") {
    return $marker
  }

  return $text
}

function Replace-All($content, $map) {
  foreach ($key in $map.Keys) {
    $content = $content.Replace($key, $map[$key])
  }

  return $content
}

if (!([System.IO.Directory]::Exists($deliveryDir))) {
  [System.IO.Directory]::CreateDirectory($deliveryDir) | Out-Null
}

if (!([System.IO.File]::Exists($dataFile))) {
  throw "No existe delivery-data.json. Créalo primero en: $dataFile"
}

if (!([System.IO.Directory]::Exists($templateDir))) {
  throw "No existe carpeta de plantillas: $templateDir"
}

$data = Get-Content $dataFile | ConvertFrom-Json

$nombre = Value-Or-Marker $data.nombreCliente "{{NOMBRE_CLIENTE}}"
$email = Value-Or-Marker $data.emailCliente "{{EMAIL_CLIENTE}}"
$patente = Value-Or-Marker $data.patente "{{PATENTE}}"
$fechaInforme = Value-Or-Marker $data.fechaInforme (Get-Date -Format "dd-MM-yyyy")
$fechaCompra = Value-Or-Marker $data.fechaCompra "{{FECHA_COMPRA}}"
$totalMultas = Value-Or-Marker $data.totalMultas "{{TOTAL_MULTAS}}"
$totalPrescritas = Value-Or-Marker $data.totalPotencialmentePrescritas "{{TOTAL_POTENCIALMENTE_PRESCRITAS}}"
$totalNoPrescritas = Value-Or-Marker $data.totalNoPrescritas "{{TOTAL_NO_PRESCRITAS}}"
$montoReferencial = Value-Or-Marker $data.montoReferencialPrescrito "{{MONTO_REFERENCIAL_PRESCRITO}}"

$rut = Value-Or-Marker $data.rutSolicitante "{{RUT_SOLICITANTE}}"
$profesion = Value-Or-Marker $data.profesionOficio "{{PROFESION_OFICIO}}"
$domicilio = Value-Or-Marker $data.domicilioSolicitante "{{DOMICILIO_SOLICITANTE}}"
$comunaSolicitante = Value-Or-Marker $data.comunaSolicitante "{{COMUNA_SOLICITANTE}}"
$documentosAdicionales = Value-Or-Marker $data.documentosAdicionales "{{DOCUMENTOS_ADICIONALES}}"

$baseMap = @{
  "{{REQUEST_ID}}" = $RequestId
  "{{NOMBRE_CLIENTE}}" = $nombre
  "{{NOMBRE_SOLICITANTE}}" = $nombre
  "{{EMAIL_CLIENTE}}" = $email
  "{{EMAIL_SOLICITANTE}}" = $email
  "{{PATENTE}}" = $patente
  "{{FECHA_INFORME}}" = $fechaInforme
  "{{FECHA_PRESENTACION}}" = $fechaInforme
  "{{FECHA_COMPRA}}" = $fechaCompra
  "{{TOTAL_MULTAS}}" = $totalMultas
  "{{TOTAL_POTENCIALMENTE_PRESCRITAS}}" = $totalPrescritas
  "{{TOTAL_NO_PRESCRITAS}}" = $totalNoPrescritas
  "{{MONTO_REFERENCIAL_PRESCRITO}}" = $montoReferencial
  "{{RUT_SOLICITANTE}}" = $rut
  "{{PROFESION_OFICIO}}" = $profesion
  "{{DOMICILIO_SOLICITANTE}}" = $domicilio
  "{{COMUNA_SOLICITANTE}}" = $comunaSolicitante
  "{{DOCUMENTOS_ADICIONALES}}" = $documentosAdicionales
}

$templates = @{
  "informe-analisis-prescripcion.md" = "informe.md"
  "instructivo-tramitacion-personal.md" = "instructivo.md"
  "checklist-entrega-admin.md" = "checklist.md"
}

foreach ($templateName in $templates.Keys) {
  $templatePath = Join-Path $templateDir $templateName
  $outputPath = Join-Path $deliveryDir $templates[$templateName]

  if (!([System.IO.File]::Exists($templatePath))) {
    throw "Falta plantilla: $templatePath"
  }

  $content = Read-File $templatePath
  $content = Replace-All $content $baseMap
  Write-Utf8File $outputPath $content
}

$solicitudTemplate = Join-Path $templateDir "solicitud-prescripcion.md"

if (!([System.IO.File]::Exists($solicitudTemplate))) {
  throw "Falta plantilla: $solicitudTemplate"
}

$solicitudBase = Read-File $solicitudTemplate
$solicitudBase = Replace-All $solicitudBase $baseMap

Write-Utf8File (Join-Path $deliveryDir "solicitud-prescripcion-base.md") $solicitudBase

$multas = @()

if ($null -ne $data.multasPrescritas) {
  if ($data.multasPrescritas -is [System.Array]) {
    $multas = $data.multasPrescritas
  } else {
    $multas = @($data.multasPrescritas)
  }
}

if ($multas.Count -eq 0) {
  $multas = @(
    @{
      numero = "01"
      comunaTribunal = ""
      numeroTribunal = ""
      rolCausa = ""
      montoMultaUtm = ""
      infraccion = ""
      fechaIngresoRmnp = ""
    }
  )
}

foreach ($multa in $multas) {
  $numero = Value-Or-Marker $multa.numero "01"
  $num = "{0:D2}" -f [int]$numero

  $fineMap = @{
    "{{COMUNA_TRIBUNAL}}" = Value-Or-Marker $multa.comunaTribunal "{{COMUNA_TRIBUNAL}}"
    "{{NUMERO_TRIBUNAL}}" = Value-Or-Marker $multa.numeroTribunal "{{NUMERO_TRIBUNAL}}"
    "{{ROL_CAUSA}}" = Value-Or-Marker $multa.rolCausa "{{ROL_CAUSA}}"
    "{{MONTO_MULTA_UTM}}" = Value-Or-Marker $multa.montoMultaUtm "{{MONTO_MULTA_UTM}}"
    "{{INFRACCION}}" = Value-Or-Marker $multa.infraccion "{{INFRACCION}}"
    "{{FECHA_INGRESO_RMNP}}" = Value-Or-Marker $multa.fechaIngresoRmnp "{{FECHA_INGRESO_RMNP}}"
  }

  $content = $solicitudBase
  $content = Replace-All $content $fineMap

  $outFile = Join-Path $deliveryDir "solicitud-prescripcion-multa-$num.md"
  Write-Utf8File $outFile $content
}

$readme = @"
# Paquete de entrega PTM

**Solicitud:** $RequestId  
**Cliente:** $nombre  
**Correo:** $email  
**Patente:** $patente  
**Total multas:** $totalMultas  
**Multas potencialmente prescritas:** $totalPrescritas  
**Monto referencial:** $montoReferencial  

## Archivos generados

- informe.md
- instructivo.md
- checklist.md
- solicitud-prescripcion-base.md
- solicitud-prescripcion-multa-XX.md

## Fuente de datos

Este paquete fue generado desde:

- delivery-data.json
- docs/templates/

## Campos pendientes

Buscar marcadores con:

Select-String -Path ".\docs\deliveries\$RequestId\*.md" -Pattern "{{"

## Seguridad

No subir docs/deliveries/ a GitHub. Contiene datos de cliente.
"@

Write-Utf8File (Join-Path $deliveryDir "README_ENTREGA.md") $readme

Write-Host ""
Write-Host "OK: paquete generado desde delivery-data.json"
Write-Host $deliveryDir
Write-Host ""
cmd /c dir "$deliveryDir"