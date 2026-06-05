/**
 * SlideEngage Google Slides Add-on
 *
 * Install in Google Slides:
 * Extensions > Apps Script > paste this file into Code.gs > Save > reload Slides.
 *
 * Production note:
 * Publish through Google Workspace Marketplace for normal users. This script is
 * the development/copy-install version and uses the same SlideEngage backend as
 * the website and PowerPoint add-in.
 */

var SLIDEENGAGE_URL = 'https://slide-engage.vercel.app';
var SESSION_KEY = 'SLIDEENGAGE_SESSION';
var SELECTED_EVENT_KEY = 'SLIDEENGAGE_SELECTED_EVENT_ID';

function onOpen() {
  SlidesApp.getUi()
    .createMenu('🎯 SlideEngage')
    .addItem('Open SlideEngage', 'showSlideEngageSidebar')
    .addSeparator()
    .addItem('Update current SlideEngage snapshot', 'updateSelectedInteractionSnapshot')
    .addToUi();
}

function showSlideEngageSidebar() {
  var html = HtmlService.createHtmlOutput(buildSidebarHtml_())
    .setTitle('SlideEngage');
  SlidesApp.getUi().showSidebar(html);
}

function buildSidebarHtml_() {
  return '<!doctype html><html><head><base target="_top"><style>' +
    'body{font-family:Arial,sans-serif;margin:0;background:#f6faf7;color:#17172f}button,input,textarea,select{font:inherit}' +
    '.wrap{padding:14px}.brand{display:flex;align-items:center;gap:10px;margin-bottom:14px}.logo{width:36px;height:36px;border-radius:10px;background:#168a3a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px}.title{font-weight:800;font-size:18px}.muted{color:#6b7b8d}.small{font-size:12px}.card{background:#fff;border:1px solid #dfe9e3;border-radius:14px;padding:12px;margin:10px 0;box-shadow:0 8px 24px rgba(14,63,34,.06)}' +
    '.stack{display:flex;flex-direction:column;gap:8px}.row{display:flex;gap:8px;align-items:center;justify-content:space-between}.input{width:100%;box-sizing:border-box;border:1px solid #d6e2dc;border-radius:10px;padding:10px;background:#fff}.btn{border:0;border-radius:10px;background:#168a3a;color:#fff;font-weight:800;padding:10px 12px;cursor:pointer}.btn.secondary{background:#fff;color:#17172f;border:1px solid #d6e2dc}.btn.danger{background:#fff;color:#b42318;border:1px solid #f0c6c6}.btn:disabled{opacity:.55;cursor:not-allowed}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.item{border:1px solid #dfe9e3;border-radius:12px;padding:10px;background:#fff;cursor:pointer}.item.active{border-color:#168a3a;background:#eaf7ef}.pill{border-radius:999px;background:#eaf7ef;color:#168a3a;padding:4px 8px;font-size:12px;font-weight:800}.status{padding:10px;border-radius:10px;background:#eaf7ef;color:#168a3a;font-weight:700}.error{background:#fff0f0;color:#b42318}.permission{background:#fff8e6;color:#7a4b00;border:1px solid #f3d184}.link{color:#168a3a;font-weight:800;text-decoration:none}.hidden{display:none}' +
    '</style></head><body><div class="wrap">' +
    '<div class="brand"><div class="logo">🎯</div><div><div class="title">SlideEngage</div><div class="small muted">Google Slides Add-on</div></div></div>' +
    '<div id="status" class="status hidden"></div>' +
    '<section id="login" class="card stack"><b>Lecturer login</b><div class="small muted">Use the same SlideEngage website email/Gmail and password.</div><div id="permission" class="status permission hidden"></div><button class="btn secondary" onclick="authorize()">Authorize Google Slides Add-on</button><input id="email" class="input" placeholder="Email"><input id="password" class="input" type="password" placeholder="Password"><button class="btn" onclick="login()">Sign in</button></section>' +
    '<section id="app" class="hidden">' +
    '<div class="row"><b id="hello"></b><button class="btn secondary" onclick="logout()">Logout</button></div>' +
    '<div class="card stack"><b>Events</b><select id="events" class="input" onchange="selectEvent()"></select><div class="row"><input id="newEventName" class="input" placeholder="New event name"><button class="btn" onclick="createEvent()">Create</button></div><div id="eventInfo" class="small muted"></div></div>' +
    '<div class="card stack"><b>Create new interaction</b><div id="templates" class="grid"></div></div>' +
    '<div id="editor" class="card stack hidden"><div class="row"><b id="editorTitle">Editor</b><span id="interactionStatus" class="pill">draft</span></div><textarea id="question" class="input" rows="3" placeholder="Question"></textarea><div id="options" class="stack"></div><button id="addOption" class="btn secondary hidden" onclick="addOption()">Add option</button><button class="btn secondary" onclick="saveInteraction()">Save draft</button><button class="btn" onclick="insertSlide()">Add to Presentation</button><button class="btn secondary" onclick="openLiveResults()">Open Live Results</button><div class="row"><button class="btn secondary" onclick="goLive()">Go live</button><button class="btn secondary" onclick="closeLive()">Close</button><button class="btn danger" onclick="resetResults()">Reset</button></div></div>' +
    '<div class="card stack"><div class="row"><b>Interactions</b><button class="btn secondary" onclick="refresh()">Refresh</button></div><div id="interactions" class="stack"></div></div>' +
    '</section>' +
    '</div><script>' +
    'var state={session:null,events:[],selectedEvent:null,interactions:[],selectedInteraction:null,template:null,options:[]};' +
    'var templates=[{label:"Multiple choice",type:"poll",options:["Option 1","Option 2"],config:{poll_kind:"multiple_choice",results_visible:true,voting_open:true}},{label:"Open text",type:"feedback",options:[],config:{poll_kind:"open_text",include_open_text:true,anonymous:true,voting_open:true}},{label:"Word cloud",type:"word_cloud",options:[],config:{max_words_per_participant:3,allow_duplicate_words:true,voting_open:true}},{label:"Rating",type:"feedback",options:[],config:{poll_kind:"rating",include_star_ratings:true,scale:5,voting_open:true}},{label:"Quiz",type:"quiz",options:["Correct answer","Distractor"],config:{time_limit_seconds:30,points:100,voting_open:true}},{label:"Audience Q&A",type:"qa",options:[],config:{allow_anonymous_questions:true,moderation:false,voting_open:true}}];' +
    'function $(id){return document.getElementById(id)}function show(m,e){var s=$("status");s.textContent=m||"";s.className="status"+(e?" error":"")+(m?"":" hidden")}function call(name,args,ok){show("Loading...");google.script.run.withSuccessHandler(function(r){show("");ok&&ok(r)}).withFailureHandler(function(err){handleFailure(err)})[name].apply(null,args||[])}function handleFailure(err){var message=(err&&err.message)||String(err);if(/invalid email|invalid slideengage/i.test(message))message="Invalid SlideEngage email or password.";if(/UrlFetchApp|external_request|permission|authorization|not have permission|authorize|internet/i.test(message))message="Authorization required. Please click Authorize and allow Google permissions.";show(message,true);if(/authorize|permission|internet/i.test(message))checkAuthorization()}' +
    'function boot(){renderTemplates();checkAuthorization();call("getInitialState",[],function(r){state.session=r.session;state.events=r.events||[];state.selectedEvent=r.selectedEvent||null;state.interactions=r.interactions||[];render()})}function checkAuthorization(){google.script.run.withSuccessHandler(function(r){var box=$("permission");if(!r||r.authorized){box.classList.add("hidden");return}box.innerHTML="Google permission is required before SlideEngage can connect to your account. <a class=\\"link\\" target=\\"_blank\\" href=\\""+r.authorizationUrl+"\\">Open authorization</a>";box.classList.remove("hidden")}).withFailureHandler(function(){}).getAuthorizationStatus()}' +
    'function render(){if(state.session){$("login").classList.add("hidden");$("app").classList.remove("hidden");$("hello").textContent=state.session.lecturer.name||state.session.lecturer.email}else{$("login").classList.remove("hidden");$("app").classList.add("hidden")}renderEvents();renderInteractions();renderEditor()}' +
    'function renderTemplates(){var box=$("templates");box.innerHTML="";templates.forEach(function(t){var b=document.createElement("button");b.className="item";b.textContent=t.label;b.onclick=function(){openTemplate(t)};box.appendChild(b)})}' +
    'function renderEvents(){var sel=$("events");sel.innerHTML="";state.events.forEach(function(e){var o=document.createElement("option");o.value=e.id;o.textContent=(e.event_name||"Untitled")+" (#"+e.event_code+")";if(state.selectedEvent&&state.selectedEvent.id===e.id)o.selected=true;sel.appendChild(o)});$("eventInfo").textContent=state.selectedEvent?"Code #"+state.selectedEvent.event_code+" · "+(state.selectedEvent.status||"closed"):"Select or create an event."}' +
    'function renderInteractions(){var list=$("interactions");list.innerHTML="";state.interactions.forEach(function(i){var row=document.createElement("div");row.className="item"+(state.selectedInteraction&&state.selectedInteraction.id===i.id?" active":"");row.innerHTML="<b>"+(i.title||"Untitled")+"</b><div class=\\"small muted\\">"+label(i)+" · "+(i.status||"draft")+"</div>";row.onclick=function(){openInteraction(i)};list.appendChild(row)})}' +
    'function renderEditor(){var ed=$("editor");if(!state.selectedInteraction&&!state.template){ed.classList.add("hidden");return}ed.classList.remove("hidden");$("editorTitle").textContent=state.template?state.template.label:label(state.selectedInteraction);$("interactionStatus").textContent=(state.selectedInteraction&&state.selectedInteraction.status)||"draft";$("question").value=(state.selectedInteraction&&state.selectedInteraction.title)||"";var needs=needsOptions();$("addOption").classList.toggle("hidden",!needs);var box=$("options");box.innerHTML="";state.options.forEach(function(o,idx){var input=document.createElement("input");input.className="input";input.value=o.option_text||o;input.placeholder="Option "+(idx+1);input.oninput=function(){state.options[idx]={option_text:input.value,is_correct:!!o.is_correct}};box.appendChild(input)})}' +
    'function label(i){return i.type==="poll"?"Multiple choice":i.type==="word_cloud"?"Word cloud":i.type==="quiz"?"Quiz":i.type==="qa"?"Audience Q&A":i.config&&i.config.poll_kind==="rating"?"Rating":"Open text"}function needsOptions(){var t=state.template?state.template.type:(state.selectedInteraction&&state.selectedInteraction.type);return t==="poll"||t==="quiz"}' +
    'function authorize(){call("authorizeSlideEngage",[],function(){checkAuthorization();if($("email").value&&$("password").value){login();return}show("Google permission confirmed. Please sign in again.")})}function login(){call("loginSlideEngage",[$("email").value,$("password").value],function(r){state.session=r;refresh()})}function logout(){call("logout",[],function(){state={session:null,events:[],selectedEvent:null,interactions:[],selectedInteraction:null,template:null,options:[]};render()})}' +
    'function refresh(){call("getInitialState",[],function(r){state.session=r.session;state.events=r.events||[];state.selectedEvent=r.selectedEvent||null;state.interactions=r.interactions||[];render()})}function selectEvent(){call("selectEvent",[$("events").value],function(r){state.selectedEvent=r.selectedEvent;state.interactions=r.interactions||[];state.selectedInteraction=null;state.template=null;render()})}' +
    'function createEvent(){call("createEvent",[$("newEventName").value],function(r){$("newEventName").value="";state.events=r.events;state.selectedEvent=r.selectedEvent;state.interactions=[];render()})}function openTemplate(t){if(!state.selectedEvent){show("Select or create an event first.",true);return}state.template=t;state.selectedInteraction=null;state.options=(t.options||[]).map(function(x,i){return{option_text:typeof x==="string"?x:x.option_text,is_correct:i===0&&t.type==="quiz"}});renderEditor()}' +
    'function openInteraction(i){state.selectedInteraction=i;state.template=null;state.options=(i.interaction_options||[]).sort(function(a,b){return(a.position||0)-(b.position||0)}).map(function(o){return{option_text:o.option_text,is_correct:!!o.is_correct}});renderEditor()}' +
    'function addOption(){state.options.push({option_text:"Option "+(state.options.length+1),is_correct:false});renderEditor()}function editorPayload(){return{id:state.selectedInteraction&&state.selectedInteraction.id,event_id:state.selectedEvent&&state.selectedEvent.id,type:(state.template&&state.template.type)||(state.selectedInteraction&&state.selectedInteraction.type),title:$("question").value,config:(state.template&&state.template.config)||(state.selectedInteraction&&state.selectedInteraction.config)||{},options:needsOptions()?state.options:[]}}function saveInteraction(){call("saveInteraction",[editorPayload()],function(r){state.selectedInteraction=r.interaction;state.template=null;state.interactions=r.interactions;render();show("Saved.")})}' +
    'function goLive(){if(!state.selectedInteraction)return;call("setInteractionStatus",[state.selectedInteraction.id,"live"],function(r){state.selectedInteraction=r.interaction;state.interactions=r.interactions;render()})}function closeLive(){if(!state.selectedInteraction)return;call("setInteractionStatus",[state.selectedInteraction.id,"closed"],function(r){state.selectedInteraction=r.interaction;state.interactions=r.interactions;render()})}function resetResults(){if(!state.selectedInteraction)return;if(!confirm("Reset all participant responses for this interaction?"))return;call("resetResults",[state.selectedInteraction.id],function(r){show((r&&r.message)||"Results cleared successfully.")})}' +
    'function insertSlide(){call("saveInteraction",[editorPayload()],function(r){state.selectedInteraction=r.interaction;state.template=null;state.interactions=r.interactions;render();call("insertInteractionSlide",[state.selectedEvent.id,state.selectedInteraction.id],function(){show("Slide inserted. Use Open Live Results for realtime responses.")})})}function openLiveResults(){if(!state.selectedEvent||!state.selectedInteraction){show("Select an interaction first.",true);return}call("getLiveResultUrl",[state.selectedEvent.id,state.selectedInteraction.id],function(url){show("Opening live results. If it did not open, use this link: "+url);window.open(url,"_blank")})}' +
    'boot();' +
    '</script></body></html>';
}

