param(
  [Parameter(Mandatory=$true)]
  [string]$RequestId,

  [Parameter(Mandatory=$true)]
  [string]$AdminJsonPath
)

$ErrorActionPreference = "Stop"

function Write-Box($text) {
  Write-Host ""
  Write-Host "============================================================"
  Write-Host " $text"
  Write-Host "============================================================"
}

function Find-ProjectRoot {
  $dir = Split-Path -Parent $PSCommandPath

  while ($dir -and (Test-Path $dir)) {
    $package = Join-Path $dir "package.json"
    $src = Join-Path $dir "src"

    if ((Test-Path $package) -and (Test-Path $src)) {
      return $dir
    }

    $parent = Split-Path -Parent $dir
    if ($parent -eq $dir) {
      break
    }

    $dir = $parent
  }

  throw "No se pudo detectar la raiz del proyecto PTM."
}

function Find-ScriptFile($projectRoot, $name) {
  $matches = Get-ChildItem -Path $projectRoot -Recurse |
    Where-Object {
      !$_.PSIsContainer -and
      $_.Name -eq $name -and
      $_.FullName -notmatch "\\node_modules\\" -and
      $_.FullName -notmatch "\\.next\\" -and
      $_.FullName -notmatch "\\docs\\deliveries\\"
    }

  if (!$matches) {
    throw "No se encontro script requerido: $name"
  }

  return ($matches | Sort-Object FullName | Select-Object -First 1).FullName
}

function Get-ParamNames($scriptPath) {
  $tokens = $null
  $errors = $null

  try {
    $ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$errors)
  } catch {
    return @()
  }

  if ($errors -and $errors.Count -gt 0) {
    return @()
  }

  $names = @()

  if ($ast.ParamBlock -and $ast.ParamBlock.Parameters) {
    foreach ($p in $ast.ParamBlock.Parameters) {
      $names += $p.Name.VariablePath.UserPath
    }
  }

  return $names
}

function Add-ParamIfExists($bag, $paramNames, $possibleNames, $value) {
  foreach ($actual in $paramNames) {
    foreach ($possible in $possibleNames) {
      if ($actual -ieq $possible) {
        if (!$bag.ContainsKey($actual)) {
          $bag[$actual] = $value
        }
      }
    }
  }
}

function Invoke-CompatibleScript($scriptName, $projectRoot, $requestId, $adminJsonPath, $deliveryDir) {
  $scriptPath = Find-ScriptFile $projectRoot $scriptName
  $paramNames = Get-ParamNames $scriptPath

  Write-Host ""
  Write-Host "[RUN] $scriptName"
  Write-Host "      $scriptPath"

  $env:PTM_REQUEST_ID = $requestId
  $env:PTM_ADMIN_JSON_PATH = $adminJsonPath
  $env:PTM_DELIVERY_DIR = $deliveryDir
  $env:PTM_PROJECT_ROOT = $projectRoot

  Set-Variable -Name "RequestId" -Value $requestId -Scope Global
  Set-Variable -Name "AdminJsonPath" -Value $adminJsonPath -Scope Global
  Set-Variable -Name "DeliveryDir" -Value $deliveryDir -Scope Global
  Set-Variable -Name "ProjectRoot" -Value $projectRoot -Scope Global

  $bag = @{}

  Add-ParamIfExists $bag $paramNames @("RequestId", "Id", "AnalysisRequestId") $requestId
  Add-ParamIfExists $bag $paramNames @("AdminJsonPath", "AdminJson", "AdminJsonFile", "InputJsonPath", "JsonPath", "SourceJsonPath", "InputPath") $adminJsonPath
  Add-ParamIfExists $bag $paramNames @("DeliveryDir", "DeliveryPath", "OutputDir", "OutDir", "OutputPath", "CaseDir", "TargetDir") $deliveryDir
  Add-ParamIfExists $bag $paramNames @("ProjectRoot", "Root", "RootDir") $projectRoot

  if ($paramNames.Count -gt 0) {
    Write-Host "      Parametros detectados: $($paramNames -join ', ')"

    if ($bag.Count -gt 0) {
      Write-Host "      Ejecutando con parametros compatibles..."
      & $scriptPath @bag
    } else {
      Write-Host "      Sin parametros compatibles; ejecutando con variables de entorno..."
      & $scriptPath
    }
  } else {
    Write-Host "      Sin param() detectado; ejecutando con variables de entorno..."
    & $scriptPath
  }

  if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
    throw "Fallo $scriptName con exit code $LASTEXITCODE"
  }
}

Write-Box "PTM - GENERADOR UNICO DE ENTREGA REAL"

$projectRoot = Find-ProjectRoot
Set-Location $projectRoot

if (!(Test-Path $AdminJsonPath)) {
  throw "No existe AdminJsonPath: $AdminJsonPath"
}

$deliveryDir = Join-Path $projectRoot ("docs\deliveries\" + $RequestId)

if (!(Test-Path $deliveryDir)) {
  New-Item -ItemType Directory -Path $deliveryDir -Force | Out-Null
}

Write-Host "Proyecto: $projectRoot"
Write-Host "RequestId: $RequestId"
Write-Host "Admin JSON: $AdminJsonPath"
Write-Host "Carpeta entrega: $deliveryDir"

Write-Box "Ejecutando flujo validado"

$steps = @(
  "create-delivery-data-from-admin-json.ps1",
  "sync-client-data-to-delivery.ps1",
  "normalize-delivery-roles.ps1",
  "create-delivery-package.ps1",
  "validate-delivery-package.ps1",
  "export-delivery-html.ps1",
  "build-delivery-zip.ps1",
  "audit-delivery-package.ps1"
)

foreach ($step in $steps) {
  Invoke-CompatibleScript $step $projectRoot $RequestId $AdminJsonPath $deliveryDir
}

Write-Box "Resultado"

$zip = Get-ChildItem -Path $deliveryDir -Recurse |
  Where-Object { !$_.PSIsContainer -and $_.Name -like "*.zip" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if ($zip) {
  Write-Host "[OK] ZIP generado:"
  Write-Host $zip.FullName
} else {
  Write-Host "[WARN] No encontre ZIP final. Revisa salida anterior."
}

Write-Host ""
Write-Host "[OK] Flujo terminado para $RequestId"
