$ErrorActionPreference = "Stop"

$InstallRoot = Join-Path $env:LOCALAPPDATA "SlideEngage\OfficeAddin"
$ManifestSource = Join-Path $PSScriptRoot "manifest.xml"
$ManifestTarget = Join-Path $InstallRoot "manifest.xml"
$OfficeWefBase = Join-Path $env:LOCALAPPDATA "Microsoft\Office\16.0\Wef"
$OfficeWefRoot = Join-Path $OfficeWefBase "SlideEngage"
$WefManifestTarget = Join-Path $OfficeWefRoot "manifest.xml"
$LegacyWefManifestTarget = Join-Path $OfficeWefRoot "SlideEngage.xml"
$WefRootManifestTarget = Join-Path $OfficeWefBase "SlideEngage.xml"
$CatalogId = "{3A58A707-8F47-4B13-A3AC-99D9F7238A41}"
$CatalogRegistryPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\$CatalogId"
$SuccessPage = Join-Path $InstallRoot "SlideEngage-Windows-Success.html"
$TroubleshootingPage = Join-Path $InstallRoot "SlideEngage-Windows-Troubleshooting.html"
$WebView2InstallerUrl = "https://go.microsoft.com/fwlink/p/?LinkId=2124703"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "== $Message ==" -ForegroundColor Green
}

function Test-RegistryPath {
  param([string]$Path)
  try {
    return Test-Path $Path
  } catch {
    return $false
  }
}

function Get-PowerPointInstallInfo {
  $paths = @(
    "HKCU:\Software\Microsoft\Office\16.0\PowerPoint",
    "HKLM:\Software\Microsoft\Office\16.0\PowerPoint",
    "HKLM:\Software\WOW6432Node\Microsoft\Office\16.0\PowerPoint",
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\App Paths\POWERPNT.EXE",
    "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\POWERPNT.EXE",
    "HKCR:\PowerPoint.Application"
  )

  $found = $false
  foreach ($path in $paths) {
    if (Test-RegistryPath $path) {
      $found = $true
      break
    }
  }

  $clickToRun = $null
  foreach ($path in @(
    "HKLM:\Software\Microsoft\Office\ClickToRun\Configuration",
    "HKLM:\Software\WOW6432Node\Microsoft\Office\ClickToRun\Configuration"
  )) {
    if (Test-RegistryPath $path) {
      try {
        $clickToRun = Get-ItemProperty -Path $path -ErrorAction Stop
        break
      } catch {}
    }
  }

  return [PSCustomObject]@{
    Installed = $found -or ($null -ne $clickToRun)
    WebAddinsSupported = $found -or ($null -ne $clickToRun)
    Version = if ($clickToRun -and $clickToRun.VersionToReport) { $clickToRun.VersionToReport } else { "Office 2016/Microsoft 365 compatible check" }
    Channel = if ($clickToRun -and $clickToRun.Channel) { $clickToRun.Channel } else { "" }
  }
}

function Get-WebView2Info {
  $clientGuid = "{F1A1E6B5-030C-41F5-A9E3-F9DEB5B83188}"
  $paths = @(
    "HKCU:\Software\Microsoft\EdgeUpdate\Clients\$clientGuid",
    "HKLM:\Software\Microsoft\EdgeUpdate\Clients\$clientGuid",
    "HKLM:\Software\WOW6432Node\Microsoft\EdgeUpdate\Clients\$clientGuid"
  )

  foreach ($path in $paths) {
    if (Test-RegistryPath $path) {
      try {
        $props = Get-ItemProperty -Path $path -ErrorAction Stop
        return [PSCustomObject]@{
          Installed = $true
          Version = if ($props.pv) { $props.pv } else { "installed" }
          Source = $path
        }
      } catch {}
    }
  }

  $runtimePaths = @(
    "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application",
    "$env:ProgramFiles\Microsoft\EdgeWebView\Application",
    "$env:LOCALAPPDATA\Microsoft\EdgeWebView\Application"
  )
  foreach ($path in $runtimePaths) {
    if ($path -and (Test-Path $path)) {
      return [PSCustomObject]@{
        Installed = $true
        Version = "installed"
        Source = $path
      }
    }
  }

  return [PSCustomObject]@{
    Installed = $false
    Version = ""
    Source = ""
  }
}

