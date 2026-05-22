# Slide Engage

Slide Engage is a public Next.js + Supabase audience interaction app with PowerPoint and Google Slides extension support.

## Public App URL

The distributable extension files are configured for:

```txt
https://your-real-vercel-domain.vercel.app
```

This is a placeholder, not a live website. After Vercel gives you the real deployment URL, run:

```bash
npm run configure:public-url -- https://your-real-vercel-domain.vercel.app
```

If you use a custom domain, use that HTTPS domain in the command instead.

## Deploy To Vercel

1. Push this project to GitHub.
2. In Vercel, create a new project from the repository.
3. Add these environment variables:

```env
NEXT_PUBLIC_APP_URL=https://your-real-vercel-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET=replace-with-a-long-random-production-secret
NEXT_PUBLIC_SOCKET_URL=
```

4. Deploy.
5. Open `https://your-real-vercel-domain.vercel.app/addin-install`.
6. Confirm `https://your-real-vercel-domain.vercel.app/manifest.xml` loads in the browser.

## Supabase Setup

1. Create a Supabase cloud project.
2. Run the schema/migrations in `src/lib/supabase`.
3. Enable Realtime for these tables:
   - `responses`
   - `qa_questions`
   - `qa_upvotes`
   - `interactions`
   - `participants`
4. Put the Supabase URL and anon key in Vercel environment variables.

Each lecturer account owns its own events. Students join only by event code, and all event, poll, quiz, Q&A, participant, and response data is stored in Supabase.

## PowerPoint Public Installation

Lecturers should not use localhost.

1. Visit `https://your-real-vercel-domain.vercel.app/addin-install`.
2. Copy or download the hosted manifest.
3. In PowerPoint: `Insert -> Add-ins -> My Add-ins -> Upload My Add-in`.
4. Select `manifest.xml`.
5. The Slide Engage ribbon button opens the hosted task pane at `https://your-real-vercel-domain.vercel.app/taskpane`.

The manifest files live in:

```txt
public/manifest.xml
public/office-addin/manifest.xml
public/pptx-addin/manifest.xml
office-addin/manifest.xml
```

## Google Slides Public Installation

1. Open Google Slides.
2. Go to `Extensions -> Apps Script`.
3. Paste `public/SlideEngage_GoogleSlides_Addon.gs`.
4. Confirm:

```js
var SLIDEENGAGE_URL = 'https://your-real-vercel-domain.vercel.app';
```

5. Run `onOpen` once and authorize.
6. Reload Google Slides and use the SlideEngage menu.

## Public User Flow

1. Lecturer installs the PowerPoint add-in or Google Slides add-on.
2. Lecturer logs in with email and password.
3. Lecturer creates an event.
4. Lecturer inserts poll, quiz, Q&A, word cloud, or join slides.
5. Students scan the QR code or enter the event code from any device and any network.
6. Responses and results sync through Supabase.

## Production URL Warning

If `NEXT_PUBLIC_APP_URL` is missing or points to a local address, the app shows a warning in install/taskpane surfaces. QR codes are blocked until a public HTTPS URL is configured, so phones never receive a localhost join link.
