param(
  [Parameter(Mandatory=$true)]
  [string]$RequestId,

  [Parameter(Mandatory=$false)]
  [string]$AdminJsonPath = ""
)

$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $PSScriptRoot
$deliveryRoot = Join-Path $project "docs\deliveries"
$deliveryDir = Join-Path $deliveryRoot $RequestId
$utf8 = New-Object System.Text.UTF8Encoding($false)

if ($AdminJsonPath -eq "") {
  $AdminJsonPath = Join-Path $project ("tmp\admin-request-" + $RequestId + ".json")
}

if (!([System.IO.File]::Exists($AdminJsonPath))) {
  Write-Host "ERROR: No existe JSON admin:"
  Write-Host $AdminJsonPath
  exit 1
}

if (!([System.IO.Directory]::Exists($deliveryRoot))) {
  [System.IO.Directory]::CreateDirectory($deliveryRoot) | Out-Null
}

if (!([System.IO.Directory]::Exists($deliveryDir))) {
  [System.IO.Directory]::CreateDirectory($deliveryDir) | Out-Null
}

function Get-Prop($obj, [string[]]$names, $fallback) {
  if ($null -eq $obj) {
    return $fallback
  }

  foreach ($name in $names) {
    foreach ($prop in $obj.PSObject.Properties) {
      if ($prop.Name -eq $name) {
        $value = $prop.Value

        if ($null -ne $value) {
          $text = "$value".Trim()

          if ($text -ne "") {
            return $value
          }
        }
      }
    }
  }

  return $fallback
}

function First-Value($objects, [string[]]$names, $fallback) {
  foreach ($obj in $objects) {
    $value = Get-Prop $obj $names $null

    if ($null -ne $value) {
      $text = "$value".Trim()

      if ($text -ne "") {
        return $value
      }
    }
  }

  return $fallback
}

function As-Array($value) {
  if ($null -eq $value) {
    return @()
  }

  if ($value -is [System.Array]) {
    return $value
  }

  return @($value)
}

function Parse-MaybeJson($value) {
  if ($null -eq $value) {
    return $null
  }

  if ($value -is [string]) {
    try {
      return $value | ConvertFrom-Json
    } catch {
      return $null
    }
  }

  return $value
}

function Get-Logs($root) {
  $candidates = @()

  if ($root.analysis -and $root.analysis.logs) {
    $candidates += ,$root.analysis.logs
  }

  if ($root.result -and $root.result.logs) {
    $candidates += ,$root.result.logs
  }

  if ($root.data -and $root.data.raw_analysis_json) {
    $raw = Parse-MaybeJson $root.data.raw_analysis_json

    if ($raw.logs) {
      $candidates += ,$raw.logs
    }

    if ($raw.data -and $raw.data.logs) {
      $candidates += ,$raw.data.logs
    }

    if ($raw.result -and $raw.result.logs) {
      $candidates += ,$raw.result.logs
    }

    if ($raw.analysis -and $raw.analysis.logs) {
      $candidates += ,$raw.analysis.logs
    }

    if ($raw.analysisResult -and $raw.analysisResult.logs) {
      $candidates += ,$raw.analysisResult.logs
    }

    if ($raw.preliminaryResult -and $raw.preliminaryResult.logs) {
      $candidates += ,$raw.preliminaryResult.logs
    }
  }

  foreach ($candidate in $candidates) {
    $arr = As-Array $candidate

    if ($arr.Count -gt 0) {
      return $arr
    }
  }

  return @()
}

function Is-Prescribed($fine) {
  $estado = (Get-Prop $fine @("estado", "status") "").ToString().ToUpperInvariant()

  if ($estado -like "*POTENCIALMENTE_PRESCRITA*") {
    return $true
  }

  if ($estado -like "*PRESCRITA*" -and $estado -notlike "*NO*") {
    return $true
  }

  $presc = Get-Prop $fine @("prescripcionPorFecha", "prescribedByDate") $false

  if ($presc -eq $true) {
    return $true
  }

  return $false
}

function Format-Clp($value) {
  if ($null -eq $value) {
    return "No informado"
  }

  try {
    $culture = New-Object System.Globalization.CultureInfo("es-CL")
    $number = [double]$value
    return $number.ToString("C0", $culture)
  } catch {
    return "$value"
  }
}

function Normalize-Utm($value) {
  if ($null -eq $value) {
    return "No informado"
  }

  $text = "$value".Trim()

  if ($text -eq "") {
    return "No informado"
  }

  if ($text -like "*UTM*") {
    return $text
  }

  return $text + " UTM"
}

