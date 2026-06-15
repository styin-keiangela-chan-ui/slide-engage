$ErrorActionPreference = "Stop"

$InstallRoot = Join-Path $env:LOCALAPPDATA "SlideEngage\OfficeAddin"
$ManifestSource = Join-Path $PSScriptRoot "manifest.xml"
$ManifestTarget = Join-Path $InstallRoot "manifest.xml"
$OfficeWefRoot = Join-Path $env:LOCALAPPDATA "Microsoft\Office\16.0\Wef\SlideEngage"
$WefManifestTarget = Join-Path $OfficeWefRoot "SlideEngage.xml"
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

function Test-Manifest {
  if (!(Test-Path $ManifestSource)) {
    throw "manifest.xml was not found next to this installer script."
  }

  $manifestContent = Get-Content $ManifestSource -Raw
  if ($manifestContent -notmatch "https://slide-engage\.vercel\.app/taskpane") {
    throw "SlideEngage manifest does not point to the production taskpane URL."
  }
  if ($manifestContent -match "localhost|127\.0\.0\.1") {
    throw "SlideEngage manifest contains a local development URL."
  }
}

function Register-SlideEngageManifest {
  New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
  New-Item -ItemType Directory -Force -Path $OfficeWefRoot | Out-Null
  Copy-Item $ManifestSource $ManifestTarget -Force
  Copy-Item $ManifestSource $WefManifestTarget -Force

  New-Item -Path $CatalogRegistryPath -Force | Out-Null
  New-ItemProperty -Path $CatalogRegistryPath -Name "Id" -Value $CatalogId -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $CatalogRegistryPath -Name "Url" -Value ("file:///" + $InstallRoot.Replace("\", "/") + "/") -PropertyType String -Force | Out-Null
  New-ItemProperty -Path $CatalogRegistryPath -Name "Flags" -Value 1 -PropertyType DWord -Force | Out-Null
}

function Test-SlideEngageRegistration {
  $registryOk = Test-RegistryPath $CatalogRegistryPath
  $manifestOk = Test-Path $ManifestTarget
  $wefOk = Test-Path $WefManifestTarget
  $registryUrl = ""

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
    RegistryUrl = $registryUrl
    Success = $registryOk -and $manifestOk -and $wefOk
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

  $successHtml = @"
<!doctype html>
<html>
<head><meta charset="utf-8"><title>SlideEngage installed</title><style>$style</style></head>
<body>
  <section class="card">
    <div class="pill">SlideEngage PowerPoint Add-in</div>
    <h1>Installation successful</h1>
    <p>SlideEngage has been registered for the current Windows user.</p>
    <h2>Where to find SlideEngage</h2>
    <ul>
      <li><strong>SlideEngage ribbon tab -> Open SlideEngage</strong></li>
      <li><strong>Insert -> My Add-ins</strong></li>
      <li><strong>Home -> Add-ins</strong></li>
    </ul>
    <p>Restart PowerPoint, then open the SlideEngage ribbon tab and choose Open SlideEngage. If the tab is not visible, check the Add-ins menu.</p>
  </section>
  <section class="card">
    <h2>Installer checks</h2>
    <ul>
      <li>Office Web Add-ins support: <span class="$(if ($OfficeInfo.WebAddinsSupported) { 'ok' } else { 'warn' })">$(if ($OfficeInfo.WebAddinsSupported) { 'Detected' } else { 'Not confirmed' })</span></li>
      <li>Office version: $($OfficeInfo.Version)</li>
      <li>WebView2 Runtime: <span class="$(if ($WebView2Info.Installed) { 'ok' } else { 'warn' })">$(if ($WebView2Info.Installed) { 'Detected ' + $WebView2Info.Version } else { 'Missing or not detected' })</span></li>
      <li>Manifest copied: <span class="$(if ($Registration.ManifestOk) { 'ok' } else { 'bad' })">$($Registration.ManifestOk)</span></li>
      <li>PowerPoint WEF copy: <span class="$(if ($Registration.WefManifestOk) { 'ok' } else { 'bad' })">$($Registration.WefManifestOk)</span></li>
      <li>Trusted catalog registry: <span class="$(if ($Registration.RegistryOk) { 'ok' } else { 'bad' })">$($Registration.RegistryOk)</span></li>
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
Test-Manifest

Write-Step "Registering SlideEngage for PowerPoint"
Register-SlideEngageManifest

Write-Step "Verifying installation"
$registration = Test-SlideEngageRegistration
if (!$registration.Success) {
  New-InstallerPages -OfficeInfo $officeInfo -WebView2Info $webView2Info -Registration $registration
  Start-Process $TroubleshootingPage
  throw "SlideEngage registration verification failed. Open the troubleshooting page for next steps."
}

New-InstallerPages -OfficeInfo $officeInfo -WebView2Info $webView2Info -Registration $registration

Write-Host ""
Write-Host "SlideEngage has been registered for PowerPoint." -ForegroundColor Green
Write-Host "Installed manifest:"
Write-Host "  $ManifestTarget"
Write-Host "  $WefManifestTarget"
Write-Host ""
Write-Host "Restart PowerPoint, then find SlideEngage in:"
Write-Host "  Insert -> My Add-ins"
Write-Host "  Home -> Add-ins"
Write-Host ""
Write-Host "Opening success page..."
Start-Process $SuccessPage
