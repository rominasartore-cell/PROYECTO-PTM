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

function Get-PropValue($object, [string[]]$names, $fallback) {
  if ($null -eq $object) {
    return $fallback
  }

  foreach ($name in $names) {
    foreach ($prop in $object.PSObject.Properties) {
      if ($prop.Name -eq $name) {
        $value = $prop.Value

        if ($null -ne $value) {
          $text = "$value".Trim()

          if ($text -ne "") {
            return $text
          }
        }
      }
    }
  }

  return $fallback
}

function Get-ArrayValue($object, [string[]]$names) {
  if ($null -eq $object) {
    return @()
  }

  foreach ($name in $names) {
    foreach ($prop in $object.PSObject.Properties) {
      if ($prop.Name -eq $name) {
        $value = $prop.Value

        if ($null -eq $value) {
          return @()
        }

        if ($value -is [System.Array]) {
          return $value
        }

        return @($value)
      }
    }
  }

  return @()
}

function Replace-All($content, $map) {
  foreach ($key in $map.Keys) {
    $content = $content.Replace($key, $map[$key])
  }

  return $content
}

function Build-FineLine($fine, $index) {
  $rol = Get-PropValue $fine @("rolCausa", "rol", "role", "caseRole") ("Multa " + $index)
  $tribunal = Get-PropValue $fine @("tribunal", "court", "juzgado", "comunaTribunal", "courtName") "Tribunal no informado"
  $fecha = Get-PropValue $fine @("fechaIngresoRmnp", "rmnpDate", "fechaRmnp", "date") "Fecha no informada"
  $monto = Get-PropValue $fine @("montoMultaUtm", "amountUtm", "monto", "amount") "Monto no informado"
  $estado = Get-PropValue $fine @("estado", "status") "Potencialmente prescrita"

  return "- Rol $rol, $tribunal, ingreso RMNP $fecha, monto $monto, estado: $estado."
}

function Build-EmptyLine($text) {
  return "- $text"
}

function Build-RowMap($fine, $index) {
  $prefix = "$index"

  $tribunal = Get-PropValue $fine @("tribunal", "court", "juzgado", "comunaTribunal", "courtName") "Tribunal no informado"
  $rol = Get-PropValue $fine @("rolCausa", "rol", "role", "caseRole") "Rol no informado"
  $fecha = Get-PropValue $fine @("fechaIngresoRmnp", "rmnpDate", "fechaRmnp", "date") "Fecha no informada"
  $monto = Get-PropValue $fine @("montoMultaUtm", "amountUtm", "monto", "amount") "Monto no informado"
  $estado = Get-PropValue $fine @("estado", "status") "Potencialmente prescrita"
  $observacion = Get-PropValue $fine @("observacion", "observation", "note") "Revisar antecedentes y fecha de ingreso al RMNP."

  $map = @{}
  $map["{{TRIBUNAL_$prefix}}"] = $tribunal
  $map["{{ROL_$prefix}}"] = $rol
  $map["{{FECHA_$prefix}}"] = $fecha
  $map["{{MONTO_$prefix}}"] = $monto
  $map["{{ESTADO_$prefix}}"] = $estado
  $map["{{OBSERVACION_$prefix}}"] = $observacion

  return $map
}

function Add-Map($target, $source) {
  foreach ($key in $source.Keys) {
    $target[$key] = $source[$key]
  }
}

if (!([System.IO.Directory]::Exists($deliveryDir))) {
  [System.IO.Directory]::CreateDirectory($deliveryDir) | Out-Null
}

if (!([System.IO.File]::Exists($dataFile))) {
  throw "No existe delivery-data.json. Crealo primero en: $dataFile"
}

if (!([System.IO.Directory]::Exists($templateDir))) {
  throw "No existe carpeta de plantillas: $templateDir"
}

$data = Get-Content $dataFile | ConvertFrom-Json

$nombre = Get-PropValue $data @("nombreCliente", "customerName", "customer_name", "name") "{{NOMBRE_CLIENTE}}"
$email = Get-PropValue $data @("emailCliente", "customerEmail", "customer_email", "email") "{{EMAIL_CLIENTE}}"
$patente = Get-PropValue $data @("patente", "plate") "{{PATENTE}}"
$fechaInforme = Get-PropValue $data @("fechaInforme", "reportDate") (Get-Date -Format "dd-MM-yyyy")
$fechaCompra = Get-PropValue $data @("fechaCompra", "purchaseDate") "{{FECHA_COMPRA}}"
$fechaCertificado = Get-PropValue $data @("fechaCertificado", "certificateDate") $fechaInforme
$totalMultas = Get-PropValue $data @("totalMultas", "totalFines") "{{TOTAL_MULTAS}}"
$totalPrescritas = Get-PropValue $data @("totalPotencialmentePrescritas", "prescribedCount", "potentiallyPrescribed") "{{TOTAL_POTENCIALMENTE_PRESCRITAS}}"
$totalNoPrescritas = Get-PropValue $data @("totalNoPrescritas", "nonPrescribedCount") "{{TOTAL_NO_PRESCRITAS}}"
$montoReferencial = Get-PropValue $data @("montoReferencialPrescrito", "potentialAmount", "amount") "{{MONTO_REFERENCIAL_PRESCRITO}}"