function getInitialState() {
  assertAuthorized_();
  var session = getSession_();
  if (!session) return { session: null, events: [], selectedEvent: null, interactions: [] };
  var events = listEvents_();
  var selectedEvent = getSelectedEvent_(events);
  return {
    session: session,
    events: events,
    selectedEvent: selectedEvent,
    interactions: selectedEvent ? listInteractions_(selectedEvent.id) : [],
  };
}

function getAuthorizationStatus() {
  var info = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  var status = info.getAuthorizationStatus();
  return {
    authorized: status === ScriptApp.AuthorizationStatus.NOT_REQUIRED,
    authorizationUrl: status === ScriptApp.AuthorizationStatus.REQUIRED ? info.getAuthorizationUrl() : '',
  };
}

function login(email, password) {
  return loginSlideEngage(email, password);
}

function loginSlideEngage(email, password) {
  assertAuthorized_();
  if (!email || !password) throw new Error('Email and password required.');
  var data = apiFetch_('/api/auth/login', {
    method: 'post',
    payload: { email: email, password: password },
  });
  saveSession_(data);
  return data;
}

function authorizeSlideEngage() {
  try {
    assertAuthorized_();
    var response = UrlFetchApp.fetch(SLIDEENGAGE_URL + '/api/health', {
      method: 'get',
      muteHttpExceptions: true,
    });
    return {
      ok: true,
      status: response.getResponseCode(),
    };
  } catch (error) {
    throw normalizeFetchPermissionError_(error);
  }
}

