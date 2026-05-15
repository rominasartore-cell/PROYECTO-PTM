param(
  [Parameter(Mandatory=$true)]
  [string]$RequestId,

  [Parameter(Mandatory=$false)]
  [string]$BaseUrl = "https://www.prescribetumulta.cl"
)

$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $PSScriptRoot
$deliveryFile = Join-Path $project "docs\deliveries\$RequestId\delivery-data.json"

if (!([System.IO.File]::Exists($deliveryFile))) {
  Write-Host "ERROR: No existe delivery-data.json:"
  Write-Host $deliveryFile
  exit 1
}

$url = $BaseUrl.TrimEnd("/") + "/api/results/" + $RequestId + "/client-data?ts=" + ([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())

Write-Host "Consultando client-data:"
Write-Host $url

try {
  $res = Invoke-RestMethod $url
} catch {
  Write-Host "ERROR: No pude consultar client-data"
  Write-Host $_.Exception.Message

  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host $reader.ReadToEnd()
  }

  exit 1
}

if ($res.ok -ne $true) {
  Write-Host "ERROR: API client-data respondio ok false"
  $res | ConvertTo-Json -Depth 20
  exit 1
}

if ($res.found -ne $true -or $null -eq $res.data) {
  Write-Host "OBSERVADO: No hay client-data guardado para esta solicitud."
  Write-Host "No se modifica delivery-data.json."
  exit 0
}

$data = Get-Content $deliveryFile -Raw | ConvertFrom-Json

$data.rutSolicitante = [string]$res.data.rut_solicitante
$data.profesionOficio = [string]$res.data.profesion_oficio
$data.domicilioSolicitante = [string]$res.data.domicilio_solicitante
$data.comunaSolicitante = [string]$res.data.comuna_solicitante
$data.observacionesInternas = "Datos del solicitante sincronizados desde formulario postpago el " + (Get-Date -Format "dd-MM-yyyy HH:mm") + ". Revisar tribunal y datos de cada multa antes de entrega final."

$utf8 = New-Object System.Text.UTF8Encoding($false)
$json = $data | ConvertTo-Json -Depth 80
[System.IO.File]::WriteAllText($deliveryFile, $json, $utf8)

Write-Host "OK: delivery-data.json actualizado con datos postpago"
Write-Host "RUT:" $data.rutSolicitante
Write-Host "Profesion/oficio:" $data.profesionOficio
Write-Host "Domicilio:" $data.domicilioSolicitante
Write-Host "Comuna:" $data.comunaSolicitante