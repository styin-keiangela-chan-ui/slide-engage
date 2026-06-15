export const dynamic = 'force-static';

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://slide-engage.vercel.app').replace(/\/$/, '');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function GET() {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SlideEngage PowerPoint Add-in</title>
    <script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
    <style>
      :root {
        color-scheme: light;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        --green: #168a3a;
        --green-dark: #0f6f2d;
        --green-soft: #eaf7ef;
        --ink: #191a2e;
        --muted: #68788a;
        --line: #dfe9e3;
        --bg: #f4f7f4;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background: var(--bg);
        color: var(--ink);
      }
      button, input, textarea, select {
        font: inherit;
      }
      button {
        cursor: pointer;
      }
      .header {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        border-bottom: 1px solid var(--line);
        background: white;
        padding: 9px 10px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .brand img {
        width: 30px;
        height: 30px;
        border-radius: 9px;
      }
      h1, h2, h3, p {
        margin: 0;
      }
      .brand-title {
        font-size: 15px;
        font-weight: 900;
      }
      .brand-subtitle {
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
      }
      .shell {
        padding: 10px 10px 60px;
      }
      .card {
        margin-bottom: 8px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: white;
        padding: 10px;
        box-shadow: 0 1px 2px rgba(25, 26, 46, 0.04);
      }
      .hidden { display: none !important; }
      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 7px;
      }
      .stack {
        display: grid;
        gap: 7px;
      }
      .muted {
        color: var(--muted);
      }
      .small {
        font-size: 12px;
      }
      .title {
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 900;
      }
      .input {
        width: 100%;
        min-width: 0;
        border: 1px solid var(--line);
        border-radius: 9px;
        background: white;
        padding: 8px 9px;
        color: var(--ink);
        outline: none;
      }
      .input:focus {
        border-color: var(--green);
        box-shadow: 0 0 0 3px rgba(22, 138, 58, 0.1);
      }
      .button {
        border: 1px solid transparent;
        border-radius: 9px;
        background: var(--green);
        padding: 8px 10px;
        font-size: 13px;
        color: white;
        font-weight: 900;
        transition: transform 120ms ease, filter 120ms ease, background 150ms ease, border-color 150ms ease;
      }
      .button:hover {
        background: var(--green-dark);
      }
      .button:active:not(:disabled),
      .button.pressed {
        transform: scale(0.97);
        filter: brightness(0.92);
      }
      .button.secondary {
        border-color: var(--line);
        background: white;
        color: var(--ink);
      }
      .button.secondary:hover {
        border-color: var(--green);
        background: var(--green-soft);
        color: var(--green);
      }
      .button.danger {
        border-color: #ffd7d7;
        background: #fff5f5;
        color: #b42318;
      }
      .button.full {
        width: 100%;
      }
      .button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
      .button.is-loading {
        cursor: wait;
        opacity: 0.82;
      }
      .button.is-success {
        border-color: var(--green);
        background: var(--green);
        color: white;
      }
      .button.is-error {
        border-color: #f0c6c6;
        background: #fff0f0;
        color: #b42318;
      }
      .spinner {
        display: inline-block;
        width: 12px;
        height: 12px;
        margin-right: 6px;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 999px;
        vertical-align: -2px;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .event-list {
        display: grid;
        gap: 6px;
      }
      .event-item, .interaction-item {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: white;
        padding: 8px;
        text-align: left;
      }
      .event-item.active {
        border-color: var(--green);
        background: var(--green-soft);
      }
      .event-name {
        font-weight: 900;
        font-size: 13px;
      }
      .code {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        background: var(--green-soft);
        padding: 4px 8px;
        color: var(--green);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-weight: 900;
      }
      .qr {
        display: block;
        width: 118px;
        height: 118px;
        margin: 10px auto;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: white;
        padding: 8px;
      }
      .template {
        display: grid;
        place-items: center;
        gap: 3px;
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: white;
        min-height: 58px;
        padding: 7px;
        text-align: center;
        font-weight: 900;
        font-size: 11px;
      }
      .template:hover {
        border-color: var(--green);
      }
      .template-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
      }
      .template-icon {
        display: grid;
        place-items: center;
        width: 24px;
        height: 24px;
        border-radius: 999px;
        background: var(--green-soft);
        color: var(--green);
        font-weight: 900;
      }
      .bar {
        height: 8px;
        overflow: hidden;
        border-radius: 999px;
        background: #e7eee9;
      }
      .bar > span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--green);
      }
      .pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: var(--green-soft);
        padding: 5px 9px;
        color: var(--green);
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .pill.closed { background: #f1f4f2; color: #68788a; }
      .pill.draft { background: #fff7df; color: #9a5b00; }
      .toolbar {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .main-actions {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
      }
      .compact-controls {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .advanced {
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #fbfffc;
        padding: 8px;
      }
      .advanced summary {
        cursor: pointer;
        font-size: 12px;
        font-weight: 900;
      }
      .interaction-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        align-items: center;
      }
      .row-actions {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .option-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
      }
      .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 10px;
      }
      .user-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .avatar {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: var(--green-soft);
        color: var(--green);
        display: grid;
        place-items: center;
        font-size: 13px;
        font-weight: 900;
      }
      .bottom-toolbar {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 5;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 6px;
        border-top: 1px solid var(--line);
        background: rgba(244, 247, 244, 0.96);
        padding: 8px 10px;
      }
      .preview {
        border: 1px dashed #b8dec5;
        border-radius: 14px;
        background: #fbfffc;
        padding: 12px;
      }
      .live-flash {
        animation: liveFlash 2s ease;
      }
      @keyframes liveFlash {
        0%, 100% { box-shadow: 0 1px 2px rgba(25, 26, 46, 0.04); }
        25% { box-shadow: 0 0 0 4px rgba(22, 138, 58, 0.18), 0 10px 26px rgba(14, 63, 34, 0.12); }
      }
      .preview-title {
        margin-bottom: 8px;
        font-size: 12px;
        color: var(--muted);
        font-weight: 900;
        text-transform: uppercase;
      }
      .status {
        margin-top: 8px;
        border-radius: 10px;
        background: #f9fbfa;
        padding: 10px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 800;
        line-height: 1.45;
      }
      .debug-panel {
        margin-top: 8px;
        border: 1px solid #d7e5dc;
        border-radius: 10px;
        background: #fbfffc;
        padding: 10px;
        color: #283548;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
      }
      [data-tooltip] {
        position: relative;
      }
      [data-tooltip]::after {
        content: attr(data-tooltip);
        position: absolute;
        left: 50%;
        bottom: calc(100% + 8px);
        z-index: 9999;
        max-width: 220px;
        width: max-content;
        transform: translateX(-50%) scale(0.96);
        border-radius: 8px;
        background: #1f2933;
        color: white;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.22);
        padding: 6px 9px;
        font-size: 11px;
        font-weight: 900;
        line-height: 1.25;
        opacity: 0;
        pointer-events: none;
        transition: opacity 180ms ease, transform 180ms ease;
        white-space: normal;
      }
      [data-tooltip]::before {
        content: "";
        position: absolute;
        left: 50%;
        bottom: calc(100% + 2px);
        z-index: 9999;
        transform: translateX(-50%) scale(0.96);
        border: 4px solid transparent;
        border-top-color: #1f2933;
        opacity: 0;
        pointer-events: none;
        transition: opacity 180ms ease, transform 180ms ease;
      }
      [data-tooltip]:hover::after,
      [data-tooltip]:focus::after,
      [data-tooltip]:focus-within::after,
      [data-tooltip]:hover::before,
      [data-tooltip]:focus::before,
      [data-tooltip]:focus-within::before {
        transform: translateX(-50%) scale(1);
        opacity: 1;
      }
    </style>
  </head>
  <body>
    <header class="header">
      <div class="brand">
        <img src="/assets/icons/icon-64.png" alt="SlideEngage" />
        <div>
          <div class="brand-title">SlideEngage</div>
          <div id="office-summary" class="brand-subtitle">PowerPoint add-in</div>
        </div>
      </div>
      <button id="logout-button" class="button secondary small hidden" type="button" title="Logout" aria-label="Logout">Logout</button>
    </header>

    <main class="shell">
      <section id="login-view" class="card">
        <h1 class="title">Lecturer login</h1>
        <form id="login-form" class="stack">
          <input id="email" class="input" autocomplete="email" placeholder="Email" />
          <input id="password" class="input" type="password" autocomplete="current-password" placeholder="Password" />
          <button id="login-button" class="button full" type="submit">Sign in</button>
        </form>
        <div id="login-debug" class="debug-panel" aria-live="polite">Email entered:
Supabase: NOT STARTED
API: NOT STARTED
Status:
Message:</div>
        <div id="login-status" class="status hidden" role="status" aria-live="polite"></div>
      </section>

      <section id="app-view" class="hidden">
        <section class="card user-row">
          <div class="row" style="justify-content:flex-start;min-width:0">
            <div id="user-avatar" class="avatar">A</div>
            <div style="min-width:0">
              <div id="user-name" class="event-name"></div>
              <div id="user-email" class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="row">
            <h2 class="title" style="margin:0">Event</h2>
            <span id="event-count" class="small muted">0 total</span>
          </div>
          <select id="event-select" class="input" style="margin-top:8px" aria-label="Select an event" data-tooltip="Select an event"></select>
          <div id="event-summary" class="small muted" style="margin-top:6px">Please select an event.</div>
          <button id="show-create-event-button" class="button secondary full" style="margin-top:8px" type="button" aria-label="Create a new event" data-tooltip="Create a new event">+ New Event</button>
          <div id="create-event-row" class="row hidden" style="margin-top:8px">
            <input id="event-name" class="input" placeholder="New event name" />
            <button id="create-event-button" class="button" type="button" aria-label="Create a new event" data-tooltip="Create a new event">Create</button>
          </div>
        </section>

        <section id="selected-event-card" class="card hidden">
          <div class="row">
            <div>
              <h2 id="selected-event-name" class="title" style="margin:0"></h2>
              <p id="selected-event-code" class="code" style="margin-top:6px"></p>
            </div>
            <span id="selected-event-status" class="small muted"></span>
          </div>
        </section>

        <section id="interaction-card" class="card hidden">
          <h2 class="title">Create new interaction</h2>
          <div id="templates" class="template-grid"></div>
        </section>

        <section id="interaction-editor" class="card hidden">
          <div class="row">
            <div>
              <h2 id="editor-title" class="title" style="margin:0">Interaction editor</h2>
              <p id="editor-status" class="small muted" style="margin-top:4px">Draft auto-save ready</p>
            </div>
            <button id="close-editor" class="button secondary small" type="button">Close</button>
          </div>
          <div class="stack" style="margin-top:12px">
            <textarea id="interaction-question" class="input" rows="3" placeholder="Question or prompt"></textarea>
            <div id="option-fields" class="stack"></div>
            <button id="add-option-button" class="button secondary full hidden" type="button">Add option</button>
            <details class="advanced">
              <summary>Advanced settings</summary>
              <div id="interaction-settings" class="stack" style="margin-top:8px"></div>
            </details>
            <div class="preview hidden">
              <div class="preview-title">Live editor preview</div>
              <div id="editor-preview" class="small muted">Choose an interaction type to start.</div>
            </div>
            <div class="main-actions">
              <button id="generate-slide-button" class="button small" type="button" aria-label="Present this interaction" data-tooltip="Present this interaction">Present</button>
              <button id="save-interaction-button" class="button secondary small" type="button" aria-label="Save interaction" data-tooltip="Save interaction">Save</button>
              <button id="reset-results-button" class="button danger small" type="button" aria-label="Reset participant responses" data-tooltip="Reset participant responses">Reset</button>
            </div>
            <div id="post-present-controls" class="compact-controls hidden">
              <button id="present-live-button" class="button secondary small" type="button" aria-label="View live results" data-tooltip="View live results">Live Results</button>
              <button id="live-toggle-button" class="button secondary small" type="button" aria-label="Stop accepting responses" data-tooltip="Stop accepting responses">Stop</button>
              <button id="delete-interaction-button" class="button danger small hidden" type="button" aria-label="Delete interaction" data-tooltip="Delete interaction">Delete</button>
            </div>
          </div>
        </section>

        <section id="results-card" class="card hidden">
          <div class="row">
            <h2 class="title" style="margin:0">Interactions</h2>
            <span id="interaction-count" class="small muted">0</span>
          </div>
          <div id="interaction-list" class="stack" style="margin-top:12px"></div>
          <div id="results-list" class="stack" style="margin-top:12px"></div>
        </section>

        <div id="app-status" class="status hidden" role="status" aria-live="polite"></div>
        <div class="bottom-toolbar">
          <button id="bottom-refresh-button" class="button secondary small" type="button" aria-label="Reload latest data" data-tooltip="Reload latest data">Refresh</button>
          <button id="bottom-present-button" class="button small" type="button" aria-label="Present this interaction" data-tooltip="Present this interaction">Present</button>
          <button id="bottom-results-button" class="button secondary small" type="button" aria-label="View live results" data-tooltip="View live results">Results</button>
        </div>
      </section>
    </main>

    <script>
      (function () {
        var APP_URL = "${appUrl}";
        var SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
        var SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};
        var SESSION_KEY = "slideengage_lecturer";
        var lecturer = null;
        var authClient = null;
        var events = [];
        var selectedEvent = null;
        var interactions = [];
        var selectedInteraction = null;
        var editorTemplate = null;
        var optionDrafts = [];
        var autosaveTimer = null;
        var resultsTimer = null;
        var liveSlideTimer = null;
        var liveSlideThrottleTimer = null;
        var liveSlideInteractionId = null;
        var liveSlideRefreshing = false;
        var liveSlideSnapshotUpdating = false;
        var liveSlideLastSignature = "";
        var liveSlideLastSnapshotAt = 0;
        var liveSlideQueuedSnapshot = null;
        var actionStates = {};
        var actionResetTimers = {};

        var actionLabels = {
          login: { ids: ["login-button"], idle: "Sign in", loading: "Signing in…", success: "Signed in ✓", error: "Sign in" },
          createEvent: { ids: ["create-event-button"], idle: "Create", loading: "Creating…", success: "Created ✓", error: "Create" },
          save: { ids: ["save-interaction-button"], idle: "Save", loading: "Saving…", success: "Saved ✓", error: "Save" },
          goLive: { ids: [], idle: "Present", loading: "Preparing…", success: "Presenting ✓", error: "Present" },
          close: { ids: ["live-toggle-button"], idle: "Stop", loading: "Stopping…", success: "Stopped ✓", error: "Stop" },
          reset: { ids: ["reset-results-button"], idle: "Reset", loading: "Resetting…", success: "Reset complete ✓", error: "Reset" },
          deleteInteraction: { ids: ["delete-interaction-button"], idle: "🗑 Delete Interaction", loading: "Deleting…", success: "Deleted ✓", error: "🗑 Delete Interaction" },
          addPresentation: { ids: ["generate-slide-button", "bottom-present-button"], idle: "Present", bottomIdle: "Present", loading: "Preparing…", success: "Presenting ✓", error: "Present" },
          presentLive: { ids: ["present-live-button", "bottom-results-button"], idle: "Live Results", resultsIdle: "Results", loading: "Opening…", success: "Opened ✓", error: "Live Results" },
          refresh: { ids: ["bottom-refresh-button"], idle: "Refresh", loading: "Refreshing…", success: "Updated ✓", error: "Refresh" }
        };

        var performanceConfig = {
          realtimePreviewInterval: 1000,
          slideSnapshotInterval: 3000,
          maxWordsRendered: "adaptive",
          disableHeavyAnimationInPowerPoint: true
        };

        var templates = [
          { label: "Poll", icon: "📊", type: "poll", config: { poll_kind: "multiple_choice", results_visible: true, voting_open: true }, options: ["Option 1", "Option 2"] },
          { label: "Text", icon: "📝", type: "feedback", config: { poll_kind: "open_text", include_open_text: true, anonymous: true, voting_open: true } },
          { label: "Word Cloud", icon: "☁️", type: "word_cloud", config: { max_words_per_participant: 3, allow_duplicate_words: true, voting_open: true } },
          { label: "Rating", icon: "⭐", type: "feedback", config: { poll_kind: "rating", include_star_ratings: true, scale: 5, voting_open: true } },
          { label: "Quiz", icon: "🎯", type: "quiz", config: { time_limit_seconds: 30, points: 100, voting_open: true }, options: [{ option_text: "Correct answer", is_correct: true }, { option_text: "Distractor", is_correct: false }] },
          { label: "Q&A", icon: "💬", type: "qa", config: { allow_anonymous_questions: true, moderation: false, voting_open: true } }
        ];

        function el(id) {
          return document.getElementById(id);
        }

        function addDebug(message) {
          console.log("[SlideEngage taskpane]", message);
        }

        function setStatus(id, message, isError) {
          var node = el(id);
          if (!message) {
            node.classList.add("hidden");
            node.textContent = "";
            return;
          }
          node.classList.remove("hidden");
          node.style.color = isError ? "#b42318" : "";
          node.textContent = message;
        }

        function setButtonLoading(id, isLoading, label) {
          var actionKey = id === "save-interaction-button" ? "save"
            : id === "live-toggle-button" ? (selectedInteraction && selectedInteraction.status === "live" ? "close" : "goLive")
            : id === "reset-results-button" ? "reset"
            : id === "delete-interaction-button" ? "deleteInteraction"
            : id === "generate-slide-button" ? "addPresentation"
            : id === "present-live-button" ? "presentLive"
            : id === "bottom-refresh-button" ? "refresh"
            : id === "create-event-button" ? "createEvent"
            : id === "login-button" ? "login"
            : "";
          if (actionKey) {
            setActionState(actionKey, isLoading ? "loading" : "idle", label);
            return;
          }
          var button = el(id);
          if (!button) return;
          button.disabled = !!isLoading;
          button.classList.toggle("is-loading", !!isLoading);
          button.classList.toggle("pressed", !!isLoading);
          button.setAttribute("aria-busy", isLoading ? "true" : "false");
          button.setAttribute("aria-disabled", isLoading ? "true" : "false");
          if (label) button.innerHTML = (isLoading ? '<span class="spinner"></span>' : "") + escapeHtml(label);
        }

        function actionButtonLabel(config, state, id, message) {
          if (message) return message;
          if (state === "loading") return config.loading;
          if (state === "success") return config.success;
          if (state === "error") return config.error;
          if (id === "bottom-present-button" && config.bottomIdle) return config.bottomIdle;
          if (id === "bottom-results-button" && config.resultsIdle) return config.resultsIdle;
          return config.idle;
        }

        function setActionState(actionKey, state, message) {
          var config = actionLabels[actionKey];
          if (!config) return;
          actionStates[actionKey] = state;
          if (actionResetTimers[actionKey]) {
            clearTimeout(actionResetTimers[actionKey]);
            actionResetTimers[actionKey] = null;
          }
          config.ids.forEach(function (id) {
            var button = el(id);
            if (!button) return;
            var label = actionButtonLabel(config, state, id, message);
            button.classList.remove("is-loading", "is-success", "is-error", "pressed");
            button.classList.toggle("is-loading", state === "loading");
            button.classList.toggle("is-success", state === "success");
            button.classList.toggle("is-error", state === "error");
            button.classList.toggle("pressed", state === "loading");
            button.disabled = state === "loading";
            button.setAttribute("aria-busy", state === "loading" ? "true" : "false");
            button.setAttribute("aria-disabled", state === "loading" ? "true" : "false");
            button.innerHTML = (state === "loading" ? '<span class="spinner"></span>' : "") + escapeHtml(label);
          });
          if (state === "success" || state === "error") {
            actionResetTimers[actionKey] = setTimeout(function () {
              setActionState(actionKey, "idle");
              updateEditorButtons();
            }, 1800);
          }
        }

        function isActionLoading(actionKey) {
          return actionStates[actionKey] === "loading";
        }

        function flashEditorCard() {
          var card = el("interaction-editor");
          if (!card) return;
          card.scrollIntoView({ block: "nearest", behavior: "smooth" });
          card.classList.remove("live-flash");
          void card.offsetWidth;
          card.classList.add("live-flash");
        }

        function showApp() {
          el("login-view").classList.add("hidden");
          el("app-view").classList.remove("hidden");
          el("logout-button").classList.remove("hidden");
          el("user-name").textContent = lecturer && (lecturer.name || lecturer.email) ? (lecturer.name || lecturer.email) : "Lecturer";
          el("user-email").textContent = lecturer && lecturer.email ? lecturer.email : "";
          el("user-avatar").textContent = (lecturer && (lecturer.name || lecturer.email) ? (lecturer.name || lecturer.email).charAt(0) : "A").toUpperCase();
          el("user-name").title = lecturer && lecturer.email ? lecturer.email : "";
          addDebug("Dashboard rendered");
        }

        function showLogin() {
          el("login-view").classList.remove("hidden");
          el("app-view").classList.add("hidden");
          el("logout-button").classList.add("hidden");
        }

        function parseStoredSession(raw) {
          if (!raw) return null;
          var parsed = JSON.parse(raw);
          if (parsed && parsed.lecturer) return parsed;
          if (parsed && parsed.id) {
            return {
              lecturer: parsed,
              expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
            };
          }
          return null;
        }

        function isSessionExpired(session) {
          if (!session || !session.expires_at) return false;
          return Date.now() > new Date(session.expires_at).getTime();
        }

        function updateLoginDebug(info) {
          var node = el("login-debug");
          if (!node) return;
          node.textContent =
            "Email entered: " + (info.email || "") + "\\n" +
            "Supabase: " + (info.supabase || "NOT STARTED") + "\\n" +
            "API: " + (info.api || "NOT STARTED") + "\\n" +
            "Status: " + (info.status || "") + "\\n" +
            "Message: " + (info.message || "");
        }

        function getAccessToken() {
          try {
            return localStorage.getItem("slideengage_access_token") || "";
          } catch {
            return "";
          }
        }

        function storeAuthTokens(session) {
          if (!session) return;
          try {
            if (session.access_token) localStorage.setItem("slideengage_access_token", session.access_token);
            if (session.refresh_token) localStorage.setItem("slideengage_refresh_token", session.refresh_token);
          } catch (error) {
            addDebug("Unable to persist Supabase tokens: " + (error && error.message ? error.message : "unknown error"));
          }
        }

        function getAuthClient() {
          if (authClient) return authClient;
          if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error("[SlideEngage taskpane] Missing Supabase public credentials");
            return null;
          }
          if (!window.supabase || !window.supabase.createClient) {
            console.error("[SlideEngage taskpane] Supabase client script unavailable");
            return null;
          }
          authClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: false,
              storageKey: "slideengage_office_auth",
            },
          });
          return authClient;
        }

        function saveSession(data, supabaseSession) {
          lecturer = data.lecturer;
          storeAuthTokens(supabaseSession || data.supabase_session || null);
          try {
            localStorage.setItem(SESSION_KEY, JSON.stringify({
              lecturer: data.lecturer,
              supabase_session: supabaseSession || data.supabase_session || null,
              expires_at: data.expires_at || new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
            }));
          } catch (error) {
            addDebug("Unable to persist Office session: " + (error && error.message ? error.message : "unknown error"));
          }
        }

        function clearSession() {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem("slideengage_access_token");
          localStorage.removeItem("slideengage_refresh_token");
          lecturer = null;
          events = [];
          selectedEvent = null;
          interactions = [];
          selectedInteraction = null;
          clearInterval(resultsTimer);
          stopLiveSlideRefresh();
          try {
            var client = getAuthClient();
            if (client && client.auth) client.auth.signOut();
          } catch (error) {
            addDebug("Supabase sign out skipped: " + (error && error.message ? error.message : "unknown error"));
          }
        }

        function safeJson(response) {
          return response.json().catch(function () {
            return {};
          });
        }

        function request(path, options) {
          var requestOptions = options || {};
          var url = /^https?:\/\//i.test(path) ? path : APP_URL + path;
          requestOptions.credentials = requestOptions.credentials || "same-origin";
          requestOptions.headers = Object.assign({}, requestOptions.headers || {});
          var token = getAccessToken();
          if (token && !requestOptions.headers.Authorization) {
            requestOptions.headers.Authorization = "Bearer " + token;
          }
          return fetch(url, requestOptions).then(function (response) {
            return safeJson(response).then(function (data) {
              if (!response.ok) {
                var error = new Error(data.error || data.message || "Request failed");
                error.status = response.status;
                error.payload = data;
                throw error;
              }
              return data;
            });
          });
        }

        function initializeOffice() {
          if (!window.Office || !Office.onReady) {
            el("office-summary").textContent = "Browser preview";
            addDebug("Office.js unavailable");
            return;
          }

          Office.onReady(function (info) {
            var host = info && info.host ? info.host : "browser";
            el("office-summary").textContent = host === "PowerPoint" ? "PowerPoint add-in" : "Browser preview";
            addDebug("Office ready");
          }).catch(function (error) {
            el("office-summary").textContent = "Office init failed";
            addDebug("Office init failed: " + (error && error.message ? error.message : "unknown error"));
          });
        }

        function restoreSession() {
          setStatus("login-status", "Checking login...", false);
          try {
            var session = parseStoredSession(localStorage.getItem(SESSION_KEY));
            if (session && !isSessionExpired(session)) {
              lecturer = session.lecturer;
              setStatus("login-status", "", false);
              addDebug("Auth loaded from Office storage");
              showApp();
              loadEvents();
              return;
            }
            clearSession();
            addDebug("Auth empty or expired");
            setStatus("login-status", session ? "Session expired. Please sign in again." : "Please sign in to continue.", !!session);
            showLogin();
          } catch (error) {
            clearSession();
            addDebug("Storage unavailable: " + error.message);
            setStatus("login-status", "Please sign in to continue.", false);
            showLogin();
          }
        }

        function login(event) {
          if (event && event.preventDefault) event.preventDefault();
          console.log("[SlideEngage taskpane] Sign in clicked");
          var email = el("email").value.trim();
          var password = el("password").value;
          console.log("[SlideEngage taskpane] Login email:", email);
          updateLoginDebug({
            email: email,
            supabase: "NOT STARTED",
            api: "NOT STARTED",
            status: "",
            message: ""
          });
          if (!email || !password) {
            updateLoginDebug({
              email: email,
              supabase: "NOT STARTED",
              api: "NOT STARTED",
              status: "",
              message: "Email and password required."
            });
            setStatus("login-status", "Email and password required.", true);
            return;
          }
          if (isActionLoading("login")) return;
          setActionState("login", "loading");
          setStatus("login-status", "Signing in...", false);
          updateLoginDebug({
            email: email,
            supabase: "PENDING",
            api: "NOT STARTED",
            status: "",
            message: "Signing in with Supabase..."
          });
          var client = getAuthClient();
          var authPromise = client && client.auth
            ? client.auth.signInWithPassword({ email: email, password: password })
            : Promise.reject(new Error("Supabase Auth is unavailable in this Office WebView."));

          authPromise.then(function (authResponse) {
            var supabaseSession = authResponse && authResponse.data ? authResponse.data.session : null;
            console.log("[SlideEngage taskpane] Supabase response:", {
              user: authResponse && authResponse.data && authResponse.data.user ? authResponse.data.user.email : null,
              hasSession: !!supabaseSession,
              error: authResponse && authResponse.error ? authResponse.error.message : null
            });
            if (authResponse && authResponse.error) {
              var authError = authResponse.error;
              updateLoginDebug({
                email: email,
                supabase: "FAILED",
                api: "SKIPPED",
                status: authError.status || authError.code || "",
                message: authError.message || "Invalid login credentials"
              });
              throw authError;
            }
            storeAuthTokens(supabaseSession);
            updateLoginDebug({
              email: email,
              supabase: "SUCCESS",
              api: "PENDING",
              status: "",
              message: "Supabase login succeeded. Checking SlideEngage API..."
            });
            return fetch(APP_URL + "/api/auth/login", {
              method: "POST",
              credentials: "same-origin",
              headers: {
                "Content-Type": "application/json",
                "Authorization": supabaseSession && supabaseSession.access_token ? "Bearer " + supabaseSession.access_token : ""
              },
              body: JSON.stringify({ email: email, password: password })
            }).then(function (response) {
              return safeJson(response).then(function (data) {
                console.log("[SlideEngage taskpane] API login result:", {
                  ok: response.ok,
                  status: response.status,
                  data: data
                });
                if (!response.ok) {
                  updateLoginDebug({
                    email: email,
                    supabase: "SUCCESS",
                    api: "FAILED",
                    status: response.status,
                    message: data.error || data.message || "API login failed"
                  });
                  var apiError = new Error(data.error || data.message || "API login failed");
                  apiError.status = response.status;
                  apiError.payload = data;
                  throw apiError;
                }
                updateLoginDebug({
                  email: email,
                  supabase: "SUCCESS",
                  api: "SUCCESS",
                  status: response.status,
                  message: "Signed in successfully."
                });
                return data;
              });
            }).then(function (data) {
              saveSession(data, supabaseSession);
              setStatus("login-status", "", false);
              setActionState("login", "success");
              addDebug("Supabase connected");
              showApp();
              loadEvents();
            });
          }).catch(function (error) {
            var message = /Failed to fetch|NetworkError|Load failed/i.test(error.message)
              ? "Network error. Check your internet connection and try again."
              : error.message;
            if (!/Supabase: FAILED|API: FAILED/.test(el("login-debug").textContent || "")) {
              updateLoginDebug({
                email: email,
                supabase: "FAILED",
                api: "SKIPPED",
                status: error.status || error.code || "",
                message: message || "Unable to sign in."
              });
            }
            console.error("[SlideEngage taskpane] Login failed:", message);
            setStatus("login-status", message, true);
            setActionState("login", "error");
            addDebug("Login failed: " + error.message);
          }).finally(function () {
            setActionState("login", actionStates.login === "error" ? "error" : actionStates.login);
          });
        }

        function loadEvents() {
          if (!lecturer) return;
          addDebug("Loading events");
          request("/api/events?lecturer_id=" + encodeURIComponent(lecturer.id), { cache: "no-store" })
            .then(function (data) {
              var hadSelection = !!selectedEvent;
              events = (data.events || []).filter(function (event) {
                return event && event.status !== "archived";
              });
              el("event-count").textContent = events.length + " total";
              if (selectedEvent && !events.some(function (event) { return event.id === selectedEvent.id; })) {
                selectedEvent = null;
                selectedInteraction = null;
                interactions = [];
                setStatus("app-status", "Please select an event.", false);
              }
              if (!selectedEvent && !hadSelection && events.length) selectedEvent = events[0];
              renderEvents();
              renderSelectedEvent();
              if (selectedEvent) loadInteractions();
            })
            .catch(function (error) {
              setStatus("app-status", error.message, true);
              addDebug("Events failed: " + error.message);
            });
        }

        function renderEvents() {
          var select = el("event-select");
          select.innerHTML = "";
          var placeholder = document.createElement("option");
          placeholder.value = "";
          placeholder.textContent = events.length ? "Select event" : "No events yet";
          select.appendChild(placeholder);
          if (!events.length) {
            el("event-summary").textContent = "Create an event to start using SlideEngage.";
            return;
          }
          events.forEach(function (event) {
            var option = document.createElement("option");
            option.value = event.id;
            option.textContent = (event.event_name || "Untitled event") + " (#" + event.event_code + ")";
            if (selectedEvent && selectedEvent.id === event.id) option.selected = true;
            select.appendChild(option);
          });
          el("event-summary").textContent = selectedEvent
            ? "Code: #" + selectedEvent.event_code + " | " + (selectedEvent.status || "closed")
            : "Please select an event.";
        }

        function renderSelectedEvent() {
          var card = el("selected-event-card");
          var interactionCard = el("interaction-card");
          var resultsCard = el("results-card");
          if (!selectedEvent) {
            card.classList.add("hidden");
            interactionCard.classList.add("hidden");
            resultsCard.classList.add("hidden");
            return;
          }
          card.classList.remove("hidden");
          interactionCard.classList.remove("hidden");
          resultsCard.classList.remove("hidden");
          el("selected-event-name").textContent = selectedEvent.event_name || "Untitled event";
          el("selected-event-code").textContent = "#" + selectedEvent.event_code;
          el("selected-event-status").textContent = selectedEvent.status || "closed";
          renderTemplates();
        }

        function createEvent() {
          if (!lecturer) return;
          var name = el("event-name").value.trim();
          if (!name) {
            setStatus("app-status", "Enter an event name.", true);
            return;
          }
          if (isActionLoading("createEvent")) return;
          setActionState("createEvent", "loading");
          var code = Math.random().toString(36).slice(2, 8).toUpperCase();
          request("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lecturer_id: lecturer.id, event_name: name, event_code: code, status: "closed" })
          }).then(function (data) {
            selectedEvent = data.event;
            el("event-name").value = "";
            el("create-event-row").classList.add("hidden");
            setActionState("createEvent", "success");
            setStatus("app-status", "Event created.", false);
            loadEvents();
          }).catch(function (error) {
            setActionState("createEvent", "error");
            setStatus("app-status", error.message, true);
          }).finally(function () {
            renderEvents();
          });
        }

        function updateEventStatus(status) {
          if (!selectedEvent) return Promise.resolve();
          return request("/api/events", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: selectedEvent.id, status: status })
          }).then(function (data) {
            selectedEvent = data.event || selectedEvent;
            renderSelectedEvent();
            return data;
          });
        }

        function renderTemplates() {
          var list = el("templates");
          list.innerHTML = "";
          templates.forEach(function (template) {
            var button = document.createElement("button");
            button.type = "button";
            button.className = "template";
            button.setAttribute("aria-label", tooltipForTemplate(template.label));
            button.setAttribute("data-tooltip", tooltipForTemplate(template.label));
            button.innerHTML = '<span class="template-icon"></span><span></span>';
            button.querySelector(".template-icon").textContent = template.icon;
            button.querySelector("span:last-child").textContent = template.label;
            button.onclick = function () {
              openInteractionEditor(null, template);
            };
            list.appendChild(button);
          });
        }

        function tooltipForTemplate(label) {
          if (label === "Multiple choice") return "Create a poll with answer options";
          if (label === "Poll") return "Create a poll with answer options";
          if (label === "Open text") return "Collect text responses from participants";
          if (label === "Text") return "Collect text responses from participants";
          if (label === "Word cloud") return "Create a live word cloud";
          if (label === "Word") return "Create a live word cloud";
          if (label === "Rating") return "Collect rating feedback";
          if (label === "Quiz") return "Create a scored quiz";
          if (label === "Audience Q&A") return "Allow audience questions";
          if (label === "Q&A") return "Allow audience questions";
          return "Create interaction";
        }

        function tooltipForStatus(status) {
          if (status === "live") return "This interaction is currently accepting responses";
          if (status === "closed") return "This interaction is closed";
          return "This interaction is not live yet";
        }

        function loadInteractions() {
          if (!selectedEvent) return;
          request("/api/interactions?event_id=" + encodeURIComponent(selectedEvent.id), { cache: "no-store" })
            .then(function (data) {
              interactions = data.interactions || [];
              renderInteractions();
              if (selectedInteraction) {
                selectedInteraction = findInteraction(selectedInteraction.id) || selectedInteraction;
                renderEditor();
              }
            })
            .catch(function (error) {
              setStatus("app-status", error.message, true);
            });
        }

        function renderInteractions() {
          var list = el("interaction-list");
          list.innerHTML = "";
          el("interaction-count").textContent = interactions.length + "";
          if (!interactions.length) {
            list.innerHTML = '<div class="muted small">Interactions will appear here.</div>';
            el("results-list").innerHTML = "";
            return;
          }
          interactions.forEach(function (interaction) {
            try {
              var item = document.createElement("div");
              item.className = "interaction-item";
              item.setAttribute("role", "button");
              item.setAttribute("tabindex", "0");
              item.innerHTML = '<div class="interaction-row"><div style="min-width:0"><div class="event-name"></div><div class="small muted"></div></div><div class="row-actions"><button class="button secondary small" type="button" aria-label="Edit interaction" data-tooltip="Edit interaction">Edit</button><button class="button small" type="button" aria-label="Present this interaction" data-tooltip="Present this interaction">Present</button></div></div>';
              var titleEl = item.querySelector(".event-name");
              var typeEl = item.querySelector(".small.muted");
              if (titleEl) titleEl.textContent = interaction.title || "Untitled";
              if (typeEl) typeEl.textContent = labelForInteraction(interaction) + " · " + (interaction.status || "draft");
              item.setAttribute("aria-label", "Edit question and settings");
              item.setAttribute("data-tooltip", "Edit question and settings");
              item.onclick = function () {
                try {
                  openInteractionEditor(interaction, templateForInteraction(interaction));
                } catch (error) {
                  setStatus("app-status", error && error.message ? error.message : "Unable to open interaction.", true);
                  addDebug("Open interaction failed: " + (error && error.message ? error.message : "unknown error"));
                }
              };
              item.onkeydown = function (event) {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  item.click();
                }
              };
              var buttons = item.querySelectorAll("button");
              if (buttons[0]) {
                buttons[0].onclick = function (event) {
                  event.stopPropagation();
                  openInteractionEditor(interaction, templateForInteraction(interaction));
                };
              }
              if (buttons[1]) {
                buttons[1].onclick = function (event) {
                  event.stopPropagation();
                  openInteractionEditor(interaction, templateForInteraction(interaction));
                  ensureInteractionLive(interaction).then(function (liveInteraction) {
                    presentInteraction(liveInteraction);
                  }).catch(function (error) {
                    setActionState("addPresentation", "error");
                    setStatus("app-status", error.message, true);
                  });
                };
              }
              list.appendChild(item);
            } catch (error) {
              addDebug("Interaction card skipped: " + (error && error.message ? error.message : "unknown error"));
            }
          });
        }

        function findInteraction(id) {
          for (var i = 0; i < interactions.length; i += 1) {
            if (interactions[i].id === id) return interactions[i];
          }
          return null;
        }

        function labelForInteraction(interaction) {
          var config = interaction.config || {};
          if (interaction.type === "poll") return "Poll";
          if (interaction.type === "quiz") return "Quiz";
          if (interaction.type === "word_cloud") return "Word Cloud";
          if (interaction.type === "qa") return "Q&A";
          if (interaction.type === "feedback" && config.poll_kind === "rating") return "Rating";
          if (interaction.type === "feedback") return "Text";
          return interaction.type || "Interaction";
        }

        function templateForInteraction(interaction) {
          var label = labelForInteraction(interaction);
          for (var i = 0; i < templates.length; i += 1) {
            if (templates[i].label === label) return templates[i];
          }
          return templates[0];
        }

        function needsOptions(template) {
          return template && (template.type === "poll" || template.type === "quiz");
        }

        function minOptions(template) {
          return needsOptions(template) ? 2 : 0;
        }

        function normalizeOptions(options) {
          return (options || []).slice().sort(function (a, b) {
            return (a.position || 0) - (b.position || 0);
          }).map(function (option) {
            return {
              option_text: option.option_text || "",
              is_correct: !!option.is_correct
            };
          });
        }

        function createInteraction(template, callback) {
          if (!selectedEvent) {
            setStatus("app-status", "Please select or create an event before adding interactions.", true);
            return;
          }
          request("/api/interactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_id: selectedEvent.id,
              type: template.type,
              title: template.label + " question",
              config: template.config || {},
              options: (template.options || []).map(function (option) {
                return typeof option === "string" ? { option_text: option } : option;
              })
            })
          }).then(function () {
            setStatus("app-status", template.label + " created.", false);
            loadInteractions();
            if (callback) callback();
          }).catch(function (error) {
            setStatus("app-status", error.message, true);
          });
        }

        function openInteractionEditor(interaction, template) {
          if (!selectedEvent) {
            setStatus("app-status", "Please select or create an event before adding interactions.", true);
            return;
          }
          selectedInteraction = interaction || null;
          editorTemplate = template || (interaction ? templateForInteraction(interaction) : templates[0]);
          optionDrafts = interaction && interaction.interaction_options
            ? normalizeOptions(interaction.interaction_options)
            : normalizeOptions((editorTemplate.options || []).map(function (option) {
                return typeof option === "string" ? { option_text: option } : option;
              }));
          el("interaction-editor").classList.remove("hidden");
          renderEditor();
          if (selectedInteraction) loadResults(selectedInteraction.id);
        }

        function renderEditor() {
          if (!editorTemplate) return;
          var label = editorTemplate.label;
          var config = selectedInteraction && selectedInteraction.config ? selectedInteraction.config : (editorTemplate.config || {});
          el("editor-title").textContent = label;
          el("editor-status").textContent = selectedInteraction ? ("Status: " + (selectedInteraction.status || "draft")) : "New draft";
          el("interaction-question").value = selectedInteraction ? (selectedInteraction.title || "") : "";
          if (!selectedInteraction && !el("interaction-question").value) {
            el("interaction-question").value = defaultQuestion(label);
          }
          renderOptionFields();
          renderSettings(config);
          renderEditorPreview();
          updateEditorButtons();
        }

        function defaultQuestion(label) {
          if (label === "Poll") return "How familiar are you with the topic?";
          if (label === "Word Cloud") return "In one word, describe today's topic";
          if (label === "Text") return "What should we discuss next?";
          if (label === "Rating") return "How would you rate this session?";
          if (label === "Quiz") return "Which answer is correct?";
          if (label === "Q&A") return "What questions should we answer?";
          return "Untitled interaction";
        }

        function renderOptionFields() {
          var holder = el("option-fields");
          holder.innerHTML = "";
          el("add-option-button").classList.toggle("hidden", !needsOptions(editorTemplate));
          if (!needsOptions(editorTemplate)) return;
          optionDrafts.forEach(function (option, index) {
            var row = document.createElement("div");
            row.className = "option-row";
            row.innerHTML = '<input class="input" placeholder="Option" /><button class="button secondary" type="button">Remove</button>';
            row.querySelector("input").value = option.option_text || "";
            row.querySelector("input").oninput = function () {
              optionDrafts[index].option_text = this.value;
              scheduleAutosave();
              renderEditorPreview();
            };
            row.querySelector("button").onclick = function () {
              if (optionDrafts.length <= minOptions(editorTemplate)) {
                setStatus("app-status", "At least two options are required.", true);
                return;
              }
              optionDrafts.splice(index, 1);
              renderOptionFields();
              renderEditorPreview();
              scheduleAutosave();
            };
            holder.appendChild(row);
            if (editorTemplate.type === "quiz") {
              var correct = document.createElement("label");
              correct.className = "toggle-row small";
              correct.innerHTML = '<span>Correct answer</span><input type="checkbox" />';
              correct.querySelector("input").checked = !!option.is_correct;
              correct.querySelector("input").onchange = function () {
                for (var i = 0; i < optionDrafts.length; i += 1) optionDrafts[i].is_correct = false;
                optionDrafts[index].is_correct = this.checked;
                renderOptionFields();
                scheduleAutosave();
              };
              holder.appendChild(correct);
            }
          });
        }

        function renderSettings(config) {
          var holder = el("interaction-settings");
          holder.innerHTML = "";
          if (!editorTemplate) return;
          if (editorTemplate.label === "Word Cloud") {
            holder.appendChild(numberSetting("Max words per participant", "max_words_per_participant", config.max_words_per_participant || 3));
            holder.appendChild(toggleSetting("Allow duplicate words", "allow_duplicate_words", config.allow_duplicate_words !== false));
          }
          if (editorTemplate.label === "Text") {
            holder.appendChild(numberSetting("Character limit", "character_limit", config.character_limit || 240));
            holder.appendChild(toggleSetting("Anonymous responses", "anonymous", config.anonymous !== false));
          }
          if (editorTemplate.label === "Poll") {
            holder.appendChild(toggleSetting("Multiple answers", "allow_multiple_answers", !!config.allow_multiple_answers));
            holder.appendChild(toggleSetting("Show respondent names", "show_respondent_names", !!config.show_respondent_names));
            holder.appendChild(toggleSetting("Poll results visible", "results_visible", config.results_visible !== false));
            holder.appendChild(toggleSetting("Poll description", "poll_description_enabled", !!config.poll_description_enabled));
          }
          if (editorTemplate.label === "Rating") {
            holder.appendChild(numberSetting("Rating scale", "scale", config.scale || 5));
          }
          if (editorTemplate.label === "Quiz") {
            holder.appendChild(numberSetting("Timer seconds", "time_limit_seconds", config.time_limit_seconds || 30));
            holder.appendChild(numberSetting("Points", "points", config.points || 100));
          }
          if (editorTemplate.label === "Q&A") {
            holder.appendChild(toggleSetting("Moderation", "moderation", !!config.moderation));
            holder.appendChild(toggleSetting("Replies", "replies_enabled", !!config.replies_enabled));
            holder.appendChild(numberSetting("Character limit", "character_limit", config.character_limit || 160));
            holder.appendChild(toggleSetting("Labels", "labels_enabled", !!config.labels_enabled));
            holder.appendChild(toggleSetting("Downvotes", "downvotes_enabled", !!config.downvotes_enabled));
            holder.appendChild(toggleSetting("Anonymous questions", "allow_anonymous_questions", config.allow_anonymous_questions !== false));
          }
        }

        function numberSetting(label, key, value) {
          var row = document.createElement("label");
          row.className = "toggle-row small";
          row.innerHTML = '<span></span><input class="input" style="width:86px" type="number" min="1" />';
          row.querySelector("span").textContent = label;
          row.querySelector("input").value = value;
          row.querySelector("input").setAttribute("data-config-key", key);
          row.querySelector("input").oninput = scheduleAutosave;
          return row;
        }

        function toggleSetting(label, key, value) {
          var row = document.createElement("label");
          row.className = "toggle-row small";
          row.innerHTML = '<span></span><input type="checkbox" />';
          row.querySelector("span").textContent = label;
          row.querySelector("input").checked = !!value;
          row.querySelector("input").setAttribute("data-config-key", key);
          row.querySelector("input").onchange = scheduleAutosave;
          return row;
        }

        function collectConfig() {
          var config = {};
          var base = editorTemplate && editorTemplate.config ? editorTemplate.config : {};
          Object.keys(base).forEach(function (key) { config[key] = base[key]; });
          var fields = el("interaction-settings").querySelectorAll("[data-config-key]");
          for (var i = 0; i < fields.length; i += 1) {
            var key = fields[i].getAttribute("data-config-key");
            if (fields[i].type === "checkbox") config[key] = fields[i].checked;
            else config[key] = Number(fields[i].value || 0);
          }
          return config;
        }

        function collectEditorPayload() {
          var question = el("interaction-question").value.trim();
          var options = optionDrafts.filter(function (option) {
            return option.option_text && option.option_text.trim();
          }).map(function (option) {
            return { option_text: option.option_text.trim(), is_correct: !!option.is_correct };
          });
          return {
            title: question,
            type: editorTemplate.type,
            config: collectConfig(),
            options: needsOptions(editorTemplate) ? options : []
          };
        }

        function validateEditor(payload) {
          if (!payload.title) return "Question is required.";
          if (needsOptions(editorTemplate) && payload.options.length < 2) return "At least two options are required.";
          if (editorTemplate.type === "quiz") {
            var correct = payload.options.filter(function (option) { return option.is_correct; });
            if (!correct.length) return "Choose the correct answer.";
          }
          return "";
        }

        function saveEditor(isAuto, callback) {
          if (!selectedEvent || !editorTemplate) return;
          var payload = collectEditorPayload();
          var validation = validateEditor(payload);
          if (validation) {
            if (!isAuto) setStatus("app-status", validation, true);
            return;
          }
          if (!isAuto) {
            if (isActionLoading("save")) return;
            setActionState("save", "loading");
          }
          var body = selectedInteraction
            ? { id: selectedInteraction.id, title: payload.title, config: payload.config, options: payload.options }
            : { event_id: selectedEvent.id, type: payload.type, title: payload.title, config: payload.config, options: payload.options };
          request("/api/interactions", {
            method: selectedInteraction ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          }).then(function (data) {
            selectedInteraction = data.interaction;
            el("editor-status").textContent = isAuto ? "Draft saved" : "Saved";
            if (!isAuto) {
              setActionState("save", "success");
              setStatus("app-status", "Saved ✓", false);
            }
            loadInteractions();
            if (callback) callback(data.interaction);
          }).catch(function (error) {
            if (!isAuto) {
              setActionState("save", "error");
              setStatus("app-status", error.message || "Unable to complete. Please try again.", true);
            }
          }).finally(function () {
            if (!isAuto) updateEditorButtons();
          });
        }

        function scheduleAutosave() {
          renderEditorPreview();
          clearTimeout(autosaveTimer);
          el("editor-status").textContent = "Saving draft...";
          autosaveTimer = setTimeout(function () {
            saveEditor(true);
          }, 900);
        }

        function updateEditorButtons() {
          var hasSelected = !!selectedInteraction;
          var canPresent = hasSelected || !!editorTemplate;
          el("present-live-button").disabled = !hasSelected || isActionLoading("presentLive");
          el("generate-slide-button").disabled = !canPresent || isActionLoading("addPresentation");
          el("live-toggle-button").disabled = !hasSelected || isActionLoading("goLive") || isActionLoading("close");
          el("reset-results-button").disabled = !hasSelected || isActionLoading("reset");
          el("delete-interaction-button").disabled = !hasSelected || isActionLoading("deleteInteraction");
          el("post-present-controls").classList.toggle("hidden", !hasSelected || selectedInteraction.status !== "live");
          if (hasSelected) {
            if (!isActionLoading("goLive") && !isActionLoading("close") && actionStates.goLive !== "success" && actionStates.close !== "success") {
              el("live-toggle-button").textContent = "Stop";
            }
            el("live-toggle-button").className = selectedInteraction.status === "live" ? "button secondary small" : "button secondary small";
            el("live-toggle-button").setAttribute("aria-label", "Stop accepting responses");
            el("live-toggle-button").setAttribute("data-tooltip", "Stop accepting responses");
          } else {
            if (!isActionLoading("goLive") && !isActionLoading("close")) el("live-toggle-button").textContent = "Stop";
            el("live-toggle-button").setAttribute("aria-label", "Stop accepting responses");
            el("live-toggle-button").setAttribute("data-tooltip", "Stop accepting responses");
          }
        }

        function renderEditorPreview() {
          var payload = collectEditorPayload();
          var node = el("editor-preview");
          var html = '<strong>' + escapeHtml(payload.title || "Question preview") + '</strong>';
          if (payload.options && payload.options.length) {
            html += '<div class="stack" style="margin-top:10px">';
            payload.options.forEach(function (option, index) {
              html += '<div class="small">' + String.fromCharCode(65 + index) + '. ' + escapeHtml(option.option_text) + (option.is_correct ? ' <span class="pill">correct</span>' : '') + '</div>';
            });
            html += '</div>';
          } else if (editorTemplate) {
            html += '<div class="small muted" style="margin-top:8px">' + escapeHtml(editorTemplate.label) + ' responses will appear live.</div>';
          }
          node.innerHTML = html;
        }

        function escapeHtml(value) {
          return String(value || "").replace(/[&<>"']/g, function (char) {
            return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char];
          });
        }

        function patchInteractionStatus(status) {
          var ready = status === "live" && selectedEvent && selectedEvent.status !== "live"
            ? updateEventStatus("live")
            : Promise.resolve();
          return ready.then(function () {
            return request("/api/interactions", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: selectedInteraction.id, status: status })
            });
          });
        }

        function applyInteractionStatusResult(data, status) {
          selectedInteraction = data.interaction;
          if (status !== "live" && liveSlideInteractionId === selectedInteraction.id) stopLiveSlideRefresh();
          updateEditorButtons();
          loadInteractions();
          return selectedInteraction;
        }

        function ensureInteractionLive(interaction) {
          if (!interaction) return Promise.reject(new Error("Select or create an interaction before adding it to the presentation."));
          selectedInteraction = interaction;
          if (selectedInteraction.status === "live") return Promise.resolve(selectedInteraction);
          setStatus("app-status", "Starting interaction...", false);
          return patchInteractionStatus("live").then(function (data) {
            var liveInteraction = applyInteractionStatusResult(data, "live");
            setStatus("app-status", "Interaction is live.", false);
            return liveInteraction;
          });
        }

        function setInteractionStatus(status) {
          if (!selectedInteraction) return;
          var actionKey = status === "live" ? "goLive" : "close";
          if (isActionLoading(actionKey)) return;
          setActionState(actionKey, "loading");
          patchInteractionStatus(status).then(function (data) {
              applyInteractionStatusResult(data, status);
              selectedInteraction = data.interaction;
              setActionState(actionKey, "success");
              setStatus("app-status", status === "live" ? "Live result is now active." : "Interaction closed.", false);
            }).catch(function (error) {
              setActionState(actionKey, "error");
              setStatus("app-status", error.message || "Unable to complete. Please try again.", true);
            }).finally(function () {
              updateEditorButtons();
            });
        }

        function toggleLiveStatus() {
          if (!selectedInteraction) return;
          setInteractionStatus(selectedInteraction.status === "live" ? "closed" : "live");
        }

        function resetResults() {
          if (!selectedInteraction) return;
          if (!confirm("Reset all participant responses for this interaction? This keeps the question, options, settings, and event.")) return;
          if (isActionLoading("reset")) return;
          setActionState("reset", "loading");
          request("/api/responses?interaction_id=" + encodeURIComponent(selectedInteraction.id), {
            method: "DELETE"
          }).then(function (data) {
            addDebug("Reset results: interaction_id=" + (data.interaction_id || selectedInteraction.id) + ", responses_deleted=" + (data.responses_deleted || 0) + ", timestamp=" + (data.timestamp || new Date().toISOString()));
            setActionState("reset", "success");
            setStatus("app-status", "Results reset.", false);
            loadResults(selectedInteraction.id);
          }).catch(function (error) {
            setActionState("reset", "error");
            setStatus("app-status", error.message || "Unable to complete. Please try again.", true);
          }).finally(function () {
            updateEditorButtons();
          });
        }

        function deleteInteraction(interaction) {
          var target = interaction || selectedInteraction;
          if (!target) return;
          if (target.status === "live" && !confirm("This interaction is currently live.\\n\\nDeleting it will immediately stop participant submissions and remove all collected responses.")) {
            return;
          }
          if (!confirm("Delete Interaction?\\n\\nAre you sure you want to delete this interaction?\\n\\nThis action cannot be undone.")) {
            return;
          }
          if (isActionLoading("deleteInteraction")) return;
          setActionState("deleteInteraction", "loading");
          request("/api/interactions?id=" + encodeURIComponent(target.id) + "&confirm_live=true", {
            method: "DELETE"
          }).then(function (data) {
            interactions = interactions.filter(function (item) { return item.id !== target.id; });
            if (selectedInteraction && selectedInteraction.id === target.id) {
              selectedInteraction = null;
              editorTemplate = null;
              optionDrafts = [];
              el("interaction-editor").classList.add("hidden");
              el("results-list").innerHTML = "";
            }
            renderInteractions();
            updateEditorButtons();
            setActionState("deleteInteraction", "success");
            setStatus("app-status", "Interaction deleted.", false);
          }).catch(function (error) {
            setActionState("deleteInteraction", "error");
            setStatus("app-status", error.message || "Unable to complete. Please try again.", true);
          }).finally(function () {
            updateEditorButtons();
          });
        }

        function presenterUrl() {
          if (!selectedEvent || !selectedEvent.event_code) return "";
          return APP_URL + "/present/" + encodeURIComponent(selectedEvent.event_code) + "?officePresenter=1&source=powerpoint";
        }

        function presentLive() {
          if (isActionLoading("presentLive")) return;
          if (selectedEvent && editorTemplate) {
            var validation = validateEditor(collectEditorPayload());
            if (validation) {
              setStatus("app-status", validation, true);
              return;
            }
          }
          setActionState("presentLive", "loading");
          saveEditor(false, function () {
            ensureInteractionLive(selectedInteraction).then(function () {
              openPresenterWindow();
            }).catch(function (error) {
              setActionState("presentLive", "error");
              setStatus("app-status", error.message || "Unable to complete. Please try again.", true);
            });
          });
        }

        function presentSelectedInteraction() {
          if (isActionLoading("addPresentation")) return;
          if (selectedEvent && editorTemplate) {
            var validation = validateEditor(collectEditorPayload());
            if (validation) {
              setStatus("app-status", validation, true);
              return;
            }
          }
          setActionState("addPresentation", "loading", "Preparing…");
          saveEditor(false, function (interaction) {
            ensureInteractionLive(interaction).then(function (liveInteraction) {
              presentInteraction(liveInteraction);
            }).catch(function (error) {
              setActionState("addPresentation", "error");
              setStatus("app-status", error.message, true);
            });
          });
        }

        function openPresenterWindow() {
          if (!selectedEvent) {
            setStatus("app-status", "Select an event before presenting live.", true);
            return;
          }
          if (!selectedInteraction) {
            setStatus("app-status", "Select or create an interaction before presenting live.", true);
            return;
          }
          var url = presenterUrl();
          if (!url) {
            setStatus("app-status", "Presenter URL is unavailable.", true);
            return;
          }
          addDebug("Opening live presenter: " + url);
          try {
            if (window.Office && Office.context && Office.context.ui && Office.context.ui.openBrowserWindow) {
              Office.context.ui.openBrowserWindow(url);
            } else {
              window.open(url, "_blank", "noopener,noreferrer");
            }
            setActionState("presentLive", "success");
            setStatus("app-status", "Live Results opened.", false);
          } catch (error) {
            setActionState("presentLive", "error");
            setStatus("app-status", "Unable to open live presenter: " + (error && error.message ? error.message : "unknown error"), true);
          }
        }

        function presentInteraction(interaction, presentOptions) {
          if (!selectedEvent || !interaction) return;
          presentOptions = presentOptions || {};
          if (!presentOptions.silent) {
            setActionState("addPresentation", "loading", "Preparing…");
            setStatus("app-status", "Creating PowerPoint slide...", false);
          }
          if (!presentOptions.silent) {
            addDebug("Present interaction: " + (interaction.id || "missing id"));
            addDebug("Event code: " + selectedEvent.event_code);
            addDebug("Question: " + (interaction.title || "Untitled"));
          }
          var slideOptions = normalizeOptions(interaction.interaction_options || optionDrafts).map(function (option) {
            return { option_text: option.option_text, is_correct: !!option.is_correct };
          }).filter(function (option) {
            return !!option.option_text;
          });
          if (!presentOptions.silent) addDebug("Options: " + slideOptions.length);
          if (!presentOptions.silent) setActionState("addPresentation", "loading", "Presenting…");
          return insertInteractionSlide(interaction, slideOptions, { results: [], total_responses: 0 }, false)
            .then(function (inserted) {
              if (!presentOptions.silent && inserted !== false) {
                setActionState("addPresentation", "success");
                setStatus("app-status", "Presenting ✓", false);
                flashEditorCard();
              } else if (!presentOptions.silent) {
                setActionState("addPresentation", "error");
              }
              return inserted;
            }).catch(function (error) {
              if (!presentOptions.silent) {
                setActionState("addPresentation", "error");
                setStatus("app-status", error.message || "Unable to complete. Please try again.", true);
              }
              throw error;
            }).finally(function () {
              if (!presentOptions.silent) updateEditorButtons();
            });
        }

        function openPollEditor() {
          openInteractionEditor(null, templates[0]);
        }

        function insertPollSlide(interactionId, question, options) {
          if (!selectedEvent) return Promise.resolve();
          if (!options || options.length < 2) {
            setStatus("app-status", "This slide type needs at least two options.", true);
            return Promise.resolve();
          }
          var joinUrl = APP_URL + "/join?code=" + encodeURIComponent(selectedEvent.event_code);
          return request("/api/powerpoint/poll-slide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              interactionId: interactionId,
              question: question,
              options: options,
              eventCode: selectedEvent.event_code,
              joinUrl: joinUrl
            })
          }).then(function (data) {
            if (window.Office && Office.context && Office.context.document && Office.context.document.insertFileFromBase64Async) {
              Office.context.document.insertFileFromBase64Async(data.base64, function (result) {
                if (result.status === Office.AsyncResultStatus.Succeeded) {
                  setStatus("app-status", "Poll saved and inserted into PowerPoint.", false);
                } else {
                  setStatus("app-status", result.error && result.error.message ? result.error.message : "Unable to insert slide.", true);
                }
              });
            } else {
              setStatus("app-status", "Poll saved. PowerPoint slide insertion API is not available in browser preview.", false);
            }
          });
        }

        function interactionLiveUrl(interaction) {
          console.log("[SlideEngage taskpane] Opening live results", {
            eventId: selectedEvent && selectedEvent.id,
            interactionId: interaction && interaction.id,
            interactionType: interaction && interaction.type
          });
          return APP_URL + "/present/live-result/" + encodeURIComponent(selectedEvent.id) + "/" + encodeURIComponent(interaction.id) + "?source=powerpoint";
        }

        function markPowerPointSlide(interaction) {
          if (!interaction || !interaction.id || !selectedEvent) return Promise.resolve(interaction);
          var config = Object.assign({}, interaction.config || {});
          config.powerpoint_added_to_presentation = true;
          config.powerpoint_slide_id = config.powerpoint_slide_id || "powerpoint-" + interaction.id;
          config.powerpoint_event_id = selectedEvent.id;
          config.powerpoint_presented_at = new Date().toISOString();
          return request("/api/interactions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: interaction.id, config: config })
          }).then(function (data) {
            if (data && data.interaction) {
              selectedInteraction = data.interaction;
              interaction.config = data.interaction.config || config;
            }
            loadInteractions();
            return data && data.interaction ? data.interaction : interaction;
          }).catch(function (error) {
            addDebug("Unable to mark PowerPoint slide reference: " + (error && error.message ? error.message : "unknown error"));
            return interaction;
          });
        }

        function insertInteractionSlide(interaction, options, resultData, isAutoRefresh) {
          if (!selectedEvent) return Promise.resolve();
          var joinUrl = APP_URL + "/join?code=" + encodeURIComponent(selectedEvent.event_code);
          var liveUrl = interactionLiveUrl(interaction);
          if (!isAutoRefresh) {
            addDebug("Office host available: " + (!!(window.Office && Office.context)));
            addDebug("Office host: " + (window.Office && Office.context ? Office.context.host || "unknown" : "unavailable"));
            addDebug("Office platform: " + (window.Office && Office.context ? Office.context.platform || "unknown" : "unavailable"));
            addDebug("PowerPoint.run available: " + (!!(window.PowerPoint && PowerPoint.run)));
            addDebug("setSelectedDataAsync available: " + (!!(window.Office && Office.context && Office.context.document && Office.context.document.setSelectedDataAsync)));
            addDebug("insertFileFromBase64Async available: " + (!!(window.Office && Office.context && Office.context.document && Office.context.document.insertFileFromBase64Async)));
          }
          if (!isAutoRefresh) setStatus("app-status", "Rendering preview...", false);
          return request("/api/powerpoint/interaction-slide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              interactionId: interaction.id,
              interactionType: interaction.type,
              interactionLabel: labelForInteraction(interaction),
              question: interaction.title,
              options: options,
              eventCode: selectedEvent.event_code,
              joinUrl: joinUrl,
              liveUrl: liveUrl,
              results: resultData.results || [],
              totalResponses: resultData.total_responses || 0,
              snapshotOnly: !!isAutoRefresh
            })
          }).then(function (data) {
            if (!isAutoRefresh) {
              addDebug("Generated PPTX base64: " + (!!data.base64));
              addDebug("Generated slide image: " + (!!data.imageBase64));
              addDebug("Generated slide SVG: " + (!!data.svgBase64));
            }
            return insertVisualSlide(data, interaction, liveUrl, !!isAutoRefresh).then(function (inserted) {
              if (!isAutoRefresh && inserted !== false) {
                return markPowerPointSlide(interaction).then(function () {
                  return inserted;
                });
              }
              return inserted;
            });
          }).catch(function (error) {
            setStatus("app-status", "Unable to create slide: " + error.message, true);
            addDebug("Create slide failed: " + error.message);
            return false;
          });
        }

        function insertVisualSlide(data, interaction, liveUrl, isAutoRefresh) {
          if (!isAutoRefresh) setStatus("app-status", "Inserting into PowerPoint slide...", false);
          if (data && data.imageBase64) {
            return insertSlideImage(data.imageBase64, interaction, liveUrl, isAutoRefresh)
              .catch(function (imageError) {
                addDebug("Image insertion failed: " + imageError.message);
                if (isAutoRefresh) {
                  stopLiveSlideRefresh();
                  setStatus("app-status", "Automatic slide refresh stopped because PowerPoint blocked image replacement: " + imageError.message, true);
                  return false;
                }
                if (isMacPowerPoint()) return insertPresentationFallback(interaction, liveUrl);
                if (data.base64) return insertBase64Presentation(data.base64, interaction, liveUrl);
                return insertPresentationText(interaction, liveUrl);
              });
          }
          if (data && data.svgBase64) {
            if (!isAutoRefresh) setStatus("app-status", "Rendering preview image...", false);
            return svgBase64ToPngBase64(data.svgBase64)
              .then(function (pngBase64) {
                addDebug("Rendered PNG from SVG: " + (!!pngBase64));
                return insertSlideImage(pngBase64, interaction, liveUrl, isAutoRefresh);
              })
              .catch(function (imageError) {
                addDebug("SVG preview insertion failed: " + imageError.message);
                if (isAutoRefresh) {
                  stopLiveSlideRefresh();
                  setStatus("app-status", "Automatic slide refresh stopped because PowerPoint blocked image replacement: " + imageError.message, true);
                  return false;
                }
                if (isMacPowerPoint()) return insertPresentationFallback(interaction, liveUrl);
                if (data.base64) return insertBase64Presentation(data.base64, interaction, liveUrl);
                return insertPresentationText(interaction, liveUrl);
              });
          }
          if (data && data.base64) return insertBase64Presentation(data.base64, interaction, liveUrl);
          return insertPresentationText(interaction, liveUrl);
        }

        function isMacPowerPoint() {
          return !!(window.Office && Office.context && String(Office.context.platform || "").toLowerCase() === "mac");
        }

        function focusNewestPowerPointSlide() {
          return new Promise(function (resolve) {
            if (!(window.Office && Office.context && Office.context.document && Office.context.document.goToByIdAsync && Office.GoToType && Office.GoToType.Index)) {
              addDebug("PowerPoint slide navigation API unavailable; inserted content remains in the current visible slide.");
              resolve(false);
              return;
            }

            var target = Office.Index && Office.Index.Last ? Office.Index.Last : "last";
            try {
              Office.context.document.goToByIdAsync(target, Office.GoToType.Index, function (result) {
                if (result && result.status === Office.AsyncResultStatus.Succeeded) {
                  addDebug("PowerPoint navigated to the generated slide");
                  resolve(true);
                } else {
                  addDebug("PowerPoint navigation unavailable after insertion: " + (result && result.error && result.error.message ? result.error.message : "unknown"));
                  resolve(false);
                }
              });
            } catch (error) {
              addDebug("PowerPoint navigation failed: " + error.message);
              resolve(false);
            }
          });
        }

        function queueLiveSlideSnapshot(interaction, options, resultData, signature) {
          liveSlideQueuedSnapshot = {
            interaction: interaction,
            options: options,
            resultData: resultData,
            signature: signature
          };

          if (liveSlideSnapshotUpdating) return Promise.resolve(true);

          var now = Date.now();
          var elapsed = now - liveSlideLastSnapshotAt;
          var wait = Math.max(0, performanceConfig.slideSnapshotInterval - elapsed);

          if (wait === 0) return flushLiveSlideSnapshot();

          if (!liveSlideThrottleTimer) {
            setStatus("app-status", "Live. Slide update queued.", false);
            liveSlideThrottleTimer = setTimeout(function () {
              liveSlideThrottleTimer = null;
              flushLiveSlideSnapshot();
            }, wait);
          }

          return Promise.resolve(true);
        }

        function flushLiveSlideSnapshot() {
          if (!liveSlideQueuedSnapshot || liveSlideSnapshotUpdating) return Promise.resolve(true);
          var snapshot = liveSlideQueuedSnapshot;
          liveSlideQueuedSnapshot = null;
          liveSlideSnapshotUpdating = true;
          liveSlideLastSnapshotAt = Date.now();
          liveSlideLastSignature = snapshot.signature;
          setStatus("app-status", "Updating slide...", false);
          addDebug("Live result changed; refreshing PowerPoint snapshot");
          return insertInteractionSlide(snapshot.interaction, snapshot.options, snapshot.resultData, true)
            .then(function (inserted) {
              var age = Math.max(0, Math.round((Date.now() - liveSlideLastSnapshotAt) / 1000));
              if (inserted) setStatus("app-status", "Live. Last updated " + age + "s ago.", false);
              return inserted;
            })
            .finally(function () {
              liveSlideSnapshotUpdating = false;
              if (liveSlideQueuedSnapshot && !liveSlideThrottleTimer) {
                liveSlideThrottleTimer = setTimeout(function () {
                  liveSlideThrottleTimer = null;
                  flushLiveSlideSnapshot();
                }, performanceConfig.slideSnapshotInterval);
              }
            });
        }

        function startLiveSlideRefresh(interaction) {
          stopLiveSlideRefresh();
          if (!interaction || !interaction.id) return;
          liveSlideInteractionId = interaction.id;
          liveSlideLastSignature = "";
          liveSlideLastSnapshotAt = 0;
          liveSlideQueuedSnapshot = null;
          setStatus("app-status", "Live PowerPoint slide auto-refresh started.", false);
          addDebug("Live slide refresh started for " + interaction.id);
          liveSlideTimer = setInterval(function () {
            if (liveSlideRefreshing || !selectedInteraction || selectedInteraction.id !== liveSlideInteractionId) return;
            liveSlideRefreshing = true;
            presentInteraction(selectedInteraction, { silent: true }).finally(function () {
              liveSlideRefreshing = false;
            });
          }, performanceConfig.realtimePreviewInterval);
        }

        function stopLiveSlideRefresh() {
          if (liveSlideTimer) {
            clearInterval(liveSlideTimer);
            liveSlideTimer = null;
            addDebug("Live slide refresh stopped");
          }
          if (liveSlideThrottleTimer) {
            clearTimeout(liveSlideThrottleTimer);
            liveSlideThrottleTimer = null;
          }
          liveSlideInteractionId = null;
          liveSlideRefreshing = false;
          liveSlideSnapshotUpdating = false;
          liveSlideLastSignature = "";
          liveSlideLastSnapshotAt = 0;
          liveSlideQueuedSnapshot = null;
        }

        function copyText(text, successMessage) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
              setStatus("app-status", successMessage, false);
            }).catch(function () {
              fallbackCopyText(text, successMessage);
            });
            return;
          }
          fallbackCopyText(text, successMessage);
        }

        function fallbackCopyText(text, successMessage) {
          var input = document.createElement("textarea");
          input.value = text;
          input.setAttribute("readonly", "readonly");
          input.style.position = "fixed";
          input.style.left = "-9999px";
          document.body.appendChild(input);
          input.select();
          try {
            document.execCommand("copy");
            setStatus("app-status", successMessage, false);
          } catch (error) {
            setStatus("app-status", "Unable to copy. Please copy manually: " + text, true);
          }
          document.body.removeChild(input);
        }

        function downloadBase64(filename, base64, mimeType) {
          var binary = atob(base64);
          var bytes = new Uint8Array(binary.length);
          for (var i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
          }
          var blob = new Blob([bytes], { type: mimeType });
          var url = URL.createObjectURL(blob);
          var link = document.createElement("a");
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          setStatus("app-status", filename + " downloaded.", false);
        }

        function svgBase64ToPngBase64(svgBase64) {
          return new Promise(function (resolve, reject) {
            try {
              var image = new Image();
              image.onload = function () {
                try {
                  var canvas = document.createElement("canvas");
                  canvas.width = 1920;
                  canvas.height = 1080;
                  var ctx = canvas.getContext("2d");
                  if (!ctx) throw new Error("Canvas is not available in this Office WebView.");
                  ctx.fillStyle = "#F4F7F4";
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                  var pngDataUrl = canvas.toDataURL("image/png");
                  resolve(pngDataUrl.split(",")[1]);
                } catch (error) {
                  reject(error);
                }
              };
              image.onerror = function () {
                reject(new Error("Unable to render generated slide preview."));
              };
              image.src = "data:image/svg+xml;base64," + svgBase64;
            } catch (error) {
              reject(error);
            }
          });
        }

        function insertSlideImage(imageBase64, interaction, liveUrl, isAutoRefresh) {
          return new Promise(function (resolve, reject) {
            if (!(window.Office && Office.context && Office.context.document && Office.context.document.setSelectedDataAsync)) {
              reject(new Error("PowerPoint image insertion API is not available."));
              return;
            }
            addDebug(isAutoRefresh ? "Attempting live snapshot replacement" : "Attempting image insertion into current slide canvas");
            Office.context.document.setSelectedDataAsync(
              imageBase64,
              {
                coercionType: Office.CoercionType.Image,
                imageWidth: 960,
                imageHeight: 540
              },
              function (result) {
                if (result.status === Office.AsyncResultStatus.Succeeded) {
                  addDebug(isAutoRefresh ? "PowerPoint snapshot refreshed" : "PowerPoint image inserted successfully");
                  if (isAutoRefresh) {
                    resolve(true);
                    return;
                  }
                  setStatus("app-status", "Slide inserted successfully.", false);
                  resolve(true);
                } else {
                  var message = result.error && result.error.message ? result.error.message : "PowerPoint rejected the generated slide image.";
                  reject(new Error(message));
                }
              }
            );
          });
        }

        function insertBase64Presentation(base64, interaction, liveUrl) {
          return new Promise(function (resolve) {
            if (isMacPowerPoint()) {
              addDebug("Skipping insertFileFromBase64Async on Mac; using fallback");
              insertPresentationFallback(interaction, liveUrl).then(resolve);
              return;
            }
            if (window.Office && Office.context && Office.context.document && Office.context.document.insertFileFromBase64Async) {
              addDebug("Attempting generated PPTX insertion");
              Office.context.document.insertFileFromBase64Async(base64, function (result) {
                if (result.status === Office.AsyncResultStatus.Succeeded) {
                  addDebug("PowerPoint slide inserted successfully");
                  setStatus("app-status", "Slide created successfully.", false);
                  resolve();
                  return;
                } else {
                  var message = result.error && result.error.message ? result.error.message : "PowerPoint rejected the generated slide.";
                  setStatus("app-status", "Unable to create slide: " + message, true);
                  addDebug("PowerPoint insert failed: " + message);
                  insertPresentationText(interaction, liveUrl).then(resolve);
                  return;
                }
              });
            } else {
              setStatus("app-status", "Unable to create a new slide in this Office host. Inserted fallback slide text instead.", true);
              addDebug("insertFileFromBase64Async unsupported; using text fallback");
              insertPresentationFallback(interaction, liveUrl).then(resolve);
            }
          });
        }

        function buildFallbackText(interaction, liveUrlOverride) {
          var joinUrl = APP_URL + "/join?code=" + encodeURIComponent(selectedEvent.event_code);
          var liveUrl = liveUrlOverride || interactionLiveUrl(interaction);
          var host = APP_URL.replace(/^https?:\/\//, "");
          var label = labelForInteraction(interaction);
          var options = normalizeOptions(interaction.interaction_options || optionDrafts)
            .map(function (option, index) {
              return String.fromCharCode(65 + index) + ". " + option.option_text;
            })
            .filter(Boolean)
            .join("\\n");
          return "SlideEngage - " + label + "\\n" +
            "================================\\n\\n" +
            "Question:\\n" + (interaction.title || "Untitled interaction") + "\\n\\n" +
            (options ? "Answer options:\\n" + options + "\\n\\n" : "") +
            "Event code: #" + selectedEvent.event_code + "\\n" +
            "Join at: " + host + "/join\\n" +
            "If QR is unavailable, enter code #" + selectedEvent.event_code + "\\n" +
            "Live results: " + liveUrl + "\\n\\n" +
            "Live result area:\\n" +
            (interaction.type === "word_cloud" ? "Live responses will appear here." :
              interaction.type === "qa" ? "Live questions will appear here." :
              interaction.type === "poll" || interaction.type === "quiz" ? "Open the live result link to view realtime bars and percentages." :
              "Open the live result link to view realtime responses.");
        }

        function buildFallbackHtml(interaction, liveUrlOverride) {
          var text = buildFallbackText(interaction, liveUrlOverride)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\\n/g, "<br>");
          return '<div style="font-family:Aptos,Arial,sans-serif;color:#1A1A2E;padding:24px;border:2px solid #DDEBE3;border-radius:18px;background:#F4F7F4">' +
            '<h1 style="margin:0 0 16px;color:#168A3A;font-size:30px">SlideEngage</h1>' +
            '<div style="font-size:20px;line-height:1.45">' + text + '</div>' +
            '</div>';
        }

        function insertPresentationFallback(interaction, liveUrlOverride) {
          return insertPresentationHtml(interaction, liveUrlOverride).catch(function (htmlError) {
            addDebug("HTML fallback failed: " + htmlError.message);
            return insertPresentationText(interaction, liveUrlOverride);
          });
        }

        function insertPresentationHtml(interaction, liveUrlOverride) {
          return new Promise(function (resolve, reject) {
            if (!(window.Office && Office.context && Office.context.document && Office.context.document.setSelectedDataAsync && Office.CoercionType && Office.CoercionType.Html)) {
              reject(new Error("PowerPoint HTML insertion API is not available."));
              return;
            }
            Office.context.document.setSelectedDataAsync(buildFallbackHtml(interaction, liveUrlOverride), { coercionType: Office.CoercionType.Html }, function (result) {
              if (result.status === Office.AsyncResultStatus.Succeeded) {
                setStatus("app-status", "Inserted HTML fallback successfully. Automatic image refresh is not available for this fallback.", false);
                addDebug("HTML fallback inserted successfully");
                resolve();
              } else {
                reject(new Error(result.error && result.error.message ? result.error.message : "Unable to insert HTML fallback."));
              }
            });
          });
        }

        function insertPresentationText(interaction, liveUrlOverride) {
          return new Promise(function (resolve) {
            var liveUrl = liveUrlOverride || interactionLiveUrl(interaction);
            var text = buildFallbackText(interaction, liveUrlOverride);
            if (window.Office && Office.context && Office.context.document && Office.context.document.setSelectedDataAsync) {
              Office.context.document.setSelectedDataAsync(text, { coercionType: Office.CoercionType.Text }, function (result) {
                if (result.status === Office.AsyncResultStatus.Succeeded) {
                  setStatus("app-status", "Inserted text fallback successfully. Automatic image refresh is not available for this fallback.", false);
                  addDebug("Text fallback inserted successfully");
                } else {
                  var message = result.error && result.error.message ? result.error.message : "Unable to insert interaction.";
                  addDebug("Text fallback failed: " + message);
                  setStatus("app-status", message.toLowerCase().indexOf("permission") >= 0 || isMacPowerPoint()
                    ? "PowerPoint blocked slide insertion for this add-in. Automatic live slide refresh cannot start in this PowerPoint session."
                    : message, true);
                }
                resolve();
              });
            } else {
              setStatus("app-status", "Interaction saved. PowerPoint insertion API is not available in browser preview.", false);
              resolve();
            }
          });
        }

        function loadResults(interactionId) {
          if (selectedInteraction && selectedInteraction.type === "qa") {
            loadQaResults(interactionId);
            return;
          }
          request("/api/results?interaction_id=" + encodeURIComponent(interactionId), { cache: "no-store" })
            .then(function (data) {
              renderResults(data);
              startResultsPolling(interactionId);
            })
            .catch(function () {
              el("results-list").innerHTML = "";
            });
        }

        function refreshTaskpaneData(loadResultToo) {
          if (isActionLoading("refresh")) return;
          setActionState("refresh", "loading");
          setStatus("app-status", "Refreshing...", false);
          loadEvents();
          if (selectedEvent) loadInteractions();
          if (loadResultToo && selectedInteraction) loadResults(selectedInteraction.id);
          setTimeout(function () {
            setActionState("refresh", "success");
            setStatus("app-status", "Updated ✓", false);
          }, 350);
        }

        function loadQaResults(interactionId) {
          var url = "/api/qa?interaction_id=" + encodeURIComponent(interactionId) + "&sort=popular&archived=false";
          request(url, { cache: "no-store" })
            .then(function (data) {
              renderQaResults(data.questions || []);
              startResultsPolling(interactionId);
            })
            .catch(function (error) {
              setStatus("app-status", error.message, true);
            });
        }

        function renderQaResults(questions) {
          var list = el("results-list");
          list.innerHTML = "";
          var header = document.createElement("div");
          header.className = "interaction-item";
          header.innerHTML = '<div class="row"><strong>Audience Q&A</strong><button class="button secondary small" type="button">Restore question</button></div><div class="small muted" style="margin-top:6px"></div>';
          header.querySelector("button").onclick = function () {
            if (!selectedInteraction) return;
            request("/api/qa/restore-last", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ interaction_id: selectedInteraction.id })
            }).then(function () {
              loadQaResults(selectedInteraction.id, false);
              setStatus("app-status", "Question restored.", false);
            }).catch(function (error) {
              setStatus("app-status", error.message || "No question available to restore.", true);
            });
          };
          header.querySelector(".small.muted").textContent = questions.length ? questions.length + " live questions" : "Your Q&A is ready. Your participants can ask new questions.";
          list.appendChild(header);
          questions.forEach(function (question) {
            var row = document.createElement("div");
            row.className = "interaction-item";
            row.innerHTML = '<div class="row"><strong></strong><span class="pill"></span></div><div class="small muted" style="margin-top:6px"></div><button class="button secondary small" style="margin-top:10px" type="button"></button>';
            row.querySelector("strong").textContent = question.question_text;
            row.querySelector(".pill").textContent = (question.upvote_count || 0) + " upvotes";
            row.querySelector(".small.muted").textContent = question.display_name || "Anonymous";
            row.querySelector("button").textContent = "Mark as answered";
            row.querySelector("button").onclick = function () {
              request("/api/qa", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: question.id, answered: true, answered_at: new Date().toISOString(), is_hidden: true, deleted_by: "answered" })
              }).then(function () {
                loadQaResults(selectedInteraction.id, false);
                setStatus("app-status", "Question marked as answered.", false);
              });
            };
            list.appendChild(row);
          });
        }

        function startResultsPolling(interactionId) {
          clearInterval(resultsTimer);
          resultsTimer = setInterval(function () {
            if (selectedInteraction && selectedInteraction.type === "qa") {
              loadQaResults(interactionId, false);
              return;
            }
            request("/api/results?interaction_id=" + encodeURIComponent(interactionId), { cache: "no-store" })
              .then(function (data) {
                renderResults(data);
              })
              .catch(function () {});
          }, performanceConfig.realtimePreviewInterval);
        }

        function renderResults(data) {
          var list = el("results-list");
          list.innerHTML = "";
          var results = data.results || [];
          if (data.hidden) {
            list.innerHTML = '<div class="muted small">Results are hidden for this interaction.</div>';
            return;
          }
          if (!results.length) return;
          if (Array.isArray(results) && data.interaction && (data.interaction.type === "poll" || data.interaction.type === "quiz")) {
            results.forEach(function (item) {
              var row = document.createElement("div");
              var percentage = Math.min(100, Number(item.percentage || 0));
              row.className = "interaction-item";
              row.innerHTML = '<div class="row small"><strong></strong><span></span></div><div class="bar" style="margin-top:8px"><span></span></div>';
              row.querySelector("strong").textContent = (item.option_letter ? item.option_letter + ". " : "") + item.option_text;
              row.querySelector("span").textContent = (item.count || 0) + " votes";
              row.querySelector(".bar span").style.width = percentage + "%";
              list.appendChild(row);
            });
            return;
          }
          if (Array.isArray(results) && data.interaction && data.interaction.type === "word_cloud") {
            var cloud = document.createElement("div");
            cloud.className = "interaction-item";
            cloud.innerHTML = '<div class="small muted">Word cloud responses</div><div style="margin-top:8px;line-height:1.9"></div>';
            results.forEach(function (item) {
              var word = document.createElement("span");
              word.className = "code";
              word.style.margin = "3px";
              word.textContent = item.word + " (" + item.count + ")";
              cloud.querySelector("div:last-child").appendChild(word);
            });
            list.appendChild(cloud);
            return;
          }
          if (data.interaction && data.interaction.type === "feedback" && results.text_responses) {
            var row = document.createElement("div");
            row.className = "interaction-item";
            row.innerHTML = '<strong>Average rating: </strong><span></span><div class="stack" style="margin-top:8px"></div>';
            row.querySelector("span").textContent = results.average_rating || 0;
            results.text_responses.slice(0, 5).forEach(function (item) {
              var text = document.createElement("div");
              text.className = "small muted";
              text.textContent = item.text;
              row.querySelector(".stack").appendChild(text);
            });
            list.appendChild(row);
            return;
          }
          if (Array.isArray(results)) {
            results.slice(0, 8).forEach(function (item) {
              var row = document.createElement("div");
              row.className = "interaction-item small";
              row.textContent = item.text_value || item.answer || item.title || JSON.stringify(item);
              list.appendChild(row);
            });
          }
        }

        function bind() {
          el("login-form").addEventListener("submit", login);
          el("login-button").addEventListener("click", login);
          el("logout-button").onclick = function () {
            clearSession();
            setStatus("login-status", "Signed out.", false);
            showLogin();
          };
          el("create-event-button").onclick = createEvent;
          el("show-create-event-button").onclick = function () {
            el("create-event-row").classList.toggle("hidden");
          };
          el("event-select").onchange = function () {
            stopLiveSlideRefresh();
            selectedEvent = events.find(function (event) { return event.id === el("event-select").value; }) || null;
            selectedInteraction = null;
            interactions = [];
            renderEvents();
            renderSelectedEvent();
            if (selectedEvent) loadInteractions();
          };
          el("close-editor").onclick = function () {
            el("interaction-editor").classList.add("hidden");
          };
          el("interaction-question").oninput = scheduleAutosave;
          el("add-option-button").onclick = function () {
            optionDrafts.push({ option_text: "Option " + (optionDrafts.length + 1), is_correct: false });
            renderOptionFields();
            renderEditorPreview();
            scheduleAutosave();
          };
          el("save-interaction-button").onclick = function () { saveEditor(false); };
          el("generate-slide-button").onclick = presentSelectedInteraction;
          el("present-live-button").onclick = presentLive;
          el("live-toggle-button").onclick = toggleLiveStatus;
          el("reset-results-button").onclick = resetResults;
          el("delete-interaction-button").onclick = function () { deleteInteraction(selectedInteraction); };
          el("bottom-refresh-button").onclick = function () { refreshTaskpaneData(false); };
          el("bottom-present-button").onclick = presentSelectedInteraction;
          el("bottom-results-button").onclick = presentLive;
        }

        window.addEventListener("error", function (event) {
          addDebug("Window error: " + event.message);
          setStatus("app-status", event.message, true);
        });
        window.addEventListener("unhandledrejection", function (event) {
          var message = event.reason && event.reason.message ? event.reason.message : String(event.reason || "Unhandled promise rejection");
          addDebug("Promise rejection: " + message);
          setStatus("app-status", message, true);
        });

        try {
          bind();
          addDebug("Handlers bound");
          initializeOffice();
          restoreSession();
        } catch (error) {
          var message = error && error.message ? error.message : "Taskpane startup failed";
          addDebug("Startup error: " + message);
          setStatus("login-status", message, true);
          setStatus("app-status", message, true);
        }
      })();
    </script>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
