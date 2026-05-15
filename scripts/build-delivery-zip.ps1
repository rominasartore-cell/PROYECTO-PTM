param(
  [Parameter(Mandatory=$true)]
  [string]$RequestId
)

$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $PSScriptRoot
$deliveryDir = Join-Path $project "docs\deliveries\$RequestId"
$exportDir = Join-Path $deliveryDir "EXPORT"
$zipFile = Join-Path $deliveryDir "PTM_ENTREGA_$RequestId.zip"

if (!([System.IO.Directory]::Exists($deliveryDir))) {
  Write-Host "ERROR: No existe carpeta de entrega:"
  Write-Host $deliveryDir
  exit 1
}

if (!([System.IO.Directory]::Exists($exportDir))) {
  Write-Host "ERROR: No existe carpeta EXPORT. Ejecuta primero export-delivery-html.ps1"
  Write-Host $exportDir
  exit 1
}

$htmlFiles = [System.IO.Directory]::GetFiles($exportDir, "*.html")

if ($htmlFiles.Count -eq 0) {
  Write-Host "ERROR: No hay archivos HTML en EXPORT."
  Write-Host $exportDir
  exit 1
}

$pending = @()

foreach ($file in $htmlFiles) {
  $content = [System.IO.File]::ReadAllText($file)

  if ($content -match "\{\{[^}]+\}\}") {
    $matches = [System.Text.RegularExpressions.Regex]::Matches($content, "\{\{[^}]+\}\}")

    foreach ($match in $matches) {
      $item = New-Object PSObject
      $item | Add-Member -MemberType NoteProperty -Name File -Value ([System.IO.Path]::GetFileName($file))
      $item | Add-Member -MemberType NoteProperty -Name Field -Value $match.Value
      $pending += $item
    }
  }
}

$uniquePending = $pending | Sort-Object File, Field -Unique

if ($uniquePending.Count -gt 0) {
  Write-Host ""
  Write-Host "ERROR: Hay campos pendientes en documentos de cliente. No se crea ZIP."
  Write-Host ""

  foreach ($item in $uniquePending) {
    Write-Host "$($item.File): $($item.Field)"
  }

  Write-Host ""
  Write-Host "Completa esos campos en delivery-data.json o en los .md correspondientes, luego exporta HTML otra vez."
  exit 1
}

if ([System.IO.File]::Exists($zipFile)) {
  Remove-Item $zipFile -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem

$tempDir = Join-Path $deliveryDir "_zip_temp"

if ([System.IO.Directory]::Exists($tempDir)) {
  Remove-Item $tempDir -Recurse -Force
}

[System.IO.Directory]::CreateDirectory($tempDir) | Out-Null

foreach ($file in $htmlFiles) {
  $name = [System.IO.Path]::GetFileName($file)
  Copy-Item -Path $file -Destination (Join-Path $tempDir $name) -Force
}

$indexFile = Join-Path $exportDir "INDICE_EXPORT.md"

if ([System.IO.File]::Exists($indexFile)) {
  Copy-Item -Path $indexFile -Destination (Join-Path $tempDir "INDICE_EXPORT.md") -Force
}

[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipFile)

Remove-Item $tempDir -Recurse -Force

Write-Host ""
Write-Host "OK: ZIP final creado"
Write-Host $zipFile
Write-Host ""
cmd /c dir "$zipFile"