function Prompt-WebView2Install {
  Write-Warning "Microsoft Edge WebView2 Runtime was not detected. PowerPoint Web Add-ins need WebView2 on Windows."
  Write-Host "Download page: $WebView2InstallerUrl"
  $answer = Read-Host "Open the Microsoft WebView2 Runtime installer page now? (Y/N)"
  if ($answer -match "^[Yy]") {
    Start-Process $WebView2InstallerUrl
  }
  Write-Host "Install WebView2, then rerun this installer if SlideEngage does not appear."
}

function Test-ManifestFile {
  param([string]$Path)

  if (!(Test-Path $Path)) {
    return [PSCustomObject]@{
      Valid = $false
      Message = "Manifest file is missing."
      Path = $Path
    }
  }

  $manifestContent = Get-Content $Path -Raw
  try {
    [xml]$manifestXml = $manifestContent
  } catch {
    return [PSCustomObject]@{
      Valid = $false
      Message = "Manifest is not valid XML: $($_.Exception.Message)"
      Path = $Path
    }
  }

  if ($manifestContent -notmatch '<Host\s+Name="Presentation"\s*/>') {
    return [PSCustomObject]@{
      Valid = $false
      Message = 'Manifest must contain <Host Name="Presentation"/>.'
      Path = $Path
    }
  }
  if ($manifestContent -notmatch '<DisplayName\s+DefaultValue="SlideEngage"\s*/>') {
    return [PSCustomObject]@{
      Valid = $false
      Message = 'Manifest must contain DisplayName="SlideEngage".'
      Path = $Path
    }
  }
  if ($manifestContent -notmatch '<Id>[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}</Id>') {
    return [PSCustomObject]@{
      Valid = $false
      Message = 'Manifest must contain a valid GUID add-in ID.'
      Path = $Path
    }
  }
  if ($manifestContent -notmatch "https://slide-engage\.vercel\.app/taskpane") {
    return [PSCustomObject]@{
      Valid = $false
      Message = "Manifest does not point to the production HTTPS taskpane URL."
      Path = $Path
    }
  }
  if ($manifestContent -match "localhost|127\.0\.0\.1") {
    return [PSCustomObject]@{
      Valid = $false
      Message = "Manifest contains a local development URL."
      Path = $Path
    }
  }

  return [PSCustomObject]@{
    Valid = $true
    Message = "Valid Office Add-in manifest."
    Path = $Path
  }
}

function Assert-Manifest {
  param([string]$Path)
  $result = Test-ManifestFile -Path $Path
  if (!$result.Valid) {
    throw "$($result.Message) Path: $Path"
  }
  return $result
}

