param(
  [Parameter(Mandatory=$true)]
  [string]$RequestId
)

$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $PSScriptRoot
$deliveryDir = Join-Path $project "docs\deliveries\$RequestId"
$exportDir = Join-Path $deliveryDir "EXPORT"
$reportFile = Join-Path $deliveryDir "AUDITORIA_ENTREGA.md"
$utf8 = New-Object System.Text.UTF8Encoding($false)

if (!([System.IO.Directory]::Exists($deliveryDir))) {
  Write-Host "ERROR: No existe carpeta de entrega:"
  Write-Host $deliveryDir
  exit 1
}

$patterns = @(
  "Completar",
  "No informado",
  "no informado",
  "Tribunal no informado",
  "Rol no informado",
  "ID multa",
  "Infraccion de transito informada en certificado",
  "{{",
  "}}"
)

$files = @()

$skipNames = @("README_ENTREGA.md", "VALIDACION_ENTREGA.md", "AUDITORIA_ENTREGA.md", "INDICE_EXPORT.md")

$mdFiles = [System.IO.Directory]::GetFiles($deliveryDir, "*.md")
foreach ($file in $mdFiles) {
  $name = [System.IO.Path]::GetFileName($file)

  if ($skipNames -notcontains $name) {
    $files += $file
  }
}

if ([System.IO.Directory]::Exists($exportDir)) {
  $htmlFiles = [System.IO.Directory]::GetFiles($exportDir, "*.html")
  foreach ($file in $htmlFiles) {
    $name = [System.IO.Path]::GetFileName($file)

    if ($skipNames -notcontains $name) {
      $files += $file
    }
  }
}

$findings = @()

foreach ($file in $files) {
  $lines = [System.IO.File]::ReadAllLines($file)

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]

    foreach ($pattern in $patterns) {
      if ($line -like "*$pattern*") {
        $item = New-Object PSObject
        $item | Add-Member -MemberType NoteProperty -Name File -Value ([System.IO.Path]::GetFileName($file))
        $item | Add-Member -MemberType NoteProperty -Name Line -Value ($i + 1)
        $item | Add-Member -MemberType NoteProperty -Name Pattern -Value $pattern
        $item | Add-Member -MemberType NoteProperty -Name Text -Value $line.Trim()
        $findings += $item
      }
    }
  }
}

$zipFiles = [System.IO.Directory]::GetFiles($deliveryDir, "*.zip")

$status = "APROBADO"

if ($findings.Count -gt 0) {
  $status = "OBSERVADO"
}

$linesOut = @()
$linesOut += "# Auditoria de entrega PTM"
$linesOut += ""
$linesOut += "**Solicitud:** $RequestId"
$linesOut += "**Fecha auditoria:** $(Get-Date -Format "dd-MM-yyyy HH:mm")"
$linesOut += "**Estado:** $status"
$linesOut += ""
$linesOut += "---"
$linesOut += ""
$linesOut += "## Archivos ZIP"
$linesOut += ""

if ($zipFiles.Count -eq 0) {
  $linesOut += "- No se encontro ZIP final."
} else {
  foreach ($zip in $zipFiles) {
    $info = Get-Item $zip
    $linesOut += "- $($info.Name) - $($info.Length) bytes"
  }
}

$linesOut += ""
$linesOut += "## Hallazgos"
$linesOut += ""

if ($findings.Count -eq 0) {
  $linesOut += "- OK: No se detectaron textos pendientes o marcadores."
} else {
  foreach ($f in $findings) {
    $linesOut += "- $($f.File), linea $($f.Line), patron [$($f.Pattern)]: $($f.Text)"
  }
}

$linesOut += ""
$linesOut += "## Recomendacion"
$linesOut += ""

if ($status -eq "APROBADO") {
  $linesOut += "Entrega apta para revision final visual."
} else {
  $linesOut += "Revisar hallazgos antes de enviar al cliente. Algunos textos pueden ser aceptables si se dejaron como campos editables."
}

[System.IO.File]::WriteAllText($reportFile, ($linesOut -join "`r`n"), $utf8)

Write-Host ""
Write-Host "AUDITORIA PTM"
Write-Host "Solicitud: $RequestId"
Write-Host "Estado: $status"
Write-Host "Hallazgos: $($findings.Count)"
Write-Host "Reporte:"
Write-Host $reportFile
Write-Host ""

if ($findings.Count -gt 0) {
  $findings |
    Select-Object File,Line,Pattern,Text |
    Format-Table -AutoSize
}

