# SlideEngage PowerPoint Add-in Setup

## Folder Structure

```text
office-addin/
  manifest.xml
  src/
    commands/
      commands.html
      commands.ts
    taskpane/
      taskpane.html
      taskpane.tsx
public/
  manifest.xml
  office-addin/
    icon-16.png
    icon-32.png
    icon-80.png
src/
  app/
    taskpane/
    addin-install/
    api/powerpoint/poll-slide/
  lib/
    office/powerpoint.ts
    realtime/socket.ts
```

## Development Commands

```bash
npm install
npm run start:addin
```

`start:addin` starts:

- Next.js app
- Socket.io realtime development server

## Local Sideloading

1. Keep the Next.js app running.
2. Open PowerPoint.
3. Go to `Insert -> Add-ins -> My Add-ins`.
4. Choose `Upload My Add-in`.
5. Select `public/manifest.xml` or download it from `/addin-install`.
6. Click the `Slide Engage` button in the PowerPoint ribbon.

## Production Deployment on Vercel

1. Push the repository to GitHub.
2. Import it into Vercel.
3. Set environment variables:

```text
NEXT_PUBLIC_APP_URL=https://your-real-vercel-domain.vercel.app
NEXT_PUBLIC_SOCKET_URL=https://your-socket-server.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Deploy.
5. Keep the production manifest URLs pointed at `https://your-real-vercel-domain.vercel.app`, or replace them with your final HTTPS domain before packaging installers.
6. Verify:

```text
https://your-real-vercel-domain.vercel.app/manifest.xml
https://your-real-vercel-domain.vercel.app/taskpane
https://your-real-vercel-domain.vercel.app/privacy
https://your-real-vercel-domain.vercel.app/terms
https://your-real-vercel-domain.vercel.app/support
```

## Socket.io on Vercel

Vercel serverless functions are not a good long-running Socket.io host. For production, deploy `scripts/socket-server.mjs` to a persistent Node host such as Render, Fly.io, Railway, or Azure App Service, then set:

```text
NEXT_PUBLIC_SOCKET_URL=https://your-socket-server.com
```

## Microsoft AppSource Checklist

- Manifest targets PowerPoint only: `<Host Name="Presentation"/>`.
- No Word add-in host is present.
- Task pane URL is HTTPS.
- Icon URLs are HTTPS and publicly reachable.
- Support URL is available at `/support`.
- Privacy policy URL is available at `/privacy`.
- Terms of use URL is available at `/terms`.
- Add-in does not require users to understand XML after AppSource publication.

## Installer Builds

macOS:

```bash
npm run icons:generate
npm run installer:mac
```

Windows:

```powershell
npm run icons:generate
npm run installer:windows
```

Generated files are written to:

```text
public/downloads/SlideEngage-macOS.dmg
public/downloads/SlideEngage-Windows.msi
```

## Installer Packaging Later

For most users, AppSource is preferred. If an installer is still required:

- macOS `.dmg`: package the manifest plus a small installer guide that copies it into the Office add-ins catalog or directs users to PowerPoint upload.
- Windows `.exe`: use WiX or MSIX to deploy the manifest to a trusted shared catalog or instruct Office to trust a network catalog.

The installer should not install a Word add-in and should not register Word custom XML parts.
