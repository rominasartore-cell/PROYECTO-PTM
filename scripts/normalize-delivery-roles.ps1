param(
  [Parameter(Mandatory=$true)]
  [string]$RequestId
)

$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $PSScriptRoot
$deliveryFile = Join-Path $project "docs\deliveries\$RequestId\delivery-data.json"

if (!([System.IO.File]::Exists($deliveryFile))) {
  Write-Host "ERROR: No existe delivery-data.json"
  Write-Host $deliveryFile
  exit 1
}

function Clean-Text($value) {
  if ($null -eq $value) { return "" }
  return ([string]$value).Trim()
}

$delivery = Get-Content $deliveryFile -Raw | ConvertFrom-Json
$updated = 0

foreach ($listName in @("multasPrescritas", "multasNoPrescritas")) {
  $list = $delivery.$listName
  if ($null -eq $list) { continue }

  foreach ($item in $list) {
    $rol = Clean-Text $item.rolCausa

    if (
      $rol -eq "" -or
      $rol -like "Identificador de multa*" -or
      $rol -like "ID multa*" -or
      $rol -match "^[0-9]{5,}$"
    ) {
      $item.rolCausa = "Rol de causa no informado en certificado"
      $updated++
    }
  }
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
$json = $delivery | ConvertTo-Json -Depth 80
[System.IO.File]::WriteAllText($deliveryFile, $json, $utf8)

Write-Host "OK: roles normalizados"
Write-Host "Campos actualizados:" $updated

$delivery.multasPrescritas |
  Select-Object -First 10 numero,idMulta,rolCausa,fechaIngresoRmnp,montoMultaUtm |
  Format-Table -AutoSize