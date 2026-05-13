param(
  [string]$BaseUrl = "https://www.prescribetumulta.cl",
  [string]$RequestId = "ptm-1778707733393-wi39ig77",
  [switch]$SendEmailTest
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Set-Location $ProjectRoot

Write-Host "========================================"
Write-Host " PTM PREFLIGHT CHECK"
Write-Host "========================================"
Write-Host "Proyecto:  $ProjectRoot"
Write-Host "BaseUrl:   $BaseUrl"
Write-Host "RequestId: $RequestId"
Write-Host ""

function Test-FileExists($Path, $Label) {
  if (Test-Path $Path) {
    Write-Host "[OK] $Label"
  } else {
    Write-Host "[FAIL] $Label - no existe: $Path"
  }
}

function Invoke-JsonCheck($Method, $Url, $Label) {
  Write-Host ""
  Write-Host "---- $Label ----"
  Write-Host $Url

  try {
    if ($Method -eq "POST") {
      $response = Invoke-RestMethod -Method POST -Uri $Url
    } else {
      $response = Invoke-RestMethod -Uri $Url
    }

    $response | ConvertTo-Json -Depth 20
    Write-Host "[OK] $Label"
  } catch {
    Write-Host "[FAIL] $Label"

    Write-Host "STATUS:"
    try {
      Write-Host $_.Exception.Response.StatusCode.value__
    } catch {
      Write-Host "Sin status code"
    }

    Write-Host "BODY:"
    try {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $reader.ReadToEnd()
    } catch {
      Write-Host $_.Exception.Message
    }
  }
}

Write-Host ""
Write-Host "1) Archivos criticos"

Test-FileExists ".\src\app\page.tsx" "Landing"
Test-FileExists ".\src\app\resultados\[requestId]\page.tsx" "Pagina resultados"
Test-FileExists ".\src\app\admin\dashboard\page.tsx" "Admin dashboard"
Test-FileExists ".\src\app\admin\request\[requestId]\page.tsx" "Admin detalle"

Test-FileExists ".\src\app\api\payment\create\route.ts" "API payment create"
Test-FileExists ".\src\app\api\payment\status\[requestId]\route.ts" "API payment status"

Test-FileExists ".\src\app\api\admin\metrics\route.ts" "API admin metrics"
Test-FileExists ".\src\app\api\admin\requests\route.ts" "API admin requests"
Test-FileExists ".\src\app\api\admin\requests\[requestId]\route.ts" "API admin request detail"
Test-FileExists ".\src\app\api\admin\requests\[requestId]\resend-email\route.ts" "API resend email"

Test-FileExists ".\src\lib\storage\payment-store.ts" "Payment store"
Test-FileExists ".\src\lib\analytics.ts" "Analytics"

Write-Host ""
Write-Host "2) Build local"
try {
  npm run build
  Write-Host "[OK] Build local"
} catch {
  Write-Host "[FAIL] Build local"
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

Write-Host ""
Write-Host "3) Endpoints produccion"

Invoke-JsonCheck "GET" "$BaseUrl/api/payment/status/$RequestId?ts=$stamp" "Payment status"

Invoke-JsonCheck "GET" "$BaseUrl/api/admin/metrics?ts=$stamp" "Admin metrics"

Invoke-JsonCheck "GET" "$BaseUrl/api/admin/requests?search=$RequestId&limit=100&ts=$stamp" "Admin requests search"

Invoke-JsonCheck "GET" "$BaseUrl/api/admin/requests/$RequestId?ts=$stamp" "Admin request detail"

if ($SendEmailTest) {
  Invoke-JsonCheck "POST" "$BaseUrl/api/admin/requests/$RequestId/resend-email?ts=$stamp" "Resend email"
} else {
  Write-Host ""
  Write-Host "---- Resend email ----"
  Write-Host "Saltado para no reenviar correos en cada prueba."
  Write-Host "Para probarlo, ejecuta el script con: -SendEmailTest"
}

Write-Host ""
Write-Host "========================================"
Write-Host " PREFLIGHT TERMINADO"
Write-Host "========================================"