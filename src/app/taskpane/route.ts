export const dynamic = 'force-static';

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://slide-engage.vercel.app').replace(/\/$/, '');

export function GET() {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SlideEngage PowerPoint Add-in</title>
    <script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>
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
        gap: 12px;
        border-bottom: 1px solid var(--line);
        background: white;
        padding: 12px 14px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .brand img {
        width: 34px;
        height: 34px;
        border-radius: 10px;
      }
      h1, h2, h3, p {
        margin: 0;
      }
      .brand-title {
        font-size: 16px;
        font-weight: 900;
      }
      .brand-subtitle {
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
      }
      .shell {
        padding: 14px;
      }
      .card {
        margin-bottom: 14px;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: white;
        padding: 14px;
        box-shadow: 0 1px 2px rgba(25, 26, 46, 0.04);
      }
      .debug {
        border-color: #b8dec5;
        background: #fbfffc;
        color: #315b40;
        font-size: 12px;
        line-height: 1.45;
      }
      .debug summary {
        cursor: pointer;
        color: var(--ink);
        font-weight: 900;
      }
      .debug-list {
        margin-top: 8px;
        display: grid;
        gap: 4px;
        font-weight: 700;
      }
      .hidden { display: none !important; }
      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .stack {
        display: grid;
        gap: 10px;
      }
      .muted {
        color: var(--muted);
      }
      .small {
        font-size: 12px;
      }
      .title {
        margin-bottom: 12px;
        font-size: 15px;
        font-weight: 900;
      }
      .input {
        width: 100%;
        min-width: 0;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: white;
        padding: 10px 11px;
        color: var(--ink);
        outline: none;
      }
      .input:focus {
        border-color: var(--green);
        box-shadow: 0 0 0 3px rgba(22, 138, 58, 0.1);
      }
      .button {
        border: 1px solid transparent;
        border-radius: 10px;
        background: var(--green);
        padding: 10px 12px;
        color: white;
        font-weight: 900;
      }
      .button:hover {
        background: var(--green-dark);
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
      .event-list {
        display: grid;
        gap: 8px;
      }
      .event-item, .interaction-item {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: white;
        padding: 11px;
        text-align: left;
      }
      .event-item.active {
        border-color: var(--green);
        background: var(--green-soft);
      }
      .event-name {
        font-weight: 900;
      }
      .code {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        background: var(--green-soft);
        padding: 5px 9px;
        color: var(--green);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-weight: 900;
      }
      .qr {
        display: block;
        width: 152px;
        height: 152px;
        margin: 10px auto;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: white;
        padding: 10px;
      }
      .template {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: white;
        padding: 12px;
        text-align: left;
        font-weight: 900;
      }
      .template:hover {
        border-color: var(--green);
      }
      .template-icon {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
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
    </style>
  </head>
  <body>
    <header class="header">
      <div class="brand">
        <img src="/assets/icons/icon-64.png" alt="SlideEngage" />
        <div>
          <div class="brand-title">SlideEngage</div>
          <div id="office-summary" class="brand-subtitle">Taskpane loading</div>
        </div>
      </div>
      <button id="logout-button" class="button secondary small hidden" type="button">Logout</button>
    </header>

    <main class="shell">
      <details class="card debug" open>
        <summary>Office debug</summary>
        <div id="debug-list" class="debug-list">
          <div>Taskpane mounted</div>
        </div>
      </details>

      <section id="login-view" class="card">
        <h1 class="title">Lecturer login</h1>
        <div class="stack">
          <input id="email" class="input" autocomplete="email" placeholder="Email" />
          <input id="password" class="input" type="password" autocomplete="current-password" placeholder="Password" />
          <button id="login-button" class="button full" type="button">Sign in</button>
        </div>
        <div id="login-status" class="status hidden"></div>
      </section>

      <section id="app-view" class="hidden">
        <button id="present-button" class="button full" type="button">Present with SlideEngage</button>

        <section class="card">
          <div class="row">
            <h2 class="title" style="margin:0">Events</h2>
            <span id="event-count" class="small muted">0 total</span>
          </div>
          <div class="row" style="margin-top:12px">
            <input id="event-name" class="input" placeholder="New event name" />
            <button id="create-event-button" class="button" type="button">Create</button>
          </div>
          <div id="event-list" class="event-list" style="margin-top:12px"></div>
        </section>

        <section id="selected-event-card" class="card hidden">
          <div class="row">
            <div>
              <h2 id="selected-event-name" class="title" style="margin:0"></h2>
              <p id="selected-event-code" class="code" style="margin-top:6px"></p>
            </div>
            <span id="selected-event-status" class="small muted"></span>
          </div>
          <img id="event-qr" class="qr" alt="Event QR code" />
          <button id="insert-join-button" class="button secondary full" type="button">Insert joining instructions</button>
        </section>

        <section id="interaction-card" class="card hidden">
          <h2 class="title">Create new interaction</h2>
          <div id="templates" class="stack"></div>
        </section>

        <section id="poll-editor" class="card hidden">
          <div class="row">
            <h2 class="title" style="margin:0">Multiple choice poll</h2>
            <button id="close-poll-editor" class="button secondary small" type="button">Close</button>
          </div>
          <div class="stack" style="margin-top:12px">
            <textarea id="poll-question" class="input" rows="3" placeholder="Poll question"></textarea>
            <input id="poll-option-1" class="input" placeholder="Option 1" />
            <input id="poll-option-2" class="input" placeholder="Option 2" />
            <input id="poll-option-3" class="input" placeholder="Option 3" />
            <input id="poll-option-4" class="input" placeholder="Option 4" />
            <button id="save-poll-button" class="button full" type="button">Save poll and insert slide</button>
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

        <div id="app-status" class="status hidden"></div>
      </section>
    </main>

    <script>
      (function () {
        var APP_URL = "${appUrl}";
        var SESSION_KEY = "slideengage_lecturer";
        var lecturer = null;
        var events = [];
        var selectedEvent = null;
        var interactions = [];
        var activePollId = null;

        var templates = [
          { label: "Multiple choice", icon: "=", type: "poll", options: ["First option", "Second option", "Third option"] },
          { label: "Open text", icon: "T", type: "feedback", config: { poll_kind: "open_text", include_open_text: true } },
          { label: "Word cloud", icon: "W", type: "word_cloud", config: { max_words_per_participant: 3 } },
          { label: "Rating", icon: "*", type: "feedback", config: { poll_kind: "rating", include_star_ratings: true } },
          { label: "Ranking", icon: "#", type: "poll", config: { poll_kind: "ranking" }, options: ["Rank item 1", "Rank item 2", "Rank item 3"] },
          { label: "Quiz", icon: "Q", type: "quiz", config: { time_limit_seconds: 30 }, options: ["Correct answer", "Distractor", "Distractor"] },
          { label: "Audience Q&A", icon: "?", type: "qa", config: { allow_anonymous_questions: true } }
        ];

        function el(id) {
          return document.getElementById(id);
        }

        function addDebug(message) {
          var row = document.createElement("div");
          row.textContent = message;
          el("debug-list").appendChild(row);
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

        function showApp() {
          el("login-view").classList.add("hidden");
          el("app-view").classList.remove("hidden");
          el("logout-button").classList.remove("hidden");
          addDebug("Dashboard rendered");
        }

        function showLogin() {
          el("login-view").classList.remove("hidden");
          el("app-view").classList.add("hidden");
          el("logout-button").classList.add("hidden");
        }

        function safeJson(response) {
          return response.json().catch(function () {
            return {};
          });
        }

        function request(path, options) {
          return fetch(path, options || {}).then(function (response) {
            return safeJson(response).then(function (data) {
              if (!response.ok) throw new Error(data.error || "Request failed");
              return data;
            });
          });
        }

        function initializeOffice() {
          if (!window.Office || !Office.onReady) {
            el("office-summary").textContent = "Office.js unavailable";
            addDebug("Office.js unavailable");
            return;
          }

          Office.onReady(function (info) {
            var host = info && info.host ? info.host : "browser";
            el("office-summary").textContent = "Office ready: " + host;
            addDebug("Office ready");
          }).catch(function (error) {
            el("office-summary").textContent = "Office init failed";
            addDebug("Office init failed: " + (error && error.message ? error.message : "unknown error"));
          });
        }

        function restoreSession() {
          try {
            var stored = localStorage.getItem(SESSION_KEY);
            if (stored) {
              lecturer = JSON.parse(stored);
              addDebug("Auth loaded");
              showApp();
              loadEvents();
            } else {
              addDebug("Auth empty");
              showLogin();
            }
          } catch (error) {
            addDebug("Storage unavailable: " + error.message);
            showLogin();
          }
        }

        function login() {
          var email = el("email").value.trim();
          var password = el("password").value;
          if (!email || !password) {
            setStatus("login-status", "Email and password required.", true);
            return;
          }
          setStatus("login-status", "Signing in...", false);
          request("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: password })
          }).then(function (data) {
            lecturer = data.lecturer;
            localStorage.setItem(SESSION_KEY, JSON.stringify(lecturer));
            setStatus("login-status", "", false);
            addDebug("Supabase connected");
            showApp();
            loadEvents();
          }).catch(function (error) {
            setStatus("login-status", error.message, true);
            addDebug("Login failed: " + error.message);
          });
        }

        function loadEvents() {
          if (!lecturer) return;
          addDebug("Loading events");
          request("/api/events?lecturer_id=" + encodeURIComponent(lecturer.id), { cache: "no-store" })
            .then(function (data) {
              events = data.events || [];
              el("event-count").textContent = events.length + " total";
              if (!selectedEvent && events.length) selectedEvent = events[0];
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
          var list = el("event-list");
          list.innerHTML = "";
          if (!events.length) {
            list.innerHTML = '<div class="muted small">Create an event to start using SlideEngage.</div>';
            return;
          }
          events.forEach(function (event) {
            var button = document.createElement("button");
            button.type = "button";
            button.className = "event-item" + (selectedEvent && selectedEvent.id === event.id ? " active" : "");
            button.innerHTML =
              '<div class="row"><div><div class="event-name"></div><div class="small muted"></div></div><span class="small muted"></span></div>';
            button.querySelector(".event-name").textContent = event.event_name || "Untitled event";
            button.querySelector(".small.muted").textContent = "#" + event.event_code;
            button.querySelector("span").textContent = event.status || "closed";
            button.onclick = function () {
              selectedEvent = event;
              renderEvents();
              renderSelectedEvent();
              loadInteractions();
            };
            list.appendChild(button);
          });
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
          el("event-qr").src = "/api/qrcode?code=" + encodeURIComponent(selectedEvent.event_code) + "&format=svg";
          renderTemplates();
        }

        function createEvent() {
          if (!lecturer) return;
          var name = el("event-name").value.trim();
          if (!name) {
            setStatus("app-status", "Enter an event name.", true);
            return;
          }
          var code = Math.random().toString(36).slice(2, 8).toUpperCase();
          request("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lecturer_id: lecturer.id, event_name: name, event_code: code, status: "closed" })
          }).then(function (data) {
            selectedEvent = data.event;
            el("event-name").value = "";
            setStatus("app-status", "Event created.", false);
            loadEvents();
          }).catch(function (error) {
            setStatus("app-status", error.message, true);
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
            button.innerHTML = '<span class="template-icon"></span><span></span>';
            button.querySelector(".template-icon").textContent = template.icon;
            button.querySelector("span:last-child").textContent = template.label;
            button.onclick = function () {
              if (template.label === "Multiple choice") {
                openPollEditor();
              } else {
                createInteraction(template);
              }
            };
            list.appendChild(button);
          });
        }

        function loadInteractions() {
          if (!selectedEvent) return;
          request("/api/interactions?event_id=" + encodeURIComponent(selectedEvent.id), { cache: "no-store" })
            .then(function (data) {
              interactions = data.interactions || [];
              renderInteractions();
              var live = interactions.filter(function (item) { return item.status === "live"; })[0] || interactions[0];
              if (live) loadResults(live.id);
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
            var item = document.createElement("button");
            item.type = "button";
            item.className = "interaction-item";
            item.innerHTML = '<div class="row"><div><div class="event-name"></div><div class="small muted"></div></div><span class="code"></span></div>';
            item.querySelector(".event-name").textContent = interaction.title || "Untitled";
            item.querySelector(".small.muted").textContent = interaction.type || "interaction";
            item.querySelector(".code").textContent = interaction.status || "draft";
            item.onclick = function () {
              activePollId = interaction.id;
              loadResults(interaction.id);
            };
            list.appendChild(item);
          });
        }

        function createInteraction(template) {
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
          }).catch(function (error) {
            setStatus("app-status", error.message, true);
          });
        }

        function openPollEditor() {
          el("poll-editor").classList.remove("hidden");
          el("poll-question").value = "How familiar are you with the topic?";
          el("poll-option-1").value = "I have some basic understanding";
          el("poll-option-2").value = "I am an expert";
          el("poll-option-3").value = "I have some solid background";
          el("poll-option-4").value = "I am completely new";
        }

        function savePoll() {
          if (!selectedEvent) return;
          var question = el("poll-question").value.trim();
          var options = [1, 2, 3, 4].map(function (number) {
            return el("poll-option-" + number).value.trim();
          }).filter(Boolean);
          if (!question || options.length < 2) {
            setStatus("app-status", "Enter a question and at least two options.", true);
            return;
          }
          request("/api/interactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_id: selectedEvent.id,
              type: "poll",
              title: question,
              config: { poll_kind: "multiple_choice" },
              options: options.map(function (option) { return { option_text: option }; })
            })
          }).then(function (data) {
            activePollId = data.interaction.id;
            el("poll-editor").classList.add("hidden");
            loadInteractions();
            return insertPollSlide(data.interaction.id, question, options);
          }).catch(function (error) {
            setStatus("app-status", error.message, true);
          });
        }

        function insertPollSlide(interactionId, question, options) {
          if (!selectedEvent) return Promise.resolve();
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

        function insertJoiningSlide() {
          if (!selectedEvent) return;
          var joinUrl = APP_URL + "/join?code=" + encodeURIComponent(selectedEvent.event_code);
          var text = "SlideEngage joining instructions\\n\\nJoin at " + joinUrl + "\\n\\nEvent code: #" + selectedEvent.event_code;
          if (window.Office && Office.context && Office.context.document && Office.context.document.setSelectedDataAsync) {
            Office.context.document.setSelectedDataAsync(text, { coercionType: Office.CoercionType.Text }, function (result) {
              if (result.status === Office.AsyncResultStatus.Succeeded) {
                setStatus("app-status", "Joining instructions inserted.", false);
              } else {
                setStatus("app-status", result.error && result.error.message ? result.error.message : "Unable to insert text.", true);
              }
            });
          } else {
            setStatus("app-status", "PowerPoint text insertion API is not available in browser preview.", false);
          }
        }

        function present() {
          if (!selectedEvent) {
            setStatus("app-status", "Select an event first.", true);
            return;
          }
          updateEventStatus("live")
            .then(function () {
              return insertJoiningSlide();
            })
            .catch(function (error) {
              setStatus("app-status", error.message, true);
            });
        }

        function loadResults(interactionId) {
          activePollId = interactionId;
          request("/api/results?interaction_id=" + encodeURIComponent(interactionId), { cache: "no-store" })
            .then(function (data) {
              renderResults(data.results || []);
            })
            .catch(function () {
              el("results-list").innerHTML = "";
            });
        }

        function renderResults(results) {
          var list = el("results-list");
          list.innerHTML = "";
          if (!results.length) return;
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
        }

        function bind() {
          el("login-button").onclick = login;
          el("logout-button").onclick = function () {
            localStorage.removeItem(SESSION_KEY);
            lecturer = null;
            events = [];
            selectedEvent = null;
            showLogin();
          };
          el("create-event-button").onclick = createEvent;
          el("present-button").onclick = present;
          el("insert-join-button").onclick = insertJoiningSlide;
          el("close-poll-editor").onclick = function () {
            el("poll-editor").classList.add("hidden");
          };
          el("save-poll-button").onclick = savePoll;
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

        bind();
        initializeOffice();
        restoreSession();
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
