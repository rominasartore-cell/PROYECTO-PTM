param(
  [Parameter(Mandatory=$true)]
  [string]$RequestId
)

$ErrorActionPreference = "Stop"

$project = Split-Path -Parent $PSScriptRoot
$deliveryDir = Join-Path $project "docs\deliveries\$RequestId"
$exportDir = Join-Path $deliveryDir "EXPORT"
$utf8 = New-Object System.Text.UTF8Encoding($false)

function HtmlEncode($text) {
  return [System.Net.WebUtility]::HtmlEncode($text)
}

function Convert-SimpleMarkdownToHtml($markdown) {
  $lines = $markdown -split "`r?`n"
  $html = @()
  $inList = $false
  $inTable = $false

  foreach ($line in $lines) {
    $raw = $line
    $trim = $line.Trim()

    if ($trim -eq "") {
      if ($inList) {
        $html += "</ul>"
        $inList = $false
      }

      if ($inTable) {
        $html += "</table>"
        $inTable = $false
      }

      $html += "<br />"
      continue
    }

    if ($trim.StartsWith("|") -and $trim.EndsWith("|")) {
      if ($trim -match "^\|\s*-") {
        continue
      }

      if (!$inTable) {
        if ($inList) {
          $html += "</ul>"
          $inList = $false
        }

        $html += "<table>"
        $inTable = $true
      }

      $cells = $trim.Trim("|").Split("|")
      $html += "<tr>"

      foreach ($cell in $cells) {
        $html += "<td>" + (HtmlEncode($cell.Trim())) + "</td>"
      }

      $html += "</tr>"
      continue
    } elseif ($inTable) {
      $html += "</table>"
      $inTable = $false
    }

    if ($trim.StartsWith("- ")) {
      if (!$inList) {
        $html += "<ul>"
        $inList = $true
      }

      $html += "<li>" + (HtmlEncode($trim.Substring(2))) + "</li>"
      continue
    } elseif ($inList) {
      $html += "</ul>"
      $inList = $false
    }

    if ($trim.StartsWith("# ")) {
      $html += "<h1>" + (HtmlEncode($trim.Substring(2))) + "</h1>"
    } elseif ($trim.StartsWith("## ")) {
      $html += "<h2>" + (HtmlEncode($trim.Substring(3))) + "</h2>"
    } elseif ($trim.StartsWith("### ")) {
      $html += "<h3>" + (HtmlEncode($trim.Substring(4))) + "</h3>"
    } elseif ($trim -eq "---") {
      $html += "<hr />"
    } else {
      $encoded = HtmlEncode($raw)
      $encoded = $encoded -replace "\*\*(.*?)\*\*", "<strong>`$1</strong>"
      $html += "<p>$encoded</p>"
    }
  }

  if ($inList) {
    $html += "</ul>"
  }

  if ($inTable) {
    $html += "</table>"
  }

  return ($html -join "`r`n")
}

function Build-HtmlDocument($title, $body) {
  return @"
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>$title</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 32px;
    }

    .page {
      max-width: 850px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 44px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }

    h1 {
      font-size: 22px;
      line-height: 1.3;
      margin: 0 0 18px;
      color: #0f172a;
    }

    h2 {
      font-size: 17px;
      margin: 26px 0 10px;
      color: #115e59;
      border-bottom: 1px solid #ccfbf1;
      padding-bottom: 6px;
    }

    h3 {
      font-size: 15px;
      margin: 20px 0 8px;
      color: #134e4a;
    }

    p, li, td {
      font-size: 13.5px;
      line-height: 1.65;
    }

    p {
      margin: 8px 0;
    }

    ul {
      margin: 8px 0 14px 20px;
      padding: 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 12px;
    }

    td {
      border: 1px solid #cbd5e1;
      padding: 8px;
      vertical-align: top;
    }

    hr {
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 24px 0;
    }

    strong {
      font-weight: 700;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .page {
        box-shadow: none;
        border: none;
        border-radius: 0;
        max-width: none;
        padding: 24mm;
      }

      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    $body
  </div>
</body>
</html>
"@
}

if (!([System.IO.Directory]::Exists($deliveryDir))) {
  Write-Host "ERROR: No existe carpeta de entrega:"
  Write-Host $deliveryDir
  exit 1
}

if (!([System.IO.Directory]::Exists($exportDir))) {
  [System.IO.Directory]::CreateDirectory($exportDir) | Out-Null
}

$allMdFiles = [System.IO.Directory]::GetFiles($deliveryDir, "*.md")

$mdFiles = @()

foreach ($file in $allMdFiles) {
  $name = [System.IO.Path]::GetFileName($file)

  if ($name -eq "informe.md" -or $name -eq "instructivo.md" -or $name -like "solicitud-prescripcion-multa-*.md") {
    $mdFiles += $file
  }
}

foreach ($file in $mdFiles) {
  $name = [System.IO.Path]::GetFileNameWithoutExtension($file)
  $markdown = [System.IO.File]::ReadAllText($file)
  $body = Convert-SimpleMarkdownToHtml $markdown
  $html = Build-HtmlDocument $name $body
  $output = Join-Path $exportDir "$name.html"

  [System.IO.File]::WriteAllText($output, $html, $utf8)
}

$indexLines = @()
$indexLines += "# EXPORT PTM"
$indexLines += ""
$indexLines += "Solicitud: $RequestId"
$indexLines += "Fecha exportacion: $(Get-Date -Format "dd-MM-yyyy HH:mm")"
$indexLines += ""
$indexLines += "Archivos HTML generados:"
$indexLines += ""

foreach ($file in [System.IO.Directory]::GetFiles($exportDir, "*.html")) {
  $indexLines += "- " + [System.IO.Path]::GetFileName($file)
}

[System.IO.File]::WriteAllText((Join-Path $exportDir "INDICE_EXPORT.md"), ($indexLines -join "`r`n"), $utf8)

Write-Host ""
Write-Host "OK: export HTML creado"
Write-Host $exportDir
Write-Host ""
cmd /c dir "$exportDir"