function Clear-SlideEngageOfficeCache {
  Remove-Item -Path $OfficeWefRoot -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -Path $WefRootManifestTarget -Force -ErrorAction SilentlyContinue

  $addinCacheRoots = @(
    (Join-Path $env:LOCALAPPDATA "Microsoft\Office\16.0\WebServiceCache"),
    (Join-Path $env:LOCALAPPDATA "Microsoft\Office\16.0\OfficeFileCache"),
    (Join-Path $env:LOCALAPPDATA "Microsoft\Office\16.0\Wef")
  )

  foreach ($root in $addinCacheRoots) {
    if (Test-Path $root) {
      Get-ChildItem -Path $root -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match "SlideEngage|7fb5ad7a-78bf-4713-bec5-b70ed0a3209d" } |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

function Register-SlideEngageManifest {
  New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
  New-Item -ItemType Directory -Force -Path $OfficeWefBase | Out-Null
  New-Item -ItemType Directory -Force -Path $OfficeWefRoot | Out-Null
  if (Test-Path $LegacyWefManifestTarget) {
    Remove-Item $LegacyWefManifestTarget -Force
  }
  Copy-Item $ManifestSource $ManifestTarget -Force
  Copy-Item $ManifestSource $WefManifestTarget -Force
  Copy-Item $ManifestSource $LegacyWefManifestTarget -Force
  Copy-Item $ManifestSource $WefRootManifestTarget -Force

  New-Item -Path $CatalogRegistryPath -Force | Out-Null
  New-ItemProperty -Path $CatalogRegistryPath -Name "Id" -Value $CatalogId -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $CatalogRegistryPath -Name "Url" -Value $InstallRoot -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $CatalogRegistryPath -Name "Flags" -Value 1 -PropertyType DWord -Force | Out-Null
}

function Test-SlideEngageRegistration {
  $registryOk = Test-RegistryPath $CatalogRegistryPath
  $manifestOk = Test-Path $ManifestTarget
  $wefOk = Test-Path $WefManifestTarget
  $legacyWefOk = Test-Path $LegacyWefManifestTarget
  $wefRootOk = Test-Path $WefRootManifestTarget
  $registryUrl = ""
  $manifestValidation = if ($manifestOk) { Test-ManifestFile -Path $ManifestTarget } else { [PSCustomObject]@{ Valid = $false; Message = "Manifest is missing."; Path = $ManifestTarget } }
  $wefManifestValidation = if ($wefOk) { Test-ManifestFile -Path $WefManifestTarget } else { [PSCustomObject]@{ Valid = $false; Message = "WEF manifest is missing."; Path = $WefManifestTarget } }

  if ($registryOk) {
    try {
      $props = Get-ItemProperty -Path $CatalogRegistryPath -ErrorAction Stop
      $registryUrl = $props.Url
    } catch {}
  }

  return [PSCustomObject]@{
    RegistryOk = $registryOk
    ManifestOk = $manifestOk
    WefManifestOk = $wefOk
    LegacyWefManifestOk = $legacyWefOk
    WefRootManifestOk = $wefRootOk
    ManifestPath = $ManifestTarget
    WefManifestPath = $WefManifestTarget
    LegacyWefManifestPath = $LegacyWefManifestTarget
    WefRootManifestPath = $WefRootManifestTarget
    ManifestValidationOk = $manifestValidation.Valid
    ManifestValidationMessage = $manifestValidation.Message
    WefManifestValidationOk = $wefManifestValidation.Valid
    WefManifestValidationMessage = $wefManifestValidation.Message
    RegistryUrl = $registryUrl
    Success = $registryOk -and $manifestOk -and $wefOk -and $legacyWefOk -and $wefRootOk -and $manifestValidation.Valid -and $wefManifestValidation.Valid
  }
}

function New-InstallerPages {
  param(
    [object]$OfficeInfo,
    [object]$WebView2Info,
    [object]$Registration
  )

  $style = @"
  body{font-family:Segoe UI,Arial,sans-serif;background:#f4f7f4;color:#17172f;margin:0;padding:32px}
  .card{max-width:860px;margin:0 auto 18px;background:white;border:1px solid #dfe9e3;border-radius:16px;padding:24px;box-shadow:0 10px 28px rgba(14,63,34,.08)}
  h1{margin:0 0 10px;font-size:28px}.ok{color:#168a3a;font-weight:800}.warn{color:#9a5b00;font-weight:800}.bad{color:#b42318;font-weight:800}
  li{margin:10px 0}.pill{display:inline-block;border-radius:999px;background:#eaf7ef;color:#168a3a;padding:5px 10px;font-weight:800}
  code{background:#f4f7f4;border-radius:6px;padding:2px 5px}
"@

  $statusPill = if ($Registration.Success) { "SlideEngage PowerPoint Add-in" } else { "Installation needs attention" }
  $statusHeading = if ($Registration.Success) { "Installation successful" } else { "Installation failed" }
  $statusMessage = if ($Registration.Success) { "SlideEngage has been registered for the current Windows user." } else { "SlideEngage was not registered because one or more required checks failed." }
  $nextStepMessage = if ($Registration.Success) { "Restart PowerPoint, then open the SlideEngage ribbon tab and choose Open SlideEngage. If the tab is not visible, check the Add-ins menu." } else { "Fix the failed checks below, then rerun Install SlideEngage.cmd. Do not use PowerPoint until the manifest copied and validation checks both pass." }

  $successHtml = @"
<!doctype html>
<html>
<head><meta charset="utf-8"><title>SlideEngage installation status</title><style>$style</style></head>
<body>
  <section class="card">
    <div class="pill">$statusPill</div>
    <h1>$statusHeading</h1>
    <p>$statusMessage</p>
    <h2>Where to find SlideEngage</h2>
    <ul>
      <li><strong>SlideEngage ribbon tab -> Open SlideEngage</strong></li>
      <li><strong>Insert -> My Add-ins</strong></li>
      <li><strong>Home -> Add-ins</strong></li>
    </ul>
    <p>$nextStepMessage</p>
  </section>
  <section class="card">
    <h2>Installer checks</h2>
    <ul>
      <li>Office Web Add-ins support: <span class="$(if ($OfficeInfo.WebAddinsSupported) { 'ok' } else { 'warn' })">$(if ($OfficeInfo.WebAddinsSupported) { 'Detected' } else { 'Not confirmed' })</span></li>
      <li>Office version: $($OfficeInfo.Version)</li>
      <li>WebView2 Runtime: <span class="$(if ($WebView2Info.Installed) { 'ok' } else { 'warn' })">$(if ($WebView2Info.Installed) { 'Detected ' + $WebView2Info.Version } else { 'Missing or not detected' })</span></li>
      <li>Manifest copied: <span class="$(if ($Registration.ManifestOk) { 'ok' } else { 'bad' })">$($Registration.ManifestOk)</span></li>
      <li>PowerPoint WEF copy: <span class="$(if ($Registration.WefManifestOk) { 'ok' } else { 'bad' })">$($Registration.WefManifestOk)</span></li>
      <li>PowerPoint legacy WEF copy: <span class="$(if ($Registration.LegacyWefManifestOk) { 'ok' } else { 'bad' })">$($Registration.LegacyWefManifestOk)</span></li>
      <li>PowerPoint root WEF copy: <span class="$(if ($Registration.WefRootManifestOk) { 'ok' } else { 'bad' })">$($Registration.WefRootManifestOk)</span></li>
      <li>Manifest validation: <span class="$(if ($Registration.ManifestValidationOk) { 'ok' } else { 'bad' })">$($Registration.ManifestValidationMessage)</span></li>
      <li>WEF manifest validation: <span class="$(if ($Registration.WefManifestValidationOk) { 'ok' } else { 'bad' })">$($Registration.WefManifestValidationMessage)</span></li>
      <li>Trusted catalog registry: <span class="$(if ($Registration.RegistryOk) { 'ok' } else { 'bad' })">$($Registration.RegistryOk)</span></li>
      <li>Trusted catalog URL: <code>$($Registration.RegistryUrl)</code></li>
      <li>Manifest path: <code>$($Registration.ManifestPath)</code></li>
      <li>PowerPoint WEF manifest path: <code>$($Registration.WefManifestPath)</code></li>
      <li>PowerPoint legacy WEF manifest path: <code>$($Registration.LegacyWefManifestPath)</code></li>
      <li>PowerPoint root WEF manifest path: <code>$($Registration.WefRootManifestPath)</code></li>
    </ul>
    <p>If Add-ins is still missing, open the troubleshooting page saved beside this file.</p>
  </section>
</body>
</html>
"@

  $troubleshootingHtml = @"
<!doctype html>
<html>
<head><meta charset="utf-8"><title>SlideEngage Windows troubleshooting</title><style>$style</style></head>
<body>
  <section class="card">
    <h1>PowerPoint does not show Add-ins</h1>
    <p>Use these checks if SlideEngage does not appear after installation.</p>
    <ol>
      <li>Restart PowerPoint after running the installer.</li>
      <li>Look for the dedicated <strong>SlideEngage</strong> ribbon tab first.</li>
      <li>If the tab is not visible, look in both <strong>Insert -> My Add-ins</strong> and <strong>Home -> Add-ins</strong>.</li>
      <li>If an older SlideEngage add-in is already installed, remove it from My Add-ins, restart PowerPoint, then rerun the installer.</li>
      <li>Confirm the trusted catalog is listed in PowerPoint under <strong>File -> Options -> Trust Center -> Trust Center Settings -> Trusted Add-in Catalogs</strong>.</li>
      <li>The catalog URL should be <code>$InstallRoot</code> and <strong>Show in Menu</strong> should be enabled.</li>
      <li>Install Microsoft Edge WebView2 Runtime if the installer reported it missing: <code>$WebView2InstallerUrl</code></li>
      <li>Confirm you are using desktop PowerPoint 2016 or newer, Microsoft 365 PowerPoint, or a supported managed Office install.</li>
      <li>If your school or company hides Office Add-ins, ask IT to enable Office Web Add-ins or deploy SlideEngage using Microsoft 365 centralized deployment.</li>
      <li>Rerun <code>Install SlideEngage.cmd</code> and confirm all verification checks pass.</li>
    </ol>
  </section>
  <section class="card">
    <h2>Installed locations</h2>
    <ul>
      <li>Manifest: <code>$ManifestTarget</code></li>
      <li>PowerPoint WEF manifest: <code>$WefManifestTarget</code></li>
      <li>PowerPoint legacy WEF manifest: <code>$LegacyWefManifestTarget</code></li>
      <li>PowerPoint root WEF manifest: <code>$WefRootManifestTarget</code></li>
      <li>Trusted catalog: <code>$CatalogRegistryPath</code></li>
    </ul>
  </section>
</body>
</html>
"@

  Set-Content -Path $SuccessPage -Encoding UTF8 -Value $successHtml
  Set-Content -Path $TroubleshootingPage -Encoding UTF8 -Value $troubleshootingHtml
}

Write-Step "Checking PowerPoint and Office Web Add-in support"
$officeInfo = Get-PowerPointInstallInfo
if ($officeInfo.WebAddinsSupported) {
  Write-Host "Office Web Add-ins support detected. Version: $($officeInfo.Version)"
} else {
  Write-Warning "Office Web Add-ins support could not be confirmed. SlideEngage requires desktop PowerPoint with Office Web Add-ins enabled."
}

Write-Step "Checking Microsoft Edge WebView2 Runtime"
$webView2Info = Get-WebView2Info
if ($webView2Info.Installed) {
  Write-Host "WebView2 Runtime detected: $($webView2Info.Version)"
} else {
  Prompt-WebView2Install
}

Write-Step "Validating SlideEngage manifest"
$sourceValidation = Assert-Manifest -Path $ManifestSource
Write-Host "$($sourceValidation.Message)"

Write-Step "Registering SlideEngage for PowerPoint"
Clear-SlideEngageOfficeCache
Register-SlideEngageManifest

Write-Step "Verifying installation"
$registration = Test-SlideEngageRegistration
if (!$registration.Success) {
  New-InstallerPages -OfficeInfo $officeInfo -WebView2Info $webView2Info -Registration $registration
  Start-Process $SuccessPage
  throw "SlideEngage registration verification failed. Manifest path: $($registration.ManifestPath). WEF manifest path: $($registration.WefManifestPath). Validation: $($registration.WefManifestValidationMessage)"
}

New-InstallerPages -OfficeInfo $officeInfo -WebView2Info $webView2Info -Registration $registration

Write-Host ""
Write-Host "SlideEngage has been registered for PowerPoint." -ForegroundColor Green
Write-Host "Installed manifest:"
Write-Host "  $ManifestTarget"
Write-Host "  $WefManifestTarget"
Write-Host ""
Write-Host "Restart PowerPoint, then find SlideEngage in:"
Write-Host "  SlideEngage ribbon tab -> Open SlideEngage"
Write-Host "  Insert -> My Add-ins"
Write-Host ""
Write-Host "Opening success page..."
Start-Process $SuccessPage
