# SlideEngage Google Workspace Marketplace Listing

## App Name

SlideEngage

## Short Description

Create live polls, quizzes, word clouds, ratings, open text prompts, and audience Q&A directly from Google Slides.

## Full Description

SlideEngage brings live audience engagement into Google Slides. Lecturers and presenters can sign in with the same SlideEngage account used on the website and PowerPoint add-in, select an event, create interactions, and insert polished presentation slides with QR codes and event codes.

SlideEngage supports:

- Multiple choice polls
- Open text responses
- Word clouds
- Ratings
- Quizzes
- Audience Q&A
- Event-based QR codes and join links
- Slide snapshots with live result previews

Students join from any device using the event QR code or event code. Presenters can update result snapshots from Google Slides while all event data stays connected to the same SlideEngage backend.

SlideEngage is designed for education, workshops, training sessions, meetings, and interactive presentations where presenters need simple audience participation without leaving their slide workflow.

## Support URL

https://slide-engage.vercel.app/support

## Privacy Policy URL

https://slide-engage.vercel.app/privacy

## Terms of Use URL

https://slide-engage.vercel.app/terms

## Homepage URL

https://slide-engage.vercel.app

## Category

Recommended:

- Education
- Productivity

## OAuth Scopes

Use the exact scopes in `appsscript.json`:

- `https://www.googleapis.com/auth/presentations.currentonly`
- `https://www.googleapis.com/auth/script.container.ui`
- `https://www.googleapis.com/auth/script.external_request`
- `https://www.googleapis.com/auth/userinfo.email`

Scope explanations for Google review:

- `presentations.currentonly`: SlideEngage inserts and updates interaction slides only in the current Google Slides presentation.
- `script.container.ui`: SlideEngage opens a sidebar panel inside Google Slides.
- `script.external_request`: SlideEngage calls the public SlideEngage backend for login, events, interactions, QR generation, and result snapshots.
- `userinfo.email`: Used for Google add-on authorization/account review context.

## Screenshot Checklist

Prepare screenshots before submission:

1. Google Slides menu showing `Extensions > Add-ons > SlideEngage`.
2. SlideEngage sidebar login screen.
3. Event selector with selected event and event code.
4. Interaction creation screen.
5. Multiple choice editor.
6. Word cloud editor.
7. Inserted SlideEngage slide with QR code and event code.
8. Student join page after scanning QR code.
9. Live results / snapshot update view if available.

Recommended screenshot dimensions:

- 1280x800 or larger for desktop screenshots.
- Clear, readable UI.
- No private email, tokens, or student data.

## Icon / Asset Checklist

Use the SlideEngage target logo assets from:

- `public/assets/icons/icon-16.png`
- `public/assets/icons/icon-32.png`
- `public/assets/icons/icon-64.png`
- `public/assets/icons/icon-80.png`
- `public/assets/icons/icon-128.png`
- `public/assets/icons/icon-256.png`
- `public/assets/icons/icon-512.png`

Marketplace commonly needs:

- 32x32 PNG
- 48x48 PNG
- 96x96 PNG
- 128x128 PNG
- 256x256 PNG

If Google requires 48x48 or 96x96 and those files are not present, export them from the 512x512 icon.

## Marketplace Configuration Checklist

1. Create or choose a Google Cloud project.
2. Enable Google Workspace Marketplace SDK.
3. Configure OAuth consent screen.
4. Add authorized domain:
   - `slide-engage.vercel.app`
5. Add support, privacy, and terms URLs.
6. Add the OAuth scopes above.
7. Create the Apps Script project.
8. Link Apps Script to the Google Cloud project.
9. Add:
   - `appsscript.json`
   - `Code.gs`
   - `Sidebar.html`
10. Deploy as Google Workspace Add-on.
11. Add the deployment ID to Marketplace SDK.
12. Configure listing text using this file.
13. Upload screenshots and icons.
14. Add private test users.
15. Test install from Marketplace private/test listing.
16. Submit for Google review.

## Functional Review Checklist

Before submission, test:

- Add-on installs without manual Apps Script paste.
- SlideEngage appears in Google Slides Add-ons/Extensions.
- Sidebar opens.
- Authorization prompt appears when required.
- Login works with the same SlideEngage website email/Gmail and password.
- Events load from SlideEngage.
- Archived events are hidden from normal event selectors.
- Interactions load for selected event.
- Multiple choice interaction can be created.
- Word cloud interaction can be created.
- Q&A interaction can be created.
- Slide snapshot inserts into the active presentation.
- Snapshot update works.
- Reset results works.
- Errors are readable, especially permission/network errors.

## User-Facing Installation Flow

After Marketplace publishing, the user flow should be:

1. User opens Google Workspace Marketplace.
2. User installs SlideEngage.
3. User opens Google Slides.
4. User opens `Extensions > Add-ons > SlideEngage`.
5. User logs in using their SlideEngage website account.
6. User selects an event.
7. User creates or edits interactions.
8. User inserts SlideEngage slides with QR code and event code.

Users should not manually paste Apps Script after Marketplace publishing.

## Technical Limitation Note

Google Slides does not provide the same live embedded web-rendering behavior as a browser presentation view. SlideEngage therefore inserts native slide snapshots and supports updating those snapshots from the add-on. Event data, participant join flow, and result APIs are still shared with the SlideEngage website and PowerPoint add-in.
