# SlideEngage Installer System

This folder contains the production installer scaffolding for the SlideEngage PowerPoint Office Add-in.

## What The Installers Do

- Use the production manifest at `https://slide-engage.vercel.app/manifest.xml`.
- Register the add-in for PowerPoint only.
- Keep the task pane pointed at `https://slide-engage.vercel.app/taskpane`.
- Use the same SlideEngage logo for website, Office manifest icons, and installer assets.
- Avoid asking lecturers to upload `manifest.xml` manually.

## macOS

Build on macOS:

```bash
npm run icons:generate
npm run installer:mac
```

Output:

```text
public/downloads/SlideEngage-macOS.dmg
```

The `.dmg` contains a signed-package-ready `.pkg`. The package installs the manifest and copies it into PowerPoint for Mac's web add-in catalog folder:

```text
~/Library/Containers/com.microsoft.Powerpoint/Data/Documents/wef/SlideEngage.xml
~/Library/Containers/com.microsoft.Powerpoint/Data/Library/Application Support/Microsoft/Office/16.0/Wef/SlideEngage.xml
```

For public distribution, sign and notarize the package and DMG with an Apple Developer ID before uploading it.

## Windows

Build on Windows with WiX Toolset installed:

```powershell
npm run icons:generate
npm run installer:windows
```

Output:

```text
public/downloads/SlideEngage-Windows.msi
public/downloads/SlideEngage-Windows-Installer.zip
```

The MSI installs `manifest.xml` under:

```text
%LOCALAPPDATA%\SlideEngage\OfficeAddin
```

It also registers a current-user Office trusted catalog under:

```text
HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs
```

If WiX is unavailable, the build still creates `SlideEngage-Windows-Installer.zip`. It contains `Install SlideEngage.cmd`, `install-slideengage.ps1`, `uninstall-slideengage.ps1`, and the production `manifest.xml`.

## Production Distribution

1. Deploy the Next.js app to Vercel at `https://slide-engage.vercel.app`.
2. Confirm these URLs return `200`:
   - `https://slide-engage.vercel.app/manifest.xml`
   - `https://slide-engage.vercel.app/taskpane`
   - `https://slide-engage.vercel.app/assets/icons/icon-32.png`
   - `https://slide-engage.vercel.app/assets/icons/icon-80.png`
3. Build the macOS and Windows installers.
4. Upload the generated files to `public/downloads/`.
5. Users download from `https://slide-engage.vercel.app/download`.

## Important Production Note

For broad consumer distribution, Microsoft AppSource or Microsoft 365 centralized deployment is the most reliable way to make an Office web add-in appear automatically across machines. These installers are useful for individual lecturer installs, pilot deployments, and managed environments where the Office trusted catalog approach is allowed.