function assertAuthorized_() {
  var info = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  if (info.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) {
    throw new Error('Google permission is required before SlideEngage can connect to your account.');
  }
}

function logout() {
  PropertiesService.getUserProperties().deleteProperty(SESSION_KEY);
  return { success: true };
}

function selectEvent(eventId) {
  if (!eventId) {
    PropertiesService.getUserProperties().deleteProperty(SELECTED_EVENT_KEY);
    return { selectedEvent: null, interactions: [] };
  }
  PropertiesService.getUserProperties().setProperty(SELECTED_EVENT_KEY, eventId);
  var events = listEvents_();
  var selectedEvent = getSelectedEvent_(events);
  return { selectedEvent: selectedEvent, interactions: selectedEvent ? listInteractions_(selectedEvent.id) : [] };
}

function createEvent(eventName) {
  var session = requireSession_();
  var name = String(eventName || '').trim();
  if (!name) throw new Error('Enter an event name.');
  var code = Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
  var data = apiFetch_('/api/events', {
    method: 'post',
    payload: {
      lecturer_id: session.lecturer.id,
      event_name: name,
      event_code: code,
      status: 'closed',
    },
  });
  PropertiesService.getUserProperties().setProperty(SELECTED_EVENT_KEY, data.event.id);
  return { selectedEvent: data.event, events: listEvents_() };
}

