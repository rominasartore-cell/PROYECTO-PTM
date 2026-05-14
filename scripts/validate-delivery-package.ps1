param(
  [Parameter(Mandatory=$true)]
  [string]$RequestId
)

$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $PSScriptRoot
$deliveryDir = Join-Path $project "docs\deliveries\$RequestId"
$reportFile = Join-Path $deliveryDir "VALIDACION_ENTREGA.md"
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Write-Utf8File($path, $content) {
  [System.IO.File]::WriteAllText($path, $content, $utf8)
}

function Read-TextFile($path) {
  return [System.IO.File]::ReadAllText($path)
}

if (!([System.IO.Directory]::Exists($deliveryDir))) {
  Write-Host "ERROR: No existe carpeta de entrega:"
  Write-Host $deliveryDir
  exit 1
}

$requiredFiles = @(
  "informe.md",
  "instructivo.md",
  "checklist.md",
  "README_ENTREGA.md",
  "delivery-data.json"
)

$missingFiles = @()

foreach ($file in $requiredFiles) {
  $path = Join-Path $deliveryDir $file

  if (!([System.IO.File]::Exists($path))) {
    $missingFiles += $file
  }
}

$mdFiles = [System.IO.Directory]::GetFiles($deliveryDir, "*.md")
$pending = @()

foreach ($file in $mdFiles) {
  $content = Read-TextFile $file
  $matches = [System.Text.RegularExpressions.Regex]::Matches($content, "\{\{[^}]+\}\}")

  foreach ($match in $matches) {
    $item = New-Object PSObject
    $item | Add-Member -MemberType NoteProperty -Name File -Value ([System.IO.Path]::GetFileName($file))
    $item | Add-Member -MemberType NoteProperty -Name Field -Value $match.Value
    $pending += $item
  }
}

$uniquePending = $pending | Sort-Object File, Field -Unique

$criticalPatterns = @(
  "{{NOMBRE_SOLICITANTE}}",
  "{{EMAIL_SOLICITANTE}}",
  "{{PATENTE}}",
  "{{ROL_CAUSA}}",
  "{{COMUNA_TRIBUNAL}}",
  "{{MONTO_MULTA_UTM}}",
  "{{INFRACCION}}",
  "{{FECHA_INGRESO_RMNP}}"
)

$criticalPending = @()

foreach ($item in $uniquePending) {
  foreach ($critical in $criticalPatterns) {
    if ($item.Field -eq $critical) {
      $criticalPending += $item
    }
  }
}

$status = "APROBADO"

if ($missingFiles.Count -gt 0 -or $criticalPending.Count -gt 0) {
  $status = "FALLIDO"
} elseif ($uniquePending.Count -gt 0) {
  $status = "OBSERVADO"
}

$lines = @()
$lines += "# VALIDACION DE PAQUETE DE ENTREGA PTM"
$lines += ""
$lines += "**Solicitud:** $RequestId"
$lines += "**Fecha validacion:** $(Get-Date -Format "dd-MM-yyyy HH:mm")"
$lines += "**Estado:** $status"
$lines += ""
$lines += "---"
$lines += ""
$lines += "## 1. Archivos obligatorios"
$lines += ""

if ($missingFiles.Count -eq 0) {
  $lines += "- OK: No faltan archivos obligatorios."
} else {
  foreach ($file in $missingFiles) {
    $lines += "- FALTA: $file"
  }
}

$lines += ""
$lines += "## 2. Campos variables pendientes"
$lines += ""

if ($uniquePending.Count -eq 0) {
  $lines += "- OK: No quedan campos pendientes."
} else {
  foreach ($item in $uniquePending) {
    $lines += "- $($item.File): $($item.Field)"
  }
}

$lines += ""
$lines += "## 3. Campos criticos pendientes"
$lines += ""

if ($criticalPending.Count -eq 0) {
  $lines += "- OK: No quedan campos criticos pendientes."
} else {
  foreach ($item in $criticalPending) {
    $lines += "- CRITICO: $($item.File): $($item.Field)"
  }
}

$lines += ""
$lines += "## 4. Resultado"
$lines += ""

if ($status -eq "APROBADO") {
  $lines += "Paquete apto para revision final y eventual entrega."
} elseif ($status -eq "OBSERVADO") {
  $lines += "Paquete sin campos criticos pendientes, pero aun contiene variables menores por revisar."
} else {
  $lines += "Paquete NO apto para entrega. Completar campos criticos o archivos faltantes."
}

Write-Utf8File $reportFile ($lines -join "`r`n")

Write-Host ""
Write-Host "VALIDACION PTM"
Write-Host "Solicitud: $RequestId"
Write-Host "Estado: $status"
Write-Host ""
Write-Host "Campos pendientes: $($uniquePending.Count)"
Write-Host "Campos criticos pendientes: $($criticalPending.Count)"
Write-Host "Archivos faltantes: $($missingFiles.Count)"
Write-Host ""
Write-Host "Reporte:"
Write-Host $reportFile
Write-Host ""

if ($status -eq "FALLIDO") {
  exit 1
}

exit 0