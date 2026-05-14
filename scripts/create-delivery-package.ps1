param(
  [Parameter(Mandatory=$true)]
  [string]$RequestId,

  [Parameter(Mandatory=$true)]
  [string]$Nombre,

  [Parameter(Mandatory=$true)]
  [string]$Email,

  [Parameter(Mandatory=$true)]
  [string]$Patente,

  [Parameter(Mandatory=$false)]
  [int]$MultasPrescritas = 1,

  [Parameter(Mandatory=$false)]
  [string]$TotalMultas = "",

  [Parameter(Mandatory=$false)]
  [string]$MontoReferencial = ""
)

$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $PSScriptRoot
$templateDir = Join-Path $project "docs\templates"
$deliveryRoot = Join-Path $project "docs\deliveries"
$deliveryDir = Join-Path $deliveryRoot $RequestId
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Write-Utf8File($path, $content) {
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

function Read-File($path) {
  return [System.IO.File]::ReadAllText($path)
}

function Replace-BaseFields($content) {
  $fecha = Get-Date -Format "dd-MM-yyyy"

  $content = $content.Replace("{{REQUEST_ID}}", $RequestId)
  $content = $content.Replace("{{NOMBRE_CLIENTE}}", $Nombre)
  $content = $content.Replace("{{NOMBRE_SOLICITANTE}}", $Nombre)
  $content = $content.Replace("{{EMAIL_CLIENTE}}", $Email)
  $content = $content.Replace("{{EMAIL_SOLICITANTE}}", $Email)
  $content = $content.Replace("{{PATENTE}}", $Patente)
  $content = $content.Replace("{{FECHA_INFORME}}", $fecha)
  $content = $content.Replace("{{FECHA_PRESENTACION}}", $fecha)
  $content = $content.Replace("{{FECHA_COMPRA}}", $fecha)

  if ($TotalMultas -ne "") {
    $content = $content.Replace("{{TOTAL_MULTAS}}", $TotalMultas)
  }

  if ($MultasPrescritas -gt 0) {
    $content = $content.Replace("{{TOTAL_POTENCIALMENTE_PRESCRITAS}}", [string]$MultasPrescritas)
  }

  if ($TotalMultas -ne "" -and $MultasPrescritas -gt 0) {
    $noPrescritas = 0
    try {
      $noPrescritas = [int]$TotalMultas - $MultasPrescritas
      if ($noPrescritas -lt 0) { $noPrescritas = 0 }
      $content = $content.Replace("{{TOTAL_NO_PRESCRITAS}}", [string]$noPrescritas)
    } catch {
      $content = $content.Replace("{{TOTAL_NO_PRESCRITAS}}", "")
    }
  }

  if ($MontoReferencial -ne "") {
    $content = $content.Replace("{{MONTO_REFERENCIAL_PRESCRITO}}", $MontoReferencial)
  }

  return $content
}

if (!([System.IO.Directory]::Exists($templateDir))) {
  throw "No existe carpeta de plantillas: $templateDir"
}

if (!([System.IO.Directory]::Exists($deliveryRoot))) {
  [System.IO.Directory]::CreateDirectory($deliveryRoot) | Out-Null
}

if (!([System.IO.Directory]::Exists($deliveryDir))) {
  [System.IO.Directory]::CreateDirectory($deliveryDir) | Out-Null
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
  $content = Replace-BaseFields $content
  Write-Utf8File $outputPath $content
}

$solicitudTemplate = Join-Path $templateDir "solicitud-prescripcion.md"

if (!([System.IO.File]::Exists($solicitudTemplate))) {
  throw "Falta plantilla de solicitud: $solicitudTemplate"
}

$solicitudBase = Read-File $solicitudTemplate
$solicitudBase = Replace-BaseFields $solicitudBase

$solicitudGeneral = Join-Path $deliveryDir "solicitud-prescripcion-base.md"
Write-Utf8File $solicitudGeneral $solicitudBase

for ($i = 1; $i -le $MultasPrescritas; $i++) {
  $num = "{0:D2}" -f $i
  $outFile = Join-Path $deliveryDir "solicitud-prescripcion-multa-$num.md"

  $content = $solicitudBase
  $content = $content.Replace("{{ROL_CAUSA}}", "{{ROL_CAUSA_MULTA_$num}}")
  $content = $content.Replace("{{COMUNA_TRIBUNAL}}", "{{COMUNA_TRIBUNAL_MULTA_$num}}")
  $content = $content.Replace("{{NUMERO_TRIBUNAL}}", "{{NUMERO_TRIBUNAL_MULTA_$num}}")
  $content = $content.Replace("{{MONTO_MULTA_UTM}}", "{{MONTO_MULTA_UTM_$num}}")
  $content = $content.Replace("{{INFRACCION}}", "{{INFRACCION_MULTA_$num}}")
  $content = $content.Replace("{{FECHA_INGRESO_RMNP}}", "{{FECHA_INGRESO_RMNP_MULTA_$num}}")

  Write-Utf8File $outFile $content
}

$readmePath = Join-Path $deliveryDir "README_ENTREGA.md"

$readme = @"
# Paquete de entrega PTM

**Solicitud:** $RequestId  
**Cliente:** $Nombre  
**Correo:** $Email  
**Patente:** $Patente  
**Multas potencialmente prescritas:** $MultasPrescritas  

## Archivos generados

- informe.md
- instructivo.md
- checklist.md
- solicitud-prescripcion-base.md
- solicitud-prescripcion-multa-01.md ... según cantidad de multas prescritas

## Completar manualmente por cada multa

En cada archivo solicitud-prescripcion-multa-XX.md reemplazar:

- {{COMUNA_TRIBUNAL_MULTA_XX}}
- {{NUMERO_TRIBUNAL_MULTA_XX}}
- {{ROL_CAUSA_MULTA_XX}}
- {{MONTO_MULTA_UTM_XX}}
- {{INFRACCION_MULTA_XX}}
- {{FECHA_INGRESO_RMNP_MULTA_XX}}

## Completar datos del solicitante si faltan

- {{PROFESION_OFICIO}}
- {{DOMICILIO_SOLICITANTE}}
- {{COMUNA_SOLICITANTE}}
- {{DOCUMENTOS_ADICIONALES}}

## Recordatorio

No subir esta carpeta a GitHub. Contiene datos de cliente.
"@

Write-Utf8File $readmePath $readme

Write-Host ""
Write-Host "OK: paquete de entrega creado"
Write-Host $deliveryDir
Write-Host ""
cmd /c dir "$deliveryDir"