export const dynamic = 'force-static';

export function GET() {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SlideEngage Office Test</title>
    <script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>
    <style>
      :root {
        color-scheme: light;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background: linear-gradient(135deg, #0f8f45, #33d17a);
        color: white;
        display: grid;
        place-items: center;
      }
      main {
        width: min(420px, calc(100vw - 32px));
        border: 1px solid rgba(255, 255, 255, 0.35);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.16);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22);
        padding: 28px;
        backdrop-filter: blur(18px);
      }
      h1 {
        margin: 0 0 10px;
        font-size: 26px;
        line-height: 1.15;
      }
      p {
        margin: 0;
        line-height: 1.5;
      }
      #status {
        margin-top: 18px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.2);
        padding: 12px;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>SlideEngage Office Add-in Working</h1>
      <p>Taskpane loaded. This minimal page is safe for PowerPoint WebView testing.</p>
      <div id="status">Waiting for Office.js...</div>
    </main>
    <script>
      const status = document.getElementById('status');
      window.addEventListener('error', function (event) {
        status.textContent = 'Error: ' + event.message;
      });
      if (window.Office && Office.onReady) {
        Office.onReady(function (info) {
          status.textContent = info && info.host
            ? 'Office initialized: ' + info.host
            : 'Office.js loaded in browser preview mode';
          console.log('Office ready', info);
        });
      } else {
        status.textContent = 'Office.js is not available yet.';
      }
    </script>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