function saveInteraction(payload) {
  requireSession_();
  if (!payload || !payload.event_id) throw new Error('Please select or create an event before adding interactions.');
  if (!payload.title) throw new Error('Question is required.');
  var data = payload.id
    ? apiFetch_('/api/interactions', { method: 'patch', payload: { id: payload.id, title: payload.title, config: payload.config || {}, options: payload.options || [] } })
    : apiFetch_('/api/interactions', { method: 'post', payload: payload });
  return { interaction: data.interaction, interactions: listInteractions_(payload.event_id) };
}

function setInteractionStatus(interactionId, status) {
  requireSession_();
  var data = apiFetch_('/api/interactions', { method: 'patch', payload: { id: interactionId, status: status } });
  return { interaction: data.interaction, interactions: listInteractions_(data.interaction.event_id) };
}

function resetResults(interactionId) {
  requireSession_();
  return apiFetch_('/api/responses?interaction_id=' + encodeURIComponent(interactionId), { method: 'delete' });
}

function insertInteractionSlide(eventId, interactionId) {
  return drawInteractionSlide_(eventId, interactionId, false);
}

function updateInteractionSlide(eventId, interactionId) {
  return drawInteractionSlide_(eventId, interactionId, true);
}

function getLiveResultUrl(eventId, interactionId) {
  return SLIDEENGAGE_URL + '/present/live-result/' + encodeURIComponent(eventId) + '/' + encodeURIComponent(interactionId);
}

