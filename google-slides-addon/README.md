# SlideEngage Google Slides Add-on

This folder contains the Google Apps Script source for the SlideEngage Google Slides add-on. It is prepared for Google Workspace Marketplace publishing so normal users can install SlideEngage once from Marketplace and then open it from Google Slides `Extensions > Add-ons`.

## Files

- `appsscript.json` - Apps Script manifest, OAuth scopes, add-on metadata, and Slides host configuration.
- `Code.gs` - server-side Apps Script logic for the sidebar, login, events, interactions, slide insertion, and snapshot updates.
- `Sidebar.html` - Google Slides sidebar UI.
- `MARKETPLACE.md` - Marketplace listing copy, publishing checklist, and screenshot/icon requirements.

## Production URL

The add-on calls the public SlideEngage backend:

```text
https://slide-engage.vercel.app
```

If the production domain changes, update:

```javascript
var SLIDEENGAGE_URL = 'https://slide-engage.vercel.app';
```

Keep this as HTTPS. Do not use localhost for Marketplace builds.

## OAuth Scopes

The manifest includes these scopes:

```json
[
  "https://www.googleapis.com/auth/presentations.currentonly",
  "https://www.googleapis.com/auth/script.container.ui",
  "https://www.googleapis.com/auth/script.external_request",
  "https://www.googleapis.com/auth/userinfo.email"
]
```

Purpose:

- `presentations.currentonly` - insert and update SlideEngage slides only in the current presentation.
- `script.container.ui` - show the SlideEngage sidebar in Google Slides.
- `script.external_request` - call SlideEngage public APIs for login, events, interactions, QR codes, and results.
- `userinfo.email` - support account identity/review needs during authorization.

Changing scopes requires a new deployment and user re-authorization.

## Supported Features

The add-on currently supports:

- Open SlideEngage sidebar from Google Slides.
- Login with the same SlideEngage website email/Gmail and password.
- Persist add-on session in Apps Script user properties.
- Fetch events for the signed-in lecturer.
- Select an event.
- Create an event.
- Create/edit interactions:
  - Multiple choice
  - Open text
  - Word cloud
  - Rating
  - Quiz
  - Audience Q&A
- Go live / close interactions.
- Reset results for the selected interaction.
- Insert a SlideEngage slide snapshot with QR code, event code, question, and result preview.
- Update the current SlideEngage snapshot.
- Gracefully show authorization errors for `UrlFetchApp.fetch`.

## Development Test Install

Use this only for internal development. Published Marketplace users should not copy Apps Script manually.

1. Open a Google Slides presentation.
2. Go to `Extensions > Apps Script`.
3. Create or open the Apps Script project.
4. Add the files from this folder:
   - `appsscript.json`
   - `Code.gs`
   - `Sidebar.html`
5. Save the project.
6. Reload the Google Slides presentation.
7. Open `Extensions > SlideEngage > Open SlideEngage`.
8. Click `Authorize connection` if the sidebar asks for permission.
9. Sign in with the same SlideEngage website account.
10. Select or create an event.
11. Create an interaction.
12. Click `Present in Google Slides`.
13. Confirm a SlideEngage slide is inserted with QR code, event code, and interaction content.

## Google Cloud Project Setup

These steps are done in your Google account/admin console, not in code.

1. Create or choose a Google Cloud project.
2. Enable the Google Workspace Marketplace SDK.
3. Enable the Apps Script API if you plan to use clasp or automated deployments.
4. Configure the OAuth consent screen.
5. Add the app name: `SlideEngage`.
6. Add support contact email.
7. Add authorized domains:
   - `slide-engage.vercel.app`
8. Add privacy policy:
   - `https://slide-engage.vercel.app/privacy`
9. Add terms of use:
   - `https://slide-engage.vercel.app/terms`
10. Add the OAuth scopes listed above.
11. Add test users for private testing.

## Apps Script Deployment Steps

1. Create a Google Apps Script project.
2. Link the Apps Script project to the Google Cloud project.
3. Upload or paste:
   - `appsscript.json`
   - `Code.gs`
   - `Sidebar.html`
4. Confirm `appsscript.json` has the expected OAuth scopes.
5. Confirm `SLIDEENGAGE_URL` points to the production HTTPS website.
6. Deploy as a Google Workspace Add-on.
7. Copy the deployment ID for the Marketplace SDK configuration.

## Test Deployment Checklist

Before submitting to Marketplace review:

- Add yourself as a test user.
- Install the private/test deployment.
- Open Google Slides.
- Confirm `Extensions > Add-ons > SlideEngage` appears.
- Open the sidebar.
- Confirm permission prompt appears when needed.
- Confirm login works with a SlideEngage website account.
- Confirm archived events do not appear in the normal event selector.
- Confirm events load.
- Confirm interactions load.
- Create a multiple choice poll.
- Create a word cloud.
- Insert a SlideEngage slide snapshot.
- Update a slide snapshot.
- Reset results.
- Confirm no Apps Script runtime errors appear in executions/logs.

## Marketplace Publishing Checklist

1. Open Google Cloud Console.
2. Open Google Workspace Marketplace SDK.
3. Configure App Configuration:
   - App type: Google Workspace Add-on.
   - Host app: Google Slides.
   - Deployment ID: latest Apps Script deployment.
4. Configure Store Listing:
   - App name: `SlideEngage`.
   - Short description from `MARKETPLACE.md`.
   - Full description from `MARKETPLACE.md`.
   - Category: Education or Productivity.
   - Support URL: `https://slide-engage.vercel.app/support`.
   - Privacy URL: `https://slide-engage.vercel.app/privacy`.
   - Terms URL: `https://slide-engage.vercel.app/terms`.
5. Upload icon and screenshots listed in `MARKETPLACE.md`.
6. Configure OAuth scopes.
7. Submit for verification/review.

## User Installation Flow After Marketplace Publishing

After publishing, users should not manually paste Apps Script.

Expected user flow:

1. Open Google Workspace Marketplace.
2. Search for `SlideEngage`.
3. Click Install.
4. Open Google Slides.
5. Go to `Extensions > Add-ons > SlideEngage`.
6. Open the SlideEngage sidebar.
7. Sign in with the same SlideEngage website account.
8. Select an event and insert interactions.

## Permission Error Handling

If the add-on cannot call `UrlFetchApp.fetch`, users will see:

```text
Please authorize SlideEngage to connect to the internet.
```

Fix:

1. Click `Authorize connection` in the sidebar.
2. Complete Google authorization.
3. Reload Google Slides if needed.
4. Open SlideEngage again.

If scopes changed after an earlier install, users must re-authorize the add-on.

## Current Google Slides Limitation

Google Slides does not support a fully live web view embedded directly inside the slide canvas. SlideEngage inserts native slide snapshots and provides snapshot updates. The real-time backend and participant join flow are shared with the website and PowerPoint add-in.
