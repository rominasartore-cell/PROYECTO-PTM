param(
  [Parameter(Mandatory=$true)]
  [string]$RequestId
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

function Find-ProjectRoot {
  $dir = Split-Path -Parent $PSCommandPath
  while ($dir -and (Test-Path $dir)) {
    if ((Test-Path (Join-Path $dir "package.json")) -and (Test-Path (Join-Path $dir "src"))) { return $dir }
    $parent = Split-Path -Parent $dir
    if ($parent -eq $dir) { break }
    $dir = $parent
  }
  throw "No se pudo detectar la raiz del proyecto PTM."
}

$project = Find-ProjectRoot
$deliveryDir = Join-Path $project ("docs\deliveries\" + $RequestId)
$utf8 = New-Object System.Text.UTF8Encoding($false)

if (!(Test-Path $deliveryDir)) { throw "No existe carpeta de entrega: $deliveryDir" }

function Repair-Text($value) {
  if ($null -eq $value) { return $value }
  $text = [string]$value

  $map = @{
    "ÃƒÆ’Ã‚Â" = "Á"
    "ÃƒÆ’Ã‚Â‰" = "É"
    "ÃƒÆ’Ã‚Â" = "Í"
    "ÃƒÆ’Ã‚Â“" = "Ó"
    "ÃƒÆ’Ã…Â¡" = "Ú"
    "ÃƒÆ’Ã¢â‚¬Ëœ" = "Ñ"
    "ÃƒÆ’Ã‚Â¡" = "á"
    "ÃƒÆ’Ã‚Â©" = "é"
    "ÃƒÆ’Ã‚Â­" = "í"
    "ÃƒÆ’Ã‚Â³" = "ó"
    "ÃƒÆ’Ã‚Âº" = "ú"
    "ÃƒÆ’Ã‚Â±" = "ñ"
    "ÃƒÂ" = "Á"
    "ÃƒÂ‰" = "É"
    "ÃƒÂ" = "Í"
    "ÃƒÂ“" = "Ó"
    "ÃƒÂš" = "Ú"
    "Ãƒâ€˜" = "Ñ"
    "ÃƒÂ¡" = "á"
    "ÃƒÂ©" = "é"
    "ÃƒÂ­" = "í"
    "ÃƒÂ³" = "ó"
    "ÃƒÂº" = "ú"
    "ÃƒÂ±" = "ñ"
    "Ã" = "Á"
    "Ã‰" = "É"
    "Ã" = "Í"
    "Ã“" = "Ó"
    "Ãš" = "Ú"
    "Ã‘" = "Ñ"
    "Ã¡" = "á"
    "Ã©" = "é"
    "Ã­" = "í"
    "Ã³" = "ó"
    "Ãº" = "ú"
    "Ã±" = "ñ"
    "AÃ‘O" = "AÑO"
    "SENALES" = "SEÑALES"
    "TRANSITO" = "TRÁNSITO"
    "POLICIA" = "POLICÍA"
    "PUBLICO" = "PÚBLICO"
    "ELECTRONICO" = "ELECTRÓNICO"
    "CONTAMINACION" = "CONTAMINACIÓN"
    "RESTRICCION" = "RESTRICCIÓN"
    "nUnOA" = "ÑUÑOA"
  }

  foreach ($key in $map.Keys) { $text = $text.Replace($key, $map[$key]) }
  return $text
}

$files = Get-ChildItem -Path $deliveryDir -Recurse -File |
  Where-Object { $_.Extension -in ".md", ".html", ".json", ".txt" }

$count = 0
foreach ($file in $files) {
  $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
  $fixed = Repair-Text $content
  if ($fixed -ne $content) {
    [System.IO.File]::WriteAllText($file.FullName, $fixed, $utf8)
    $count++
    Write-Host "[OK] Reparado: $($file.FullName)" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Archivos reparados: $count"
Write-Host "Carpeta: $deliveryDir"