function updateSelectedInteractionSnapshot() {
  var props = PropertiesService.getDocumentProperties();
  var eventId = props.getProperty('SLIDEENGAGE_LAST_EVENT_ID');
  var interactionId = props.getProperty('SLIDEENGAGE_LAST_INTERACTION_ID');
  if (!eventId || !interactionId) {
    SlidesApp.getUi().alert('Open SlideEngage and insert an interaction slide first.');
    return;
  }
  drawInteractionSlide_(eventId, interactionId, true);
  SlidesApp.getUi().alert('SlideEngage snapshot updated.');
}

function drawInteractionSlide_(eventId, interactionId, updateExisting) {
  requireSession_();
  var event = apiFetch_('/api/events?id=' + encodeURIComponent(eventId), { method: 'get' }).event;
  var interactions = listInteractions_(eventId);
  var interaction = null;
  for (var i = 0; i < interactions.length; i++) {
    if (interactions[i].id === interactionId) interaction = interactions[i];
  }
  if (!interaction) throw new Error('Interaction not found.');

  var slide = updateExisting ? findSlideForInteraction_(interactionId) : null;
  if (!slide) slide = SlidesApp.getActivePresentation().appendSlide(SlidesApp.PredefinedLayout.BLANK);
  clearSlide_(slide);
  renderSlide_(slide, event, interaction, getResults_(interaction));

  var props = PropertiesService.getDocumentProperties();
  props.setProperty('SLIDEENGAGE_SLIDE_' + interactionId, slide.getObjectId());
  props.setProperty('SLIDEENGAGE_LAST_EVENT_ID', eventId);
  props.setProperty('SLIDEENGAGE_LAST_INTERACTION_ID', interactionId);
  return { success: true, slide_id: slide.getObjectId() };
}

