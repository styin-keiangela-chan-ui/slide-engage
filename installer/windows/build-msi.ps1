$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\\..")
$BuildDir = Join-Path $Root "dist\\installer\\windows"
$OutDir = Join-Path $Root "public\\downloads"
$SourceDir = Join-Path $BuildDir "source"
$Manifest = Join-Path $Root "public\\manifest.xml"
$MsiOut = Join-Path $OutDir "SlideEngage-Windows.msi"
$ZipOut = Join-Path $OutDir "SlideEngage-Windows-Installer.zip"

New-Item -ItemType Directory -Force -Path $BuildDir, $OutDir, $SourceDir | Out-Null
Copy-Item $Manifest (Join-Path $SourceDir "manifest.xml") -Force
Copy-Item (Join-Path $PSScriptRoot "install-slideengage.ps1") (Join-Path $SourceDir "install-slideengage.ps1") -Force
Copy-Item (Join-Path $PSScriptRoot "uninstall-slideengage.ps1") (Join-Path $SourceDir "uninstall-slideengage.ps1") -Force

$InstallCmd = Join-Path $SourceDir "Install SlideEngage.cmd"
$UninstallCmd = Join-Path $SourceDir "Uninstall SlideEngage.cmd"
$Readme = Join-Path $SourceDir "README.txt"

Set-Content -Path $InstallCmd -Encoding ASCII -Value @"
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-slideengage.ps1"
pause
"@

Set-Content -Path $UninstallCmd -Encoding ASCII -Value @"
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall-slideengage.ps1"
pause
"@

Set-Content -Path $Readme -Encoding ASCII -Value @"
SlideEngage PowerPoint Add-in for Windows

1. Close PowerPoint.
2. Double-click "Install SlideEngage.cmd".
3. Restart PowerPoint.
4. Open Insert > Add-ins > My Add-ins and choose SlideEngage.

The installer registers a current-user Office trusted catalog and copies manifest.xml to:
%LOCALAPPDATA%\SlideEngage\OfficeAddin
%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\SlideEngage

The manifest task pane URL is:
https://slide-engage.vercel.app/taskpane
"@

$Wix = Get-Command candle.exe -ErrorAction SilentlyContinue
$Light = Get-Command light.exe -ErrorAction SilentlyContinue

if ($Wix -and $Light) {
  candle.exe -dSourceDir="$SourceDir" -out (Join-Path $BuildDir "SlideEngage.wixobj") (Join-Path $PSScriptRoot "SlideEngage.wxs")
  light.exe -out $MsiOut (Join-Path $BuildDir "SlideEngage.wixobj")
  Compress-Archive -Path (Join-Path $SourceDir "*") -DestinationPath $ZipOut -Force
  Write-Host "Created $MsiOut"
  Write-Host "Created $ZipOut"
  exit 0
}

$WixCli = Get-Command wix.exe -ErrorAction SilentlyContinue
if ($WixCli) {
  wix.exe build (Join-Path $PSScriptRoot "SlideEngage.wxs") -d SourceDir="$SourceDir" -o $MsiOut
  Compress-Archive -Path (Join-Path $SourceDir "*") -DestinationPath $ZipOut -Force
  Write-Host "Created $MsiOut"
  Write-Host "Created $ZipOut"
  exit 0
}

Write-Warning "WiX Toolset was not found. Install WiX, then rerun this script."
Compress-Archive -Path (Join-Path $SourceDir "*") -DestinationPath $ZipOut -Force
Write-Host "Created fallback script installer $ZipOut"
Write-Host "Staged installer files at $SourceDir"
