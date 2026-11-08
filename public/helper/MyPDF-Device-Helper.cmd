<# : MyPDF Device Helper. The first lines run in the Windows command prompt, the rest in PowerShell.
@echo off
title MyPDF Device Helper
powershell -NoProfile -ExecutionPolicy Bypass -STA -Command "& ([ScriptBlock]::Create((Get-Content -LiteralPath '%~f0' -Raw)))"
echo.
echo MyPDF Device Helper stopped. You can close this window.
pause >nul
exit /b
#>

# ---------------------------------------------------------------------------------------------
# MyPDF Device Helper
# Lets https://mypdf-nine.vercel.app list your scanners and printers and scan pages into the app.
# It only listens on this computer (localhost) and only answers the MyPDF website.
# Close this window to stop it.
# ---------------------------------------------------------------------------------------------

$ErrorActionPreference = 'Stop'
$Port = 47615
$Version = '1.0.0'
$ProductionOrigin = 'https://mypdf-nine.vercel.app'

function Test-AllowedOrigin([string]$origin) {
  if (-not $origin) { return $false }
  if ($origin -eq $ProductionOrigin) { return $true }
  # local development of MyPDF
  return $origin -match '^http://(localhost|127\.0\.0\.1):\d+$'
}

function Get-Scanners {
  $list = @()
  try {
    $dm = New-Object -ComObject WIA.DeviceManager
    foreach ($d in $dm.DeviceInfos) {
      if ($d.Type -ne 1) { continue } # 1 = scanner
      $name = ''; $maker = ''
      try { $name = $d.Properties.Item('Name').Value } catch {}
      try { $maker = $d.Properties.Item('Manufacturer').Value } catch {}
      $list += [pscustomobject]@{ id = $d.DeviceID; name = $name; manufacturer = $maker }
    }
  } catch {}
  return ,$list
}

function Get-Printers {
  $list = @()
  $default = ''
  try { $default = (Get-CimInstance Win32_Printer -Filter 'Default=TRUE' | Select-Object -First 1).Name } catch {}
  try {
    foreach ($p in Get-Printer) {
      $port = [string]$p.PortName
      $kind = 'Local'
      if ($p.Name -match 'PDF|XPS|OneNote|Fax' -or $port -match '^(PORTPROMPT|nul|FILE)') { $kind = 'Virtual' }
      elseif ($port -match '^WSD' -or $p.Type -eq 'Connection') { $kind = 'Wireless/Network' }
      elseif ($port -match '^(IP_|\d{1,3}(\.\d{1,3}){3})' -or $port -match 'TCP') { $kind = 'Network' }
      elseif ($port -match '^USB') { $kind = 'USB' }
      $list += [pscustomobject]@{
        name    = $p.Name
        default = ($p.Name -eq $default)
        status  = [string]$p.PrinterStatus
        type    = $kind
        driver  = $p.DriverName
        shared  = [bool]$p.Shared
      }
    }
  } catch {}
  return ,$list
}

function Set-WiaProperty($item, [int]$id, $value) {
  foreach ($prop in $item.Properties) {
    if ($prop.PropertyID -eq $id) { try { $prop.Value = $value } catch {} }
  }
}

function Invoke-Scan([string]$deviceId, [int]$dpi, [string]$mode) {
  $dm = New-Object -ComObject WIA.DeviceManager
  $info = $null
  foreach ($d in $dm.DeviceInfos) { if ($d.DeviceID -eq $deviceId) { $info = $d } }
  if (-not $info) { throw 'Scanner not found. Is it switched on and connected?' }
  $dev = $info.Connect()
  $item = $dev.Items.Item(1)
  $intent = switch ($mode) { 'gray' { 2 } 'bw' { 4 } default { 1 } }
  Set-WiaProperty $item 6146 $intent  # colour intent
  Set-WiaProperty $item 6147 $dpi     # horizontal resolution
  Set-WiaProperty $item 6148 $dpi     # vertical resolution
  $img = $item.Transfer('{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}') # JPEG
  return [byte[]]$img.FileData.BinaryData
}

function Send-Json($res, $obj, [int]$status = 200) {
  $json = $obj | ConvertTo-Json -Depth 5 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $res.StatusCode = $status
  $res.ContentType = 'application/json; charset=utf-8'
  $res.ContentLength64 = $bytes.Length
  $res.OutputStream.Write($bytes, 0, $bytes.Length)
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
try { $listener.Start() } catch {
  Write-Host "Could not start on port $Port. Is the helper already running in another window?" -ForegroundColor Red
  return
}

Clear-Host
Write-Host ''
Write-Host '  MyPDF Device Helper' -ForegroundColor Magenta
Write-Host '  ===================' -ForegroundColor Magenta
Write-Host ''
Write-Host '  Running. Keep this window open while you scan.' -ForegroundColor Green
Write-Host "  Now open $ProductionOrigin/tools/scan and press 'Detect devices'."
Write-Host ''
$s = Get-Scanners; $p = Get-Printers
Write-Host ("  Found {0} scanner(s) and {1} printer(s)." -f $s.Count, $p.Count)
Write-Host '  Close this window to stop the helper.'
Write-Host ''

while ($listener.IsListening) {
  try { $ctx = $listener.GetContext() } catch { break }
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    $origin = $req.Headers['Origin']
    if ($origin) {
      if (-not (Test-AllowedOrigin $origin)) {
        Send-Json $res @{ error = 'This website is not allowed to use the MyPDF Device Helper.' } 403
        continue
      }
      $res.AddHeader('Access-Control-Allow-Origin', $origin)
      $res.AddHeader('Vary', 'Origin')
      $res.AddHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      $res.AddHeader('Access-Control-Allow-Headers', 'Content-Type')
      $res.AddHeader('Access-Control-Allow-Private-Network', 'true')
    }
    if ($req.HttpMethod -eq 'OPTIONS') { $res.StatusCode = 204; continue }

    switch ($req.Url.AbsolutePath) {
      '/status' { Send-Json $res @{ app = 'mypdf-device-helper'; version = $Version } }
      '/devices' { Send-Json $res @{ scanners = (Get-Scanners); printers = (Get-Printers) } }
      '/scan' {
        $id = $req.QueryString['id']
        $dpi = [int]($req.QueryString['dpi']); if ($dpi -lt 75 -or $dpi -gt 600) { $dpi = 200 }
        $mode = $req.QueryString['mode']
        Write-Host ("  Scanning at {0} dpi..." -f $dpi) -ForegroundColor Cyan
        $bytes = Invoke-Scan $id $dpi $mode
        $res.StatusCode = 200
        $res.ContentType = 'image/jpeg'
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        Write-Host '  Page sent to MyPDF.' -ForegroundColor Green
      }
      default { Send-Json $res @{ error = 'Not found' } 404 }
    }
  } catch {
    $msg = $_.Exception.Message
    Write-Host "  Error: $msg" -ForegroundColor Red
    try { Send-Json $res @{ error = $msg } 500 } catch {}
  } finally {
    try { $res.Close() } catch {}
  }
}
