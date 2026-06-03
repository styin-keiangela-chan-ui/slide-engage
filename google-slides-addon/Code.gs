/**
 * SlideEngage Google Slides Add-on
 * Marketplace-ready Apps Script entrypoint.
 *
 * This add-on uses the same SlideEngage website account as PowerPoint and the
 * web dashboard by calling the public SlideEngage API.
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

function showHomepage() {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('SlideEngage').setSubtitle('Live polls, Q&A, quizzes and word clouds'))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText('Open the SlideEngage sidebar to log in, select an event, create interactions, and insert live result snapshots.'))
        .addWidget(
          CardService.newTextButton()
            .setText('Open SlideEngage Sidebar')
            .setOnClickAction(CardService.newAction().setFunctionName('showSlideEngageSidebarAction'))
        )
    )
    .build();
}

function showSlideEngageSidebarAction() {
  showSlideEngageSidebar();
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText('SlideEngage sidebar opened.'))
    .build();
}

function showSlideEngageSidebar() {
  var html = HtmlService.createTemplateFromFile('Sidebar')
    .evaluate()
    .setTitle('SlideEngage');
  SlidesApp.getUi().showSidebar(html);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
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
    UrlFetchApp.fetch(SLIDEENGAGE_URL, { muteHttpExceptions: true });
    return { success: true };
  } catch (error) {
    throw normalizeFetchPermissionError_(error);
  }
}

function assertAuthorized_() {
  var info = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
  if (info.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) {
    throw new Error('Please authorize SlideEngage to connect to the internet.');
  }
}

function logout() {
  PropertiesService.getUserProperties().deleteProperty(SESSION_KEY);
  return { success: true };
}

function selectEvent(eventId) {
  PropertiesService.getUserProperties().setProperty(SELECTED_EVENT_KEY, eventId);
  var events = listEvents_();
  var selectedEvent = getSelectedEvent_(events);
  return {
    selectedEvent: selectedEvent,
    interactions: selectedEvent ? listInteractions_(selectedEvent.id) : [],
  };
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
  return { selectedEvent: data.event, events: listEvents_(), interactions: [] };
}

function saveInteraction(payload) {
  requireSession_();
  if (!payload || !payload.event_id) throw new Error('Please select or create an event before adding interactions.');
  if (!payload.title) throw new Error('Question is required.');

  var data = payload.id
    ? apiFetch_('/api/interactions', {
        method: 'patch',
        payload: {
          id: payload.id,
          title: payload.title,
          config: payload.config || {},
          options: payload.options || [],
        },
      })
    : apiFetch_('/api/interactions', { method: 'post', payload: payload });

  return {
    interaction: data.interaction,
    interactions: listInteractions_(payload.event_id),
  };
}

function setInteractionStatus(interactionId, status) {
  requireSession_();
  var data = apiFetch_('/api/interactions', {
    method: 'patch',
    payload: { id: interactionId, status: status },
  });
  return {
    interaction: data.interaction,
    interactions: listInteractions_(data.interaction.event_id),
  };
}

function resetResults(interactionId) {
  requireSession_();
  return apiFetch_('/api/responses?interaction_id=' + encodeURIComponent(interactionId), {
    method: 'delete',
  });
}

function deleteInteraction(interactionId, eventId) {
  requireSession_();
  apiFetch_('/api/interactions?id=' + encodeURIComponent(interactionId), {
    method: 'delete',
  });
  return { success: true, interactions: listInteractions_(eventId) };
}

function insertInteractionSlide(eventId, interactionId) {
  return drawInteractionSlide_(eventId, interactionId, false);
}

function updateInteractionSlide(eventId, interactionId) {
  return drawInteractionSlide_(eventId, interactionId, true);
}

function getInteractionSlideState(interactionId) {
  return { exists: !!findSlideForInteraction_(interactionId) };
}

function getLivePresenterUrl(eventId) {
  var event = apiFetch_('/api/events?id=' + encodeURIComponent(eventId), { method: 'get' }).event;
  return presenterUrl_(event);
}

function presentLiveSlide(eventId, interactionId, insertNew) {
  var result = drawInteractionSlide_(eventId, interactionId, !insertNew);
  var event = apiFetch_('/api/events?id=' + encodeURIComponent(eventId), { method: 'get' }).event;
  result.presenter_url = presenterUrl_(event);
  return result;
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
  var interaction = findInteraction_(eventId, interactionId);
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
  renderResults_(slide, interaction, resultData);
}

function presenterUrl_(event) {
  var code = event.event_code || event.code;
  return SLIDEENGAGE_URL + '/present/' + encodeURIComponent(code);
}

function renderResults_(slide, interaction, data) {
  var results = data.results || [];
  if (interaction.type === 'poll' || interaction.type === 'quiz') return renderPoll_(slide, interaction, results);
  if (interaction.type === 'word_cloud') return renderWordCloud_(slide, results);
  if (interaction.type === 'qa') return renderQa_(slide, results);
  return renderOpenText_(slide, Array.isArray(results) ? results : (results.text_responses || []));
}

function renderPoll_(slide, interaction, results) {
  var rows = results.length ? results : (interaction.interaction_options || []).map(function (option) {
    return { option_text: option.option_text, percentage: 0, count: 0 };
  });
  for (var i = 0; i < Math.min(rows.length, 6); i++) {
    var row = rows[i];
    text_(slide, row.option_text || row.label || 'Option', 260, 170 + i * 48, 300, 24, 14, true, '#17172F');
    bar_(slide, 260, 198 + i * 48, 285, 10, Number(row.percentage || 0), '#168A3A');
    text_(slide, (row.percentage || 0) + '% · ' + (row.count || 0), 560, 190 + i * 48, 90, 18, 12, true, '#168A3A');
  }
}

function renderWordCloud_(slide, results) {
  if (!results.length) {
    text_(slide, 'Live responses will appear here', 270, 250, 360, 32, 20, true, '#A3AEA8', SlidesApp.ParagraphAlignment.CENTER);
    return;
  }
  var colors = ['#168A3A', '#1A6BB5', '#D46B08', '#8B1A4A', '#7C3AED', '#0F766E'];
  for (var i = 0; i < Math.min(results.length, 24); i++) {
    var col = i % 4;
    var row = Math.floor(i / 4);
    var size = Math.max(12, Math.min(34, 14 + Number(results[i].count || 1) * 6 - row));
    text_(slide, results[i].word || results[i].text || '', 255 + col * 100, 170 + row * 42, 95, 28, size, true, colors[i % colors.length]);
  }
}

function renderQa_(slide, questions) {
  if (!questions.length) {
    text_(slide, 'Ask your question', 270, 225, 360, 34, 24, true, '#17172F', SlidesApp.ParagraphAlignment.CENTER);
    text_(slide, 'Live questions will appear here', 270, 268, 360, 28, 15, false, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);
    return;
  }
  for (var i = 0; i < Math.min(questions.length, 5); i++) {
    rounded_(slide, 255, 165 + i * 52, 385, 40, '#F4F7F4', '#DDEBE3');
    text_(slide, questions[i].question_text || questions[i].text || '', 268, 176 + i * 52, 310, 20, 12, true, '#17172F');
    text_(slide, '+' + (questions[i].upvote_count || 0), 600, 176 + i * 52, 35, 20, 11, true, '#168A3A');
  }
}

function renderOpenText_(slide, items) {
  if (!items.length) {
    text_(slide, 'Live responses will appear here', 270, 250, 360, 32, 20, true, '#A3AEA8', SlidesApp.ParagraphAlignment.CENTER);
    return;
  }
  for (var i = 0; i < Math.min(items.length, 5); i++) {
    rounded_(slide, 255, 165 + i * 52, 385, 40, '#F4F7F4', '#DDEBE3');
    text_(slide, items[i].text || items[i].text_value || JSON.stringify(items[i]), 270, 176 + i * 52, 340, 20, 12, true, '#17172F');
  }
}

function findInteraction_(eventId, interactionId) {
  var interactions = listInteractions_(eventId);
  for (var i = 0; i < interactions.length; i++) {
    if (interactions[i].id === interactionId) return interactions[i];
  }
  throw new Error('Interaction not found.');
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
  return apiFetch_('/api/events?lecturer_id=' + encodeURIComponent(session.lecturer.id), { method: 'get' }).events || [];
}

function listInteractions_(eventId) {
  return apiFetch_('/api/interactions?event_id=' + encodeURIComponent(eventId), { method: 'get' }).interactions || [];
}

function getSelectedEvent_(events) {
  if (!events.length) return null;
  var selectedId = PropertiesService.getUserProperties().getProperty(SELECTED_EVENT_KEY);
  for (var i = 0; i < events.length; i++) {
    if (events[i].id === selectedId) return events[i];
  }
  PropertiesService.getUserProperties().setProperty(SELECTED_EVENT_KEY, events[0].id);
  return events[0];
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
    return new Error('Please authorize SlideEngage to connect to the internet.');
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