function renderSlide_(slide, event, interaction, resultData) {
  var code = event.event_code || event.code;
  var joinUrl = SLIDEENGAGE_URL + '/join?code=' + encodeURIComponent(code);
  var liveUrl = getLiveResultUrl(event.id, interaction.id);
  slide.getBackground().setSolidFill('#F4F7F4');
  text_(slide, 'SlideEngage', 25, 15, 180, 24, 11, true, '#168A3A');
  text_(slide, label_(interaction).toUpperCase(), 280, 15, 300, 24, 11, true, '#6B7B8D');

  rounded_(slide, 30, 60, 165, 405, '#FFFFFF', '#DDEBE3');
  text_(slide, 'Join at', 55, 85, 120, 24, 14, true, '#17172F');
  text_(slide, host_(), 55, 112, 120, 24, 13, true, '#168A3A');
  try {
    var qr = UrlFetchApp.fetch(SLIDEENGAGE_URL + '/api/qrcode?code=' + encodeURIComponent(code) + '&format=png').getBlob().setName('slideengage-qr.png');
    slide.insertImage(qr, 52, 155, 120, 120);
  } catch (e) {
    text_(slide, 'QR unavailable', 52, 190, 120, 24, 12, true, '#B42318', SlidesApp.ParagraphAlignment.CENTER);
  }
  text_(slide, 'Scan QR code to join', 42, 292, 145, 24, 10, true, '#17172F', SlidesApp.ParagraphAlignment.CENTER);
  rounded_(slide, 52, 330, 120, 42, '#EAF7EF', '#CBEAD4');
  text_(slide, '#' + code, 52, 340, 120, 28, 20, true, '#168A3A', SlidesApp.ParagraphAlignment.CENTER);
  text_(slide, joinUrl, 42, 392, 145, 34, 7, false, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);

  rounded_(slide, 220, 60, 470, 405, '#FFFFFF', '#DDEBE3');
  text_(slide, interaction.title || 'Untitled interaction', 250, 92, 410, 55, 24, true, '#17172F');
  text_(slide, 'Scan the QR code or enter the event code to join.', 250, 148, 410, 22, 10, true, '#6B7B8D');
  if (interaction.type === 'poll' || interaction.type === 'quiz') {
    var options = interaction.interaction_options || [];
    for (var i = 0; i < Math.min(options.length, 6); i++) {
      rounded_(slide, 250, 182 + i * 42, 380, 30, '#F4F7F4', '#DDEBE3');
      text_(slide, String.fromCharCode(65 + i) + '. ' + (options[i].option_text || 'Option'), 262, 190 + i * 42, 354, 16, 10, true, options[i].is_correct ? '#168A3A' : '#17172F');
    }
  } else {
    text_(slide, 'Live results open in a realtime browser view.', 250, 225, 410, 28, 16, true, '#17172F', SlidesApp.ParagraphAlignment.CENTER);
  }
  rounded_(slide, 325, 380, 220, 38, '#168A3A', '#168A3A');
  var button = text_(slide, 'View Live Results', 325, 390, 220, 18, 12, true, '#FFFFFF', SlidesApp.ParagraphAlignment.CENTER);
  try { button.getText().getTextStyle().setLinkUrl(liveUrl); } catch (e) {}
  text_(slide, liveUrl, 250, 428, 410, 18, 7, false, '#168A3A', SlidesApp.ParagraphAlignment.CENTER);
}

