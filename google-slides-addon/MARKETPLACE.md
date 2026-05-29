# SlideEngage Google Workspace Marketplace Preparation

## Listing Description

SlideEngage brings live audience engagement directly into Google Slides. Lecturers can sign in with the same SlideEngage account used on the website and PowerPoint add-in, select an event, create polls, quizzes, word clouds, open text prompts, ratings, and Audience Q&A, then insert polished interactive slides with QR codes and event codes. Students join from any device using one event link, while lecturers can update result snapshots inside Google Slides.

## Short Description

Create live polls, quizzes, word clouds, ratings, open text prompts, and Q&A in Google Slides using your SlideEngage account.

## OAuth Scopes

- `https://www.googleapis.com/auth/presentations.currentonly`
- `https://www.googleapis.com/auth/script.container.ui`
- `https://www.googleapis.com/auth/script.external_request`
- `https://www.googleapis.com/auth/userinfo.email`

Why:
- `presentations.currentonly`: insert and update SlideEngage slides in the current presentation only.
- `script.container.ui`: show the SlideEngage sidebar in Google Slides.
- `script.external_request`: call the public SlideEngage backend APIs.
- `userinfo.email`: identify the Google account during add-on authorization and review.

## Required Public URLs

- Privacy policy: `https://slide-engage.vercel.app/privacy`
- Terms of use: `https://slide-engage.vercel.app/terms`
- Support: `https://slide-engage.vercel.app/support`
- Application homepage: `https://slide-engage.vercel.app`

## Asset Checklist

- App icon 32x32 PNG
- App icon 48x48 PNG
- App icon 96x96 PNG
- App icon 128x128 PNG
- App icon 256x256 PNG
- Marketplace banner/screenshot showing the Google Slides sidebar
- Screenshot showing event selection
- Screenshot showing interaction editor
- Screenshot showing an inserted SlideEngage slide
- Screenshot showing student join page/QR flow

Use the SlideEngage green circle target logo assets from `public/assets/icons` or `public/office-addin`.

## Publishing Checklist

1. Create or open a Google Cloud project.
2. Enable Google Workspace Marketplace SDK.
3. Configure OAuth consent screen.
4. Add the OAuth scopes from `appsscript.json`.
5. Create an Apps Script project.
6. Upload:
   - `appsscript.json`
   - `Code.gs`
   - `Sidebar.html`
7. Set `SLIDEENGAGE_URL` in `Code.gs` to the production HTTPS domain.
8. Deploy the Apps Script as a Google Workspace Add-on.
9. Fill Marketplace listing details:
   - Name: `SlideEngage`
   - Short description from this file
   - Long description from this file
   - Category: Productivity or Education
   - Support URL, privacy URL, terms URL
10. Upload icons and screenshots.
11. Add test users for private testing.
12. Test install from Marketplace private listing.
13. Verify:
   - Sidebar opens
   - Login works with the same SlideEngage account
   - Events load
   - Interactions create/edit
   - Slide insertion works
   - Snapshot update works
14. Submit for Google review.

## Current Technical Limitation

Google Slides does not support true continuously embedded web views inside a slide canvas. SlideEngage therefore inserts a native Google Slides snapshot and provides an update action for result refresh. The live participant flow and backend data are shared with the website and PowerPoint add-in.
