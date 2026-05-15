$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

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

function Check-Page($name, $url) {
  Write-Host ""
  Write-Host ("[CHECK] " + $name)
  Write-Host $url

  try {
    $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
    Write-Host ("HTTP: " + [string]$res.StatusCode)
    $body = [string]$res.Content

    if ($body -like "*Application error*") {
      Write-Host "[ERROR] Application error detectado"
      return $false
    }

    if ($body.Length -lt 50) {
      Write-Host "[WARN] Respuesta muy corta"
    } else {
      Write-Host "[OK] Pagina responde sin Application error"
    }

    return $true
  } catch {
    Write-Host ("[ERROR] " + $_.Exception.Message)
    return $false
  }
}

function Check-Contains($name, $url, $mustContain, $mustNotContain) {
  Write-Host ""
  Write-Host ("[CHECK] " + $name)
  Write-Host $url

  try {
    $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
    Write-Host ("HTTP: " + [string]$res.StatusCode)
    $body = [string]$res.Content
    $ok = $true

    foreach ($needle in $mustContain) {
      if ($body -like ("*" + $needle + "*")) {
        Write-Host ("[OK] Contiene: " + $needle)
      } else {
        Write-Host ("[ERROR] No contiene: " + $needle)
        $ok = $false
      }
    }

    foreach ($bad in $mustNotContain) {
      if ($body -like ("*" + $bad + "*")) {
        Write-Host ("[ERROR] Contiene texto no esperado: " + $bad)
        $ok = $false
      } else {
        Write-Host ("[OK] No contiene: " + $bad)
      }
    }

    return $ok
  } catch {
    Write-Host ("[ERROR] " + $_.Exception.Message)
    return $false
  }
}

function Check-Json($name, $url) {
  Write-Host ""
  Write-Host ("[CHECK] " + $name)
  Write-Host $url

  try {
    $json = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 30
    Write-Host "[OK] JSON responde"
    return $json
  } catch {
    Write-Host ("[ERROR] " + $_.Exception.Message)
    return $null
  }
}

$projectRoot = Find-ProjectRoot
Set-Location $projectRoot

$baseUrl = "https://www.prescribetumulta.cl"
$paidRequestId = "mp-prod-1000-ptm-1778718777"
$activeDeliveryId = "ptm-1778707733393-wi39ig77"
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$errors = 0
$warnings = 0

Write-Box "PTM - CHECK DIARIO OPERATIVO"
Write-Host ("Fecha timestamp: " + $stamp)
Write-Host ("Proyecto: " + $projectRoot)

Write-Host ""
Write-Host "[1] Git local"
Write-Host "Rama:"
git branch --show-current
Write-Host "Ultimo commit:"
git log -1 --oneline
Write-Host "Estado:"
$gitStatus = git status --short
if ($gitStatus) {
  Write-Host $gitStatus
  $warnings = $warnings + 1
} else {
  Write-Host "[OK] Git limpio"
}

Write-Host ""
Write-Host "[2] Tablero local operativo"
$dashboard = Join-Path $projectRoot "scripts\ops\check-operations-status.ps1"
if (Test-Path $dashboard) {
  & $dashboard
} else {
  Write-Host "[ERROR] No existe tablero local operativo"
  $errors = $errors + 1
}

Write-Host ""
Write-Host "[3] Produccion publica basica"
if (!(Check-Page "Home" ($baseUrl + "/?ts=" + $stamp))) { $errors = $errors + 1 }
if (!(Check-Page "Contacto" ($baseUrl + "/contacto?ts=" + $stamp))) { $errors = $errors + 1 }
if (!(Check-Page "Terminos" ($baseUrl + "/terminos-y-condiciones?ts=" + $stamp))) { $errors = $errors + 1 }
if (!(Check-Page "Privacidad" ($baseUrl + "/politica-de-privacidad?ts=" + $stamp))) { $errors = $errors + 1 }
if (!(Check-Page "Reembolso" ($baseUrl + "/politica-de-reembolso?ts=" + $stamp))) { $errors = $errors + 1 }

Write-Host ""
Write-Host "[4] SEO critico"
if (!(Check-Contains "robots.txt" ($baseUrl + "/robots.txt?ts=" + $stamp) @("Sitemap") @("Disallow: /resultados"))) { $errors = $errors + 1 }
if (!(Check-Contains "sitemap.xml" ($baseUrl + "/sitemap.xml?ts=" + $stamp) @($baseUrl) @("/resultados/"))) { $errors = $errors + 1 }

Write-Host ""
Write-Host "[5] Pago real ya validado - solo lectura"
$payment = Check-Json "Payment status aprobado existente" ($baseUrl + "/api/payment/status/" + $paidRequestId + "?ts=" + $stamp)
if ($payment) {
  Write-Host ("status: " + [string]$payment.status)
  Write-Host ("purchaseStatus: " + [string]$payment.purchaseStatus)
  if (($payment.status -eq "approved") -or ($payment.purchaseStatus -eq "paid")) {
    Write-Host "[OK] Pago existente sigue aprobado/pagado"
  } else {
    Write-Host "[WARN] Pago existente no aparece approved/paid"
    $warnings = $warnings + 1
  }
} else {
  $errors = $errors + 1
}

Write-Host ""
Write-Host "[6] Entrega activa local"
$deliveryDir = Join-Path $projectRoot ("docs\deliveries\" + $activeDeliveryId)
$zip = Join-Path $deliveryDir ("PTM_ENTREGA_" + $activeDeliveryId + ".zip")
$validation = Join-Path $deliveryDir "VALIDACION_ENTREGA.md"
$audit = Join-Path $deliveryDir "AUDITORIA_ENTREGA.md"

if (Test-Path $zip) { Write-Host "[OK] ZIP activo existe" } else { Write-Host "[ERROR] Falta ZIP activo"; $errors = $errors + 1 }
if (Test-Path $validation) {
  $valText = Get-Content $validation -Raw
  if ($valText -match "APROBADO") { Write-Host "[OK] Validacion activa APROBADO" } else { Write-Host "[ERROR] Validacion activa no aprobada"; $errors = $errors + 1 }
} else {
  Write-Host "[ERROR] Falta VALIDACION_ENTREGA.md"
  $errors = $errors + 1
}
if (Test-Path $audit) {
  $auditText = Get-Content $audit -Raw
  if ($auditText -match "APROBADO") { Write-Host "[OK] Auditoria activa APROBADO" } else { Write-Host "[ERROR] Auditoria activa no aprobada"; $errors = $errors + 1 }
} else {
  Write-Host "[ERROR] Falta AUDITORIA_ENTREGA.md"
  $errors = $errors + 1
}

Write-Box "RESULTADO CHECK DIARIO"
Write-Host ("Errores: " + $errors)
Write-Host ("Warnings: " + $warnings)

if ($errors -eq 0) {
  if ($warnings -eq 0) {
    Write-Host "ESTADO: OK PARA OPERAR CONTROLADO"
  } else {
    Write-Host "ESTADO: OK CON ADVERTENCIAS MENORES"
  }
} else {
  Write-Host "ESTADO: REVISAR ANTES DE OPERAR"
}

Write-Box "PTM - CHECK DIARIO TERMINADO"
