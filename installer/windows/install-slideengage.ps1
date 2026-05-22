$ErrorActionPreference = "Stop"

$InstallRoot = Join-Path $env:LOCALAPPDATA "SlideEngage\\OfficeAddin"
$ManifestSource = Join-Path $PSScriptRoot "manifest.xml"
$ManifestTarget = Join-Path $InstallRoot "manifest.xml"
$OfficeWefRoot = Join-Path $env:LOCALAPPDATA "Microsoft\\Office\\16.0\\Wef\\SlideEngage"
$CatalogId = "{3A58A707-8F47-4B13-A3AC-99D9F7238A41}"
$CatalogRegistryPath = "HKCU:\\Software\\Microsoft\\Office\\16.0\\WEF\\TrustedCatalogs\\$CatalogId"

if (!(Test-Path $ManifestSource)) {
  throw "manifest.xml was not found next to this installer script."
}

New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
New-Item -ItemType Directory -Force -Path $OfficeWefRoot | Out-Null
Copy-Item $ManifestSource $ManifestTarget -Force
Copy-Item $ManifestSource (Join-Path $OfficeWefRoot "SlideEngage.xml") -Force

New-Item -Path $CatalogRegistryPath -Force | Out-Null
New-ItemProperty -Path $CatalogRegistryPath -Name "Id" -Value $CatalogId -PropertyType String -Force | Out-Null
New-ItemProperty -Path $CatalogRegistryPath -Name "Url" -Value ("file:///" + $InstallRoot.Replace("\\", "/") + "/") -PropertyType String -Force | Out-Null
New-ItemProperty -Path $CatalogRegistryPath -Name "Flags" -Value 1 -PropertyType DWord -Force | Out-Null

Write-Host "SlideEngage has been registered for PowerPoint."
Write-Host "Restart PowerPoint, then open the SlideEngage ribbon button."