function renderResults_(slide, interaction, data) {
  var results = data.results || [];
  if (interaction.type === 'poll' || interaction.type === 'quiz') {
    if (!results.length) {
      var options = interaction.interaction_options || [];
      for (var i = 0; i < options.length; i++) {
        text_(slide, options[i].option_text, 260, 170 + i * 48, 300, 24, 14, true, '#17172F');
        bar_(slide, 260, 198 + i * 48, 285, 10, 0, '#168A3A');
        text_(slide, '0%', 560, 190 + i * 48, 60, 18, 12, true, '#6B7B8D');
      }
      return;
    }
    for (var p = 0; p < Math.min(results.length, 6); p++) {
      var row = results[p];
      text_(slide, row.option_text || row.label || 'Option', 260, 170 + p * 48, 300, 24, 14, true, '#17172F');
      bar_(slide, 260, 198 + p * 48, 285, 10, Number(row.percentage || 0), '#168A3A');
      text_(slide, (row.percentage || 0) + '% · ' + (row.count || 0), 560, 190 + p * 48, 90, 18, 12, true, '#168A3A');
    }
    return;
  }
  if (interaction.type === 'word_cloud') {
    if (!results.length) {
      text_(slide, 'Live responses will appear here', 270, 250, 360, 32, 20, true, '#A3AEA8', SlidesApp.ParagraphAlignment.CENTER);
      return;
    }
    var colors = ['#168A3A', '#1A6BB5', '#D46B08', '#8B1A4A', '#7C3AED', '#0F766E'];
    for (var w = 0; w < Math.min(results.length, 24); w++) {
      var col = w % 4;
      var rowIndex = Math.floor(w / 4);
      var size = Math.max(12, Math.min(34, 14 + Number(results[w].count || 1) * 6 - rowIndex));
      text_(slide, results[w].word || results[w].text || '', 255 + col * 100, 170 + rowIndex * 42, 95, 28, size, true, colors[w % colors.length]);
    }
    return;
  }
  if (interaction.type === 'qa') {
    var questions = data.results || [];
    if (!questions.length) {
      text_(slide, 'Ask your question', 270, 225, 360, 34, 24, true, '#17172F', SlidesApp.ParagraphAlignment.CENTER);
      text_(slide, 'Live questions will appear here', 270, 268, 360, 28, 15, false, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);
      return;
    }
    for (var q = 0; q < Math.min(questions.length, 5); q++) {
      rounded_(slide, 255, 165 + q * 52, 385, 40, '#F4F7F4', '#DDEBE3');
      text_(slide, questions[q].question_text || questions[q].text || '', 268, 176 + q * 52, 310, 20, 12, true, '#17172F');
      text_(slide, '+' + (questions[q].upvote_count || 0), 600, 176 + q * 52, 35, 20, 11, true, '#168A3A');
    }
    return;
  }
  var items = Array.isArray(results) ? results : (results.text_responses || []);
  if (!items.length) {
    text_(slide, 'Live responses will appear here', 270, 250, 360, 32, 20, true, '#A3AEA8', SlidesApp.ParagraphAlignment.CENTER);
    return;
  }
  for (var r = 0; r < Math.min(items.length, 5); r++) {
    rounded_(slide, 255, 165 + r * 52, 385, 40, '#F4F7F4', '#DDEBE3');
    text_(slide, items[r].text || items[r].text_value || JSON.stringify(items[r]), 270, 176 + r * 52, 340, 20, 12, true, '#17172F');
  }
}

function getResults_(interaction) {
  if (interaction.type === 'qa') {
    var qa = apiFetch_('/api/qa?interaction_id=' + encodeURIComponent(interaction.id) + '&sort=popular', { method: 'get' });
    return { results: qa.questions || [], total_responses: (qa.questions || []).length };
  }
  return apiFetch_('/api/results?interaction_id=' + encodeURIComponent(interaction.id), { method: 'get' });
}

function listEvents_() {
  var session = requireSession_();
  var events = apiFetch_('/api/events?lecturer_id=' + encodeURIComponent(session.lecturer.id), { method: 'get' }).events || [];
  return events.filter(isUsableEvent_);
}

function listInteractions_(eventId) {
  return apiFetch_('/api/interactions?event_id=' + encodeURIComponent(eventId), { method: 'get' }).interactions || [];
}

function getSelectedEvent_(events) {
  if (!events.length) {
    PropertiesService.getUserProperties().deleteProperty(SELECTED_EVENT_KEY);
    return null;
  }
  var selectedId = PropertiesService.getUserProperties().getProperty(SELECTED_EVENT_KEY);
  for (var i = 0; i < events.length; i++) {
    if (events[i].id === selectedId) return events[i];
  }
  if (selectedId) {
    PropertiesService.getUserProperties().deleteProperty(SELECTED_EVENT_KEY);
    return null;
  }
  PropertiesService.getUserProperties().setProperty(SELECTED_EVENT_KEY, events[0].id);
  return events[0];
}

function isUsableEvent_(event) {
  return event && event.status !== 'archived';
}

