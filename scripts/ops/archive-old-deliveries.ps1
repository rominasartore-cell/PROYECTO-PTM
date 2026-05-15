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
    if ((Test-Path $package) -and (Test-Path $src)) { return $dir }
    $parent = Split-Path -Parent $dir
    if ($parent -eq $dir) { break }
    $dir = $parent
  }
  throw "No se pudo detectar la raiz del proyecto PTM."
}

function Copy-FolderSafe($source, $target) {
  if (!(Test-Path $target)) {
    New-Item -ItemType Directory -Path $target -Force | Out-Null
  }

  Write-Host "[FALLBACK] Copiando con robocopy por carpeta bloqueada..."
  robocopy $source $target /E /COPY:DAT /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Host
  $code = $LASTEXITCODE

  if ($code -le 7) {
    return $true
  }

  Write-Host ("[WARN] Robocopy devolvio codigo: " + $code)
  return $false
}

Write-Box "PTM - ARCHIVAR ENTREGAS LOCALES RUIDOSAS"

$projectRoot = Find-ProjectRoot
Set-Location $projectRoot

$deliveriesDir = Join-Path $projectRoot "docs\deliveries"
$archiveDir = Join-Path $deliveriesDir "_ARCHIVO_LOCAL"

if (!(Test-Path $deliveriesDir)) {
  Write-Host "[INFO] No existe docs\deliveries. Nada que archivar."
  exit 0
}

if (!(Test-Path $archiveDir)) {
  New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
}

$keep = @("ptm-1778707733393-wi39ig77")
$archiveCandidates = @("qa-local-ptm", "mp-prod-1000-ptm-1778718777", "ID_DEL_CASO")

$moved = 0
$copied = 0
$locked = 0

foreach ($name in $archiveCandidates) {
  if ($keep -contains $name) {
    Write-Host ("[SKIP] Protegido: " + $name)
    continue
  }

  $source = Join-Path $deliveriesDir $name

  if (!(Test-Path $source)) {
    Write-Host ("[INFO] No existe o ya fue movido: " + $name)
    continue
  }

  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $targetName = $name + "_ARCHIVADO_" + $stamp
  $target = Join-Path $archiveDir $targetName

  Write-Host ("[TRY MOVE] " + $source)
  Write-Host ("       -> " + $target)

  try {
    Move-Item -Path $source -Destination $target -Force -ErrorAction Stop
    Write-Host "[OK] Movido"
    $moved = $moved + 1
  } catch {
    Write-Host ("[WARN] No se pudo mover: " + $_.Exception.Message)
    $okCopy = Copy-FolderSafe $source $target

    if ($okCopy) {
      $marker = Join-Path $source "_ARCHIVADO_COPIA_OK_PENDIENTE_BORRAR.txt"
      "Carpeta copiada a _ARCHIVO_LOCAL, pero Windows/OneDrive no permitio mover o borrar el original." | Set-Content -Path $marker -Encoding UTF8
      Write-Host "[OK] Copia archivada. Original queda marcado como pendiente de borrar."
      $copied = $copied + 1
    } else {
      Write-Host "[WARN] No se pudo copiar. Original queda sin archivar."
      $locked = $locked + 1
    }
  }
}

Write-Host ""
Write-Host ("Movidas: " + $moved)
Write-Host ("Copiadas por fallback: " + $copied)
Write-Host ("Bloqueadas sin copia: " + $locked)
Write-Host ("Archivo local: " + $archiveDir)

Write-Box "PTM - ARCHIVO LOCAL TERMINADO"
