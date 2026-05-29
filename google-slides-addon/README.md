# SlideEngage Google Slides Add-on

This folder contains the Marketplace-ready Google Slides add-on project.

## Files

- `appsscript.json`: Apps Script manifest with Google Slides add-on metadata and OAuth scopes.
- `Code.gs`: server-side Apps Script code for login, events, interactions, and slide insertion.
- `Sidebar.html`: Google Slides sidebar UI.
- `MARKETPLACE.md`: listing text, asset checklist, and publishing steps.

## Authentication

The add-on uses the same SlideEngage website login endpoint:

```text
POST https://slide-engage.vercel.app/api/auth/login
```

That means lecturers use the same email/Gmail and password as the SlideEngage website and PowerPoint add-in. The add-on stores only its own session copy in Google Apps Script user properties, so logging out of the add-on does not log the user out of the website.

## Development Install

1. Open a Google Slides presentation.
2. Choose `Extensions > Apps Script`.
3. Copy these files into the Apps Script project:
   - `appsscript.json`
   - `Code.gs`
   - `Sidebar.html`
4. Save.
5. Reload Google Slides.
6. Open `SlideEngage > Open SlideEngage`.
7. Click `Authorize connection` the first time, then approve the Google permission prompt.

## Production

Use Google Workspace Marketplace publishing so users can install without copying Apps Script code manually. See `MARKETPLACE.md`.

## Re-authorization After Scope Changes

If you add or change scopes in `appsscript.json`, redeploy the Apps Script/add-on and ask users to authorize again. Without re-authorization, login/API calls can fail with:

```text
You do not have permission to call UrlFetchApp.fetch
```
