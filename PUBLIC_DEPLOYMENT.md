# Public Deployment Guide

## Required Production Domain

Placeholder domain shown in this repo:

```txt
https://your-real-vercel-domain.vercel.app
```

For a custom domain, update:

- `NEXT_PUBLIC_APP_URL`
- PowerPoint manifest URLs
- Google Apps Script `SLIDEENGAGE_URL`
- installer/domain documentation

After Vercel creates the real deployment, update all extension files with:

```bash
npm run configure:public-url -- https://your-real-vercel-domain.vercel.app
```

## Vercel Steps

1. Import the project into Vercel.
2. Set framework to Next.js.
3. Add environment variables:

```env
NEXT_PUBLIC_APP_URL=https://your-real-vercel-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET=replace-with-a-long-random-production-secret
NEXT_PUBLIC_SOCKET_URL=
```

4. Deploy.
5. Verify:

```txt
https://your-real-vercel-domain.vercel.app
https://your-real-vercel-domain.vercel.app/join
https://your-real-vercel-domain.vercel.app/taskpane
https://your-real-vercel-domain.vercel.app/manifest.xml
https://your-real-vercel-domain.vercel.app/api/qrcode?code=TEST&format=svg
```

## Supabase Cloud

Use Supabase cloud, not local Supabase, for public use.

Checklist:

- Run `src/lib/supabase/schema.sql`.
- Run migrations in `src/lib/supabase/migrations`.
- Enable Realtime publication for response, Q&A, interaction, and participant tables.
- Keep the anon key public-safe and store it in Vercel.
- Store `JWT_SECRET` only as a Vercel secret, never in client code.

## Extension Configuration

### Google Slides

File:

```txt
public/SlideEngage_GoogleSlides_Addon.gs
```

Production setting:

```js
var SLIDEENGAGE_URL = 'https://your-real-vercel-domain.vercel.app';
```

The add-on uses this public backend for QR generation, join links, event codes, and Slide Engage pages.

### PowerPoint

Files:

```txt
public/manifest.xml
public/office-addin/manifest.xml
public/pptx-addin/manifest.xml
office-addin/manifest.xml
```

All task pane, icon, support, and install URLs should point to:

```txt
https://your-real-vercel-domain.vercel.app
```

## Public Installation Guide

### PowerPoint

1. Open PowerPoint.
2. Go to `Insert -> Add-ins -> My Add-ins`.
3. Choose `Upload My Add-in`.
4. Upload the downloaded `manifest.xml` from `https://your-real-vercel-domain.vercel.app/addin-install`.
5. Click the Slide Engage ribbon button.
6. Sign in, create/select an event, insert slides, and present.

### Google Slides

1. Open a Google Slides presentation.
2. Go to `Extensions -> Apps Script`.
3. Paste the Google add-on code.
4. Save, run `onOpen`, authorize, then reload Slides.
5. Use the SlideEngage menu to insert interaction slides.

## QR Code Rule

QR codes must never point to localhost. If someone opens the app locally or forgets to set `NEXT_PUBLIC_APP_URL`, the QR generator warns and waits for a valid public URL instead of creating a broken QR code.

## Notes About Realtime

The public app uses Supabase for stored events, participants, interactions, responses, Q&A, and analytics. Supabase Realtime should be enabled for live result updates across users and networks.

If you use the optional Socket.io slide-sync server, deploy it separately and set:

```env
NEXT_PUBLIC_SOCKET_URL=https://your-socket-server.example.com
```

Do not rely on a local Socket.io server for public lecturer/student usage.
