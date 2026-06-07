# SlideEngage PowerPoint Add-in

This folder contains the Office.js PowerPoint add-in package entry points.

- `manifest.xml` defines the PowerPoint ribbon button and opens the Next.js task pane.
- `src/commands/commands.ts` is reserved for command-surface code.
- The live task pane UI is served by `src/app/taskpane/page.tsx`.
- Public icons are served from `public/office-addin/`.
- The hosted manifest is generated at `/manifest.xml`.

## Development

Start the app/add-in dev environment:

```bash
npm run start:addin
```

Open the install guide:

```text
https://your-real-vercel-domain.vercel.app/addin-install
```

For IT-admin fallback sideloading into PowerPoint, use the hosted manifest:

```text
https://your-real-vercel-domain.vercel.app/manifest.xml
```

PowerPoint steps:

1. Open the lecturer's existing PowerPoint file.
2. Go to Insert -> Add-ins -> My Add-ins.
3. Choose Upload My Add-in.
4. Select the downloaded `manifest.xml`.
5. Click the SlideEngage logo in the PowerPoint ribbon.

## Installer Distribution

Lecturers should normally use the installer page instead of uploading XML:

```text
https://your-real-vercel-domain.vercel.app/download
```

Build installer artifacts:

```bash
npm run icons:generate
npm run installer:mac
```

```powershell
npm run icons:generate
npm run installer:windows
```

## Production/AppSource checklist

- Manifest targets PowerPoint only: `<Host Name="Presentation"/>`.
- Task pane URL must be HTTPS.
- Icon files exist at 16, 32, and 80 px.
- Support URL: `/support`.
- Privacy policy URL: `/privacy`.
- Terms of use URL: `/terms`.
- Do not use localhost in submitted manifests.
