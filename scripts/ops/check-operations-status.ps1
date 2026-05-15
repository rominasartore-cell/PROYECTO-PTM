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

$projectRoot = Find-ProjectRoot
Set-Location $projectRoot

Write-Box "PTM - TABLERO LOCAL OPERATIVO"

Write-Host "Proyecto:"
Write-Host $projectRoot

Write-Host ""
Write-Host "[1] Git"
Write-Host "Rama:"
git branch --show-current
Write-Host "Ultimo commit:"
git log -1 --oneline
Write-Host "Estado:"
$gitStatus = git status --short
if ($gitStatus) {
  Write-Host $gitStatus
} else {
  Write-Host "[OK] Git limpio"
}

Write-Host ""
Write-Host "[2] Scripts operativos"
$requiredScripts = @(
  "scripts\ops\generate-real-delivery.ps1",
  "scripts\ops\start-client-case.ps1",
  "scripts\ops\check-operations-status.ps1"
)
foreach ($s in $requiredScripts) {
  if (Test-Path $s) {
    Write-Host ("[OK] " + $s)
  } else {
    Write-Host ("[FALTA] " + $s)
  }
}

Write-Host ""
Write-Host "[3] Documentacion operativa"
$requiredDocs = @(
  "docs\ops\flujo-entrega-operativa.md",
  "docs\ops\manual-operacion-controlada.md",
  "docs\ops\checklist-cliente-real.md",
  "docs\ops\plantilla-seguimiento-cliente.md"
)
foreach ($d in $requiredDocs) {
  if (Test-Path $d) {
    Write-Host ("[OK] " + $d)
  } else {
    Write-Host ("[FALTA] " + $d)
  }
}

Write-Host ""
Write-Host "[4] Clientes operativos locales"
$clientsDir = Join-Path $projectRoot "docs\operations\clientes"
if (Test-Path $clientsDir) {
  $clients = Get-ChildItem -Path $clientsDir | Where-Object { $_.PSIsContainer } | Sort-Object LastWriteTime -Descending
  if ($clients -and $clients.Count -gt 0) {
    Write-Host ("Clientes locales: " + $clients.Count)
    foreach ($c in $clients) {
      Write-Host ("- " + $c.Name + " | " + $c.LastWriteTime)
    }
  } else {
    Write-Host "[INFO] No hay carpetas de clientes locales creadas."
  }
} else {
  Write-Host "[INFO] No existe docs\operations\clientes todavia."
}

Write-Host ""
Write-Host "[5] Entregas generadas"
$deliveriesDir = Join-Path $projectRoot "docs\deliveries"
if (Test-Path $deliveriesDir) {
  $deliveries = Get-ChildItem -Path $deliveriesDir | Where-Object { $_.PSIsContainer } | Sort-Object LastWriteTime -Descending
  if ($deliveries -and $deliveries.Count -gt 0) {
    Write-Host ("Entregas locales: " + $deliveries.Count)
    foreach ($e in $deliveries) {
      $zip = Get-ChildItem -Path $e.FullName -Filter "*.zip" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
      $audit = Join-Path $e.FullName "AUDITORIA_ENTREGA.md"
      $validation = Join-Path $e.FullName "VALIDACION_ENTREGA.md"
      $zipStatus = "ZIP:NO"
      $auditStatus = "AUDITORIA:NO"
      $validationStatus = "VALIDACION:NO"
      if ($zip) { $zipStatus = "ZIP:OK" }
      if (Test-Path $audit) {
        $auditText = Get-Content $audit -Raw
        if ($auditText -match "APROBADO") {
          $auditStatus = "AUDITORIA:APROBADO"
        } else {
          $auditStatus = "AUDITORIA:REVISAR"
        }
      }
      if (Test-Path $validation) {
        $valText = Get-Content $validation -Raw
        if ($valText -match "APROBADO") {
          $validationStatus = "VALIDACION:APROBADO"
        } else {
          $validationStatus = "VALIDACION:REVISAR"
        }
      }
      Write-Host ("- " + $e.Name + " | " + $zipStatus + " | " + $validationStatus + " | " + $auditStatus)
    }
  } else {
    Write-Host "[INFO] No hay entregas locales."
  }
} else {
  Write-Host "[INFO] No existe docs\deliveries."
}

Write-Host ""
Write-Host "[6] Resumen operativo"
Write-Host "Estado recomendado:"
Write-Host "- Si Git limpio + scripts OK + docs OK + entregas auditadas: operar controlado."
Write-Host "- Si aparece FALTA o REVISAR: corregir antes de enviar a cliente."

Write-Box "PTM - TABLERO TERMINADO"