function getSession_() {
  var raw = PropertiesService.getUserProperties().getProperty(SESSION_KEY);
  if (!raw) return null;
  var session = JSON.parse(raw);
  if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) {
    PropertiesService.getUserProperties().deleteProperty(SESSION_KEY);
    return null;
  }
  return session;
}

function requireSession_() {
  var session = getSession_();
  if (!session) throw new Error('Please sign in to SlideEngage first.');
  return session;
}

function saveSession_(data) {
  var session = {
    lecturer: data.lecturer,
    expires_at: data.expires_at || new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  };
  PropertiesService.getUserProperties().setProperty(SESSION_KEY, JSON.stringify(session));
}

function apiFetch_(path, options) {
  if (!/^https:\/\//.test(SLIDEENGAGE_URL) || /localhost|127\.0\.0\.1/.test(SLIDEENGAGE_URL)) {
    throw new Error('Set SLIDEENGAGE_URL to your public HTTPS SlideEngage deployment.');
  }
  options = options || {};
  var params = {
    method: options.method || 'get',
    muteHttpExceptions: true,
    headers: { 'Content-Type': 'application/json' },
  };
  if (options.payload) params.payload = JSON.stringify(options.payload);
  var response;
  try {
    response = UrlFetchApp.fetch(SLIDEENGAGE_URL + path, params);
  } catch (error) {
    throw normalizeFetchPermissionError_(error);
  }
  var text = response.getContentText();
  var data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error('SlideEngage returned an unreadable response. Please try again.');
  }
  if (response.getResponseCode() === 401 && path === '/api/auth/login') {
    throw new Error('Invalid SlideEngage email or password.');
  }
  if (response.getResponseCode() >= 400) throw new Error(data.error || 'SlideEngage request failed.');
  return data;
}

function normalizeFetchPermissionError_(error) {
  var message = error && error.message ? error.message : String(error || '');
  if (/UrlFetchApp|external_request|permission|authorization|not have permission/i.test(message)) {
    return new Error('Authorization required. Please click Authorize and allow Google permissions.');
  }
  if (/Address unavailable|DNS|timed out|failed/i.test(message)) {
    return new Error('Network error. SlideEngage could not reach the public website.');
  }
  return new Error(message || 'SlideEngage request failed.');
}

function findSlideForInteraction_(interactionId) {
  var slideId = PropertiesService.getDocumentProperties().getProperty('SLIDEENGAGE_SLIDE_' + interactionId);
  if (!slideId) return null;
  var slides = SlidesApp.getActivePresentation().getSlides();
  for (var i = 0; i < slides.length; i++) {
    if (slides[i].getObjectId() === slideId) return slides[i];
  }
  return null;
}

function clearSlide_(slide) {
  var elements = slide.getPageElements();
  for (var i = elements.length - 1; i >= 0; i--) elements[i].remove();
}

function label_(interaction) {
  if (interaction.type === 'poll') return 'Multiple choice';
  if (interaction.type === 'word_cloud') return 'Word cloud';
  if (interaction.type === 'quiz') return 'Quiz';
  if (interaction.type === 'qa') return 'Audience Q&A';
  if (interaction.config && interaction.config.poll_kind === 'rating') return 'Rating';
  return 'Open text';
}

function host_() {
  return SLIDEENGAGE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function text_(slide, text, left, top, width, height, size, bold, color, align) {
  var box = slide.insertTextBox(String(text || ''), left, top, width, height);
  var range = box.getText();
  range.getTextStyle().setFontSize(size).setBold(!!bold).setForegroundColor(color || '#17172F');
  range.getParagraphStyle().setParagraphAlignment(align || SlidesApp.ParagraphAlignment.START);
  return box;
}

function rounded_(slide, left, top, width, height, fill, stroke) {
  var shape = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, left, top, width, height);
  shape.getFill().setSolidFill(fill);
  shape.getBorder().setWeight(1).getLineFill().setSolidFill(stroke);
  return shape;
}

function bar_(slide, left, top, width, height, percentage, color) {
  rounded_(slide, left, top, width, height, '#E3E7E5', '#E3E7E5');
  rounded_(slide, left, top, Math.max(4, width * Math.min(100, percentage) / 100), height, color, color);
}