function Build-Fine($fine, $index) {
  $idMulta = Get-Prop $fine @("idMulta", "id", "fineId") ""
  $rol = Get-Prop $fine @("rolCausa", "rol", "role", "caseRole") ""

  if ("$rol".Trim() -eq "") {
    if ("$idMulta".Trim() -ne "") {
      $rol = "Rol y aÃ±o no informado en certificado"
    } else {
      $rol = "Rol no informado " + $index
    }
  }

  $tribunal = Get-Prop $fine @("tribunal", "court", "juzgado") ""
  if ("$tribunal".Trim() -eq "") {
    $tribunal = "JUZGADO DE POLICIA LOCAL COMPETENTE"
  }

  $comunaTribunal = Get-Prop $fine @("comunaTribunal", "comuna", "tribunalCommune", "courtCommune") ""
  if ("$comunaTribunal".Trim() -eq "") {
    $comunaTribunal = "Competente"
  }

  $montoUtm = Normalize-Utm (Get-Prop $fine @("montoUtm", "montoMultaUtm", "amountUtm") "")
  $montoPesos = Get-Prop $fine @("montoPesos", "amountClp") $null
  $fechaIngreso = Get-Prop $fine @("fechaIngresoRmnp", "rmnpDate", "fechaRmnp") "Fecha no informada"
  $fechaPrescripcion = Get-Prop $fine @("fechaPrescripcionReferencial", "referencePrescriptionDate") ""
  $infraccion = Get-Prop $fine @("tipoInfraccion", "infraccion", "infraction") ""

  if ("$infraccion".Trim() -eq "") {
    $infraccion = "Infraccion de transito indicada en el certificado"
  }

  $estado = Get-Prop $fine @("estado", "status") "Estado no informado"

  $observacion = "Analisis referencial segun fecha de ingreso RMNP."

  if ("$fechaPrescripcion".Trim() -ne "") {
    $observacion = "Fecha referencial de prescripcion: " + $fechaPrescripcion + "."
  }

  return [ordered]@{
    numero = "{0:D2}" -f $index
    idMulta = "$idMulta"
    comunaTribunal = "$comunaTribunal"
    numeroTribunal = "2"
    rolCausa = "$rol"
    montoMultaUtm = "$montoUtm"
    montoPesos = Format-Clp $montoPesos
    infraccion = "$infraccion"
    fechaIngresoRmnp = "$fechaIngreso"
    fechaPrescripcionReferencial = "$fechaPrescripcion"
    estado = "$estado"
    tribunal = "$tribunal"
    observacion = "$observacion"
  }
}

$root = Get-Content $AdminJsonPath -Raw | ConvertFrom-Json

$main = $root.data
if ($null -eq $main) {
  $main = $root.request
}
if ($null -eq $main) {
  $main = $root
}

$payment = $root.payment
if ($null -eq $payment -and $main.payment) {
  $payment = $main.payment
}

$objects = @($main, $root, $payment)

$logs = Get-Logs $root

if ($logs.Count -eq 0) {
  Write-Host "ERROR: No se encontraron logs de multas en el JSON admin."
  exit 1
}

$prescritasRaw = @()
$noPrescritasRaw = @()

foreach ($fine in $logs) {
  if (Is-Prescribed $fine) {
    $prescritasRaw += $fine
  } else {
    $noPrescritasRaw += $fine
  }
}

$multasPrescritas = @()
$counter = 1

foreach ($fine in $prescritasRaw) {
  $multasPrescritas += (Build-Fine $fine $counter)
  $counter++
}

$multasNoPrescritas = @()
$counter = 1

foreach ($fine in $noPrescritasRaw) {
  $multasNoPrescritas += (Build-Fine $fine $counter)
  $counter++
}

$totalMontoPrescrito = 0

foreach ($fine in $prescritasRaw) {
  $monto = Get-Prop $fine @("montoPesos", "amountClp") 0

  try {
    $totalMontoPrescrito += [double]$monto
  } catch {
  }
}

$totalUtmPrescrita = 0

foreach ($fine in $prescritasRaw) {
  $utm = Get-Prop $fine @("montoUtm", "montoMultaUtm", "amountUtm") 0

  try {
    $totalUtmPrescrita += [double]$utm
  } catch {
  }
}

$delivery = [ordered]@{
  requestId = $RequestId
  nombreCliente = First-Value $objects @("customer_name", "customerName", "payment_customer_name", "name") "Cliente"
  emailCliente = First-Value $objects @("customer_email", "customerEmail", "payment_customer_email", "email") "Sin correo"
  patente = First-Value $objects @("vehicle_plate", "plate", "patente") "Sin patente"
  fechaInforme = Get-Date -Format "dd-MM-yyyy"
  fechaCompra = First-Value $objects @("payment_paid_at", "paidAt", "created_at", "createdAt") (Get-Date -Format "dd-MM-yyyy")
  fechaCertificado = Get-Date -Format "dd-MM-yyyy"
  totalMultas = "" + $logs.Count
  totalPotencialmentePrescritas = "" + $multasPrescritas.Count
  totalNoPrescritas = "" + $multasNoPrescritas.Count
  montoReferencialPrescrito = Format-Clp $totalMontoPrescrito
  totalUtm = "$totalUtmPrescrita"
  utmClp = First-Value $objects @("utm_value_clp", "utmClp") "70588"
  rutSolicitante = "RUT a indicar por el solicitante antes de presentar"
  profesionOficio = "profesion u oficio a indicar por el solicitante antes de presentar"
  domicilioSolicitante = "domicilio a indicar por el solicitante antes de presentar"
  comunaSolicitante = "comuna a indicar por el solicitante antes de presentar"
  documentosAdicionales = "Certificado de multas de transito no pagadas."
  observacionesInternas = "Datos generados automaticamente desde JSON admin. Revisar RUT, domicilio y comuna antes de entrega final."
  multasPrescritas = $multasPrescritas
  multasNoPrescritas = $multasNoPrescritas
}

$outFile = Join-Path $deliveryDir "delivery-data.json"
$json = $delivery | ConvertTo-Json -Depth 20

[System.IO.File]::WriteAllText($outFile, $json, $utf8)

Write-Host ""
Write-Host "OK: delivery-data.json generado"
Write-Host $outFile
Write-Host ""
Write-Host "Total multas: $($logs.Count)"
Write-Host "Potencialmente prescritas: $($multasPrescritas.Count)"
Write-Host "No prescritas/vigentes: $($multasNoPrescritas.Count)"
Write-Host "Monto referencial prescrito: $(Format-Clp $totalMontoPrescrito)"
Write-Host ""
cmd /c dir "$deliveryDir"