$rut = Get-PropValue $data @("rutSolicitante", "rut") "{{RUT_SOLICITANTE}}"
$profesion = Get-PropValue $data @("profesionOficio", "profession") "{{PROFESION_OFICIO}}"
$domicilio = Get-PropValue $data @("domicilioSolicitante", "address") "{{DOMICILIO_SOLICITANTE}}"
$comunaSolicitante = Get-PropValue $data @("comunaSolicitante", "commune") "{{COMUNA_SOLICITANTE}}"
$documentosAdicionales = Get-PropValue $data @("documentosAdicionales", "additionalDocuments") "{{DOCUMENTOS_ADICIONALES}}"
$observacionesInternas = Get-PropValue $data @("observacionesInternas", "internalNotes") "Sin observaciones internas."

$numeroTribunalDefault = Get-PropValue $data @("numeroTribunal", "courtNumber") "2"

$multas = Get-ArrayValue $data @("multasPrescritas", "prescribedFines", "potentiallyPrescribedFines")
$multasNoPrescritas = Get-ArrayValue $data @("multasNoPrescritas", "nonPrescribedFines", "vigentes", "notPrescribedFines")

$listadoPrescritas = @()
$listadoNoPrescritas = @()

$idx = 1
foreach ($multa in $multas) {
  $listadoPrescritas += Build-FineLine $multa $idx
  $idx++
}

$idx = 1
foreach ($multa in $multasNoPrescritas) {
  $listadoNoPrescritas += Build-FineLine $multa $idx
  $idx++
}

if ($listadoPrescritas.Count -eq 0) {
  $listadoPrescritas += Build-EmptyLine "No se informaron multas potencialmente prescritas."
}

if ($listadoNoPrescritas.Count -eq 0) {
  $listadoNoPrescritas += Build-EmptyLine "No se informaron multas no prescritas o vigentes en esta entrega."
}

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
  "{{FECHA_CERTIFICADO}}" = $fechaCertificado
  "{{TOTAL_MULTAS}}" = $totalMultas
  "{{TOTAL_POTENCIALMENTE_PRESCRITAS}}" = $totalPrescritas
  "{{TOTAL_NO_PRESCRITAS}}" = $totalNoPrescritas
  "{{MONTO_REFERENCIAL_PRESCRITO}}" = $montoReferencial
  "{{RUT_SOLICITANTE}}" = $rut
  "{{PROFESION_OFICIO}}" = $profesion
  "{{DOMICILIO_SOLICITANTE}}" = $domicilio
  "{{COMUNA_SOLICITANTE}}" = $comunaSolicitante
  "{{DOCUMENTOS_ADICIONALES}}" = $documentosAdicionales
  "{{OBSERVACIONES_INTERNAS}}" = $observacionesInternas
  "{{LISTADO_MULTAS_POTENCIALMENTE_PRESCRITAS}}" = ($listadoPrescritas -join "`r`n")
  "{{LISTADO_MULTAS_NO_PRESCRITAS}}" = ($listadoNoPrescritas -join "`r`n")
}

if ($multas.Count -ge 1) {
  Add-Map $baseMap (Build-RowMap $multas[0] 1)
} else {
  $emptyFine = New-Object PSObject
  Add-Map $baseMap (Build-RowMap $emptyFine 1)
}

if ($multas.Count -ge 2) {
  Add-Map $baseMap (Build-RowMap $multas[1] 2)
} else {
  $emptyFine2 = New-Object PSObject
  Add-Map $baseMap (Build-RowMap $emptyFine2 2)
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

$firstSolicitudContent = $solicitudBase

if ($multas.Count -eq 0) {
  $multas = @(
    @{
      comunaTribunal = "Comuna no informada"
      numeroTribunal = $numeroTribunalDefault
      rolCausa = "Rol no informado"
      montoMultaUtm = "Monto no informado"
      infraccion = "Infraccion no informada"
      fechaIngresoRmnp = "Fecha no informada"
    }
  )
}

$counter = 1

foreach ($multa in $multas) {
  $numeroRaw = Get-PropValue $multa @("numero", "number", "index") ""
  $parsed = 0

  if ([int]::TryParse($numeroRaw, [ref]$parsed)) {
    $num = "{0:D2}" -f $parsed
  } else {
    $num = "{0:D2}" -f $counter
  }

  $fineMap = @{
    "{{COMUNA_TRIBUNAL}}" = Get-PropValue $multa @("comunaTribunal", "comuna", "tribunalCommune", "courtCommune") "Comuna no informada"
    "{{NUMERO_TRIBUNAL}}" = Get-PropValue $multa @("numeroTribunal", "courtNumber") $numeroTribunalDefault
    "{{ROL_CAUSA}}" = Get-PropValue $multa @("rolCausa", "rol", "role", "caseRole") "Rol no informado"
    "{{MONTO_MULTA_UTM}}" = Get-PropValue $multa @("montoMultaUtm", "amountUtm", "monto", "amount") "Monto no informado"
    "{{INFRACCION}}" = Get-PropValue $multa @("infraccion", "infraction") "Infraccion no informada"
    "{{FECHA_INGRESO_RMNP}}" = Get-PropValue $multa @("fechaIngresoRmnp", "rmnpDate", "fechaRmnp", "date") "Fecha no informada"
  }

  $content = $solicitudBase
  $content = Replace-All $content $fineMap

  if ($counter -eq 1) {
    $firstSolicitudContent = $content
  }

  $outFile = Join-Path $deliveryDir "solicitud-prescripcion-multa-$num.md"
  Write-Utf8File $outFile $content

  $counter++
}

Write-Utf8File (Join-Path $deliveryDir "solicitud-prescripcion-base.md") $firstSolicitudContent

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

## Fuente

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
