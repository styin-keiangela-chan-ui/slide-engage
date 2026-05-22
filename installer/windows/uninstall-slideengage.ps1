$ErrorActionPreference = "Stop"

$CatalogId = "{3A58A707-8F47-4B13-A3AC-99D9F7238A41}"
$CatalogRegistryPath = "HKCU:\\Software\\Microsoft\\Office\\16.0\\WEF\\TrustedCatalogs\\$CatalogId"

Remove-Item -Path $CatalogRegistryPath -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path (Join-Path $env:LOCALAPPDATA "SlideEngage") -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path (Join-Path $env:LOCALAPPDATA "Microsoft\\Office\\16.0\\Wef\\SlideEngage") -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "SlideEngage add-in registration removed. Restart PowerPoint."
