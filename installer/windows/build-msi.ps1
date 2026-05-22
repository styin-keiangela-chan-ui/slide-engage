$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\\..")
$BuildDir = Join-Path $Root "dist\\installer\\windows"
$OutDir = Join-Path $Root "public\\downloads"
$SourceDir = Join-Path $BuildDir "source"
$Manifest = Join-Path $Root "public\\manifest.xml"
$MsiOut = Join-Path $OutDir "SlideEngage-Windows.msi"

New-Item -ItemType Directory -Force -Path $BuildDir, $OutDir, $SourceDir | Out-Null
Copy-Item $Manifest (Join-Path $SourceDir "manifest.xml") -Force
Copy-Item (Join-Path $PSScriptRoot "install-slideengage.ps1") (Join-Path $SourceDir "install-slideengage.ps1") -Force
Copy-Item (Join-Path $PSScriptRoot "uninstall-slideengage.ps1") (Join-Path $SourceDir "uninstall-slideengage.ps1") -Force

$Wix = Get-Command candle.exe -ErrorAction SilentlyContinue
$Light = Get-Command light.exe -ErrorAction SilentlyContinue

if ($Wix -and $Light) {
  candle.exe -dSourceDir="$SourceDir" -out (Join-Path $BuildDir "SlideEngage.wixobj") (Join-Path $PSScriptRoot "SlideEngage.wxs")
  light.exe -out $MsiOut (Join-Path $BuildDir "SlideEngage.wixobj")
  Write-Host "Created $MsiOut"
  exit 0
}

$WixCli = Get-Command wix.exe -ErrorAction SilentlyContinue
if ($WixCli) {
  wix.exe build (Join-Path $PSScriptRoot "SlideEngage.wxs") -d SourceDir="$SourceDir" -o $MsiOut
  Write-Host "Created $MsiOut"
  exit 0
}

Write-Warning "WiX Toolset was not found. Install WiX, then rerun this script."
Write-Host "Staged installer files at $SourceDir"
