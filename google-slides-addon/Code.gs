/**
 * SlideEngage Google Slides Add-on
 * Marketplace-ready Apps Script entrypoint.
 *
 * This add-on uses the same SlideEngage website account as PowerPoint and the
 * web dashboard by calling the public SlideEngage API.
 */

var SLIDEENGAGE_URL = 'https://slide-engage.vercel.app';
var SUPABASE_URL = 'https://iqfnqfqokiupsnhjpnfb.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZm5xZnFva2l1cHNuaGpwbmZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Mjg0OTQsImV4cCI6MjA5NDQwNDQ5NH0.Maj-aBswCBZvKLgWAWvdvvXndNvPGdJCelt8nyt7ry8';
var SESSION_KEY = 'SLIDEENGAGE_SESSION';
var SELECTED_EVENT_KEY = 'SLIDEENGAGE_SELECTED_EVENT_ID';
var QR_CACHE_PREFIX = 'SLIDEENGAGE_QR_';

function onOpen() {
  SlidesApp.getUi()
    .createMenu('🎯 SlideEngage')
    .addItem('Open SlideEngage', 'showSlideEngageSidebar')
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

function getSupabaseUrl_() {
  return SUPABASE_URL;
}

function getSupabaseAnonKey_() {
  return SUPABASE_ANON_KEY;
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
    return {
      selectedEvent: null,
      interactions: [],
    };
  }
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

function getLiveResultSnapshot(eventId, interactionId) {
  requireSession_();
  var event = apiFetch_('/api/events?id=' + encodeURIComponent(eventId), { method: 'get' }).event;
  if (!isUsableEvent_(event)) {
    PropertiesService.getUserProperties().deleteProperty(SELECTED_EVENT_KEY);
    throw new Error('This event is archived or no longer available. Please select another event.');
  }
  var interaction = findInteraction_(eventId, interactionId);
  var snapshot = buildInteractionSnapshot_(event, interaction);
  return {
    event: event,
    interaction: interaction,
    results: snapshot.resultData.results || [],
    total_responses: snapshot.totalResponses,
    eventCode: snapshot.eventCode,
    question: snapshot.question,
    interactionType: snapshot.interactionType,
    joinUrl: snapshot.joinUrl,
    hasResults: snapshot.hasResults,
  };
}

function getInteractionSlideState(interactionId) {
  return { exists: !!findSlideForInteraction_(interactionId) };
}

function getLivePresenterUrl(eventId) {
  var event = apiFetch_('/api/events?id=' + encodeURIComponent(eventId), { method: 'get' }).event;
  return presenterUrl_(event);
}

function getLiveResultUrl(eventId, interactionId) {
  return liveResultUrl_(eventId, interactionId);
}

function presentLiveSlide(eventId, interactionId, insertNew) {
  setInteractionStatus(interactionId, 'live');
  var result = drawInteractionSlide_(eventId, interactionId, !insertNew);
  result.presenter_url = liveResultUrl_(eventId, interactionId);
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
  var snapshot = buildInteractionSnapshot_(event, interaction);
  var slide = updateExisting ? findSlideForInteraction_(interactionId) : null;
  var createdWithBatch = false;
  if (!slide && !updateExisting) {
    slide = tryDrawInteractionSlideBatch_(event, interaction, snapshot);
    createdWithBatch = !!slide;
  }
  if (!slide) slide = SlidesApp.getActivePresentation().appendSlide(SlidesApp.PredefinedLayout.BLANK);

  if (!createdWithBatch) {
    clearSlide_(slide);
    renderSlide_(slide, event, interaction, snapshot);
  }

  var props = PropertiesService.getDocumentProperties();
  props.setProperty('SLIDEENGAGE_SLIDE_' + interactionId, slide.getObjectId());
  props.setProperty('SLIDEENGAGE_LAST_EVENT_ID', eventId);
  props.setProperty('SLIDEENGAGE_LAST_INTERACTION_ID', interactionId);
  markInteractionSlide_(interaction, slide.getObjectId());
  focusGeneratedSlide_(slide);
  return {
    success: true,
    slide_id: slide.getObjectId(),
    snapshot: {
      eventCode: snapshot.eventCode,
      question: snapshot.question,
      interactionType: snapshot.interactionType,
      totalResponses: snapshot.totalResponses,
      joinUrl: snapshot.joinUrl,
      liveResultUrl: snapshot.liveResultUrl,
      hasResults: snapshot.hasResults,
    },
  };
}

function tryDrawInteractionSlideBatch_(event, interaction, snapshot) {
  if (typeof Slides === 'undefined' || !Slides.Presentations || !Slides.Presentations.batchUpdate) return null;

  try {
    var presentation = SlidesApp.getActivePresentation();
    var presentationId = presentation.getId();
    var slideId = objectId_('se_slide');
    var pageWidth = presentation.getPageWidth();
    var pageHeight = presentation.getPageHeight();
    var code = snapshot.eventCode || event.event_code || event.code;
    var joinUrl = snapshot.joinUrl || (SLIDEENGAGE_URL + '/join?code=' + encodeURIComponent(code));
    var qrUrl = SLIDEENGAGE_URL + '/api/qrcode?code=' + encodeURIComponent(code) + '&format=png';
    var requests = [
      {
        createSlide: {
          objectId: slideId,
          insertionIndex: presentation.getSlides().length,
          slideLayoutReference: { predefinedLayout: 'BLANK' },
        },
      },
    ];

    batchShape_(requests, objectId_('bg'), 'RECTANGLE', slideId, 0, 0, pageWidth, pageHeight, '#F4F7F4', '#F4F7F4');
    batchText_(requests, objectId_('brand'), slideId, 'SlideEngage', 24, 16, 180, 24, 12, true, '#168A3A');
    batchText_(requests, objectId_('type'), slideId, label_(interaction).toUpperCase(), 280, 16, 320, 24, 11, true, '#6B7B8D');

    batchShape_(requests, objectId_('join'), 'ROUND_RECTANGLE', slideId, 30, 60, 165, 405, '#FFFFFF', '#DDEBE3');
    batchText_(requests, objectId_('joinAt'), slideId, 'Join at', 48, 82, 130, 24, 15, true, '#17172F');
    batchText_(requests, objectId_('host'), slideId, host_(), 48, 110, 134, 24, 13, true, '#168A3A');
    requests.push({
      createImage: {
        url: qrUrl,
        elementProperties: batchElement_(slideId, 45, 146, 135, 135),
      },
    });
    batchText_(requests, objectId_('scan'), slideId, 'Scan QR code to join', 40, 296, 148, 24, 10, true, '#17172F', 'CENTER');
    batchShape_(requests, objectId_('codeBox'), 'ROUND_RECTANGLE', slideId, 45, 328, 135, 48, '#EAF7EF', '#CBEAD4');
    batchText_(requests, objectId_('eventCode'), slideId, '#' + code, 45, 338, 135, 30, 23, true, '#168A3A', 'CENTER');
    batchText_(requests, objectId_('joinUrl'), slideId, truncate_(joinUrl, 34), 40, 396, 148, 36, 7, false, '#6B7B8D', 'CENTER');

    batchShape_(requests, objectId_('main'), 'ROUND_RECTANGLE', slideId, 220, 60, 470, 405, '#FFFFFF', '#DDEBE3');
    batchText_(requests, objectId_('question'), slideId, interaction.title || 'Untitled interaction', 248, 88, 415, 78, 29, true, '#17172F');
    batchText_(requests, objectId_('instruction'), slideId, 'Scan the QR code or enter the event code to join.', 248, 170, 415, 24, 11, true, '#6B7B8D');

    if (interaction.type === 'poll' || interaction.type === 'quiz') {
      var options = (interaction.interaction_options || []).slice(0, 5);
      for (var i = 0; i < options.length; i++) {
        batchShape_(requests, objectId_('optionBox'), 'ROUND_RECTANGLE', slideId, 252, 220 + i * 46, 390, 34, '#F4F7F4', optionColor_(i));
        batchText_(requests, objectId_('optionText'), slideId, String.fromCharCode(65 + i) + '. ' + truncate_(options[i].option_text || 'Option ' + (i + 1), 58), 266, 228 + i * 46, 360, 20, 14, true, '#17172F');
      }
    } else if (interaction.type === 'qa') {
      batchText_(requests, objectId_('qaTitle'), slideId, 'Ask your question', 270, 230, 360, 34, 24, true, '#17172F', 'CENTER');
      batchText_(requests, objectId_('qaHelp'), slideId, 'Questions will appear in SlideEngage live results.', 270, 272, 360, 28, 14, false, '#6B7B8D', 'CENTER');
    } else {
      batchText_(requests, objectId_('waiting'), slideId, 'Answer from your phone', 270, 235, 360, 34, 24, true, '#17172F', 'CENTER');
      batchText_(requests, objectId_('waitingHelp'), slideId, 'Responses will appear in SlideEngage live results.', 270, 278, 360, 28, 14, false, '#6B7B8D', 'CENTER');
    }

    Slides.Presentations.batchUpdate({ requests: requests }, presentationId);
    return findSlideById_(slideId);
  } catch (error) {
    return null;
  }
}

function objectId_(prefix) {
  return prefix + '_' + new Date().getTime().toString(36) + '_' + Math.floor(Math.random() * 100000).toString(36);
}

function batchElement_(pageId, left, top, width, height) {
  return {
    pageObjectId: pageId,
    size: {
      width: { magnitude: width, unit: 'PT' },
      height: { magnitude: height, unit: 'PT' },
    },
    transform: {
      scaleX: 1,
      scaleY: 1,
      translateX: left,
      translateY: top,
      unit: 'PT',
    },
  };
}

function batchShape_(requests, id, shapeType, pageId, left, top, width, height, fill, line) {
  requests.push({
    createShape: {
      objectId: id,
      shapeType: shapeType,
      elementProperties: batchElement_(pageId, left, top, width, height),
    },
  });
  requests.push({
    updateShapeProperties: {
      objectId: id,
      shapeProperties: {
        shapeBackgroundFill: { solidFill: { color: { rgbColor: hexRgb_(fill) } } },
        outline: { outlineFill: { solidFill: { color: { rgbColor: hexRgb_(line || fill) } } }, weight: { magnitude: 1, unit: 'PT' } },
      },
      fields: 'shapeBackgroundFill.solidFill.color,outline.outlineFill.solidFill.color,outline.weight',
    },
  });
}

function batchText_(requests, id, pageId, text, left, top, width, height, fontSize, bold, color, align) {
  requests.push({
    createShape: {
      objectId: id,
      shapeType: 'TEXT_BOX',
      elementProperties: batchElement_(pageId, left, top, width, height),
    },
  });
  requests.push({ insertText: { objectId: id, text: String(text || '') } });
  requests.push({
    updateTextStyle: {
      objectId: id,
      style: {
        fontSize: { magnitude: fontSize, unit: 'PT' },
        foregroundColor: { opaqueColor: { rgbColor: hexRgb_(color) } },
        bold: !!bold,
      },
      fields: 'fontSize,foregroundColor,bold',
    },
  });
  if (align) {
    requests.push({
      updateParagraphStyle: {
        objectId: id,
        style: { alignment: align },
        fields: 'alignment',
      },
    });
  }
}

function hexRgb_(hex) {
  var clean = String(hex || '#FFFFFF').replace('#', '');
  return {
    red: parseInt(clean.slice(0, 2), 16) / 255,
    green: parseInt(clean.slice(2, 4), 16) / 255,
    blue: parseInt(clean.slice(4, 6), 16) / 255,
  };
}

function findSlideById_(slideId) {
  var slides = SlidesApp.getActivePresentation().getSlides();
  for (var i = 0; i < slides.length; i++) {
    if (slides[i].getObjectId() === slideId) return slides[i];
  }
  return null;
}

function focusGeneratedSlide_(slide) {
  if (!slide) return;

  var highlight = null;
  try {
    var presentation = SlidesApp.getActivePresentation();
    var pageWidth = presentation.getPageWidth();
    var pageHeight = presentation.getPageHeight();
    highlight = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, 8, 8, pageWidth - 16, pageHeight - 16);
    highlight.getFill().setTransparent();
    highlight.getLine().setSolidFill('#168A3A');
    highlight.getLine().setWeight(5);
  } catch (error) {}

  try {
    if (typeof slide.selectAsCurrentPage === 'function') slide.selectAsCurrentPage();
  } catch (error) {}

  try {
    var elements = slide.getPageElements();
    if (elements && elements.length && typeof elements[0].select === 'function') elements[0].select();
  } catch (error) {}

  try {
    if (typeof SlidesApp.flush === 'function') SlidesApp.flush();
  } catch (error) {}

  if (highlight) {
    try {
      Utilities.sleep(1200);
      highlight.remove();
      if (typeof slide.selectAsCurrentPage === 'function') slide.selectAsCurrentPage();
    } catch (error) {}
  }
}

function markInteractionSlide_(interaction, slideId) {
  var config = interaction && interaction.config ? interaction.config : {};
  config.google_slides_slide_id = slideId;
  config.google_slides_presented_at = new Date().toISOString();
  try {
    config.google_slides_presentation_id = SlidesApp.getActivePresentation().getId();
  } catch (error) {}

  apiFetch_('/api/interactions', {
    method: 'patch',
    payload: {
      id: interaction.id,
      config: config,
    },
  });
}

function buildInteractionSnapshot_(event, interaction) {
  if (!event) throw new Error('Unable to load event for this slide.');
  if (!interaction) throw new Error('Unable to load interaction for this slide.');

  var code = event.event_code || event.code;
  if (!code) throw new Error('Unable to load live results. Please refresh and try again.');

  var resultData = getResults_(interaction);
  if (!resultData) throw new Error('Unable to load live results. Please refresh and try again.');

  var results = resultData.results;
  var hasResults = Number(resultData.total_responses || 0) > 0;
  if (interaction.type === 'feedback' && interaction.config && interaction.config.poll_kind === 'rating') {
    hasResults = !!(results && (results.rating_count || resultData.total_responses));
  }

  return {
    eventCode: code,
    question: interaction.title || 'Untitled interaction',
    interactionType: label_(interaction),
    joinUrl: SLIDEENGAGE_URL + '/join?code=' + encodeURIComponent(code),
    liveResultUrl: liveResultUrl_(event.id, interaction.id),
    qrCode: SLIDEENGAGE_URL + '/api/qrcode?code=' + encodeURIComponent(code) + '&format=png',
    resultData: resultData,
    totalResponses: resultData.total_responses || 0,
    hasResults: hasResults,
  };
}

function renderSlide_(slide, event, interaction, snapshot) {
  var code = snapshot.eventCode;
  var joinUrl = snapshot.joinUrl;
  var page = pageLayout_();
  var join = page.join;
  var result = page.result;
  var content = page.content;

  slide.getBackground().setSolidFill('#F4F7F4');
  text_(slide, 'SlideEngage', page.margin, 15, 180, 24, 11, true, '#168A3A');
  text_(slide, snapshot.interactionType.toUpperCase(), result.x + 30, 15, Math.min(300, result.w - 60), 24, 11, true, '#6B7B8D');

  rounded_(slide, join.x, join.y, join.w, join.h, '#FFFFFF', '#DDEBE3');
  text_(slide, 'Join at', join.x + 18, join.y + 18, join.w - 36, 22, 14, true, '#17172F');
  text_(slide, truncate_(host_(), 22), join.x + 18, join.y + 45, join.w - 36, 24, 13, true, '#168A3A');
  var qrSize = Math.min(join.w - 30, join.h * 0.42, 170);
  var qrTop = join.y + 82;
  try {
    var qr = qrBlobForCode_(code);
    slide.insertImage(qr, join.x + (join.w - qrSize) / 2, qrTop, qrSize, qrSize);
  } catch (e) {
    text_(slide, 'QR unavailable', join.x + 18, join.y + 135, join.w - 36, 24, 12, true, '#B42318', SlidesApp.ParagraphAlignment.CENTER);
  }
  var belowQr = qrTop + qrSize + 14;
  text_(slide, 'Scan QR code to join', join.x + 12, belowQr, join.w - 24, 24, 10, true, '#17172F', SlidesApp.ParagraphAlignment.CENTER);
  var codeTop = Math.min(belowQr + 32, join.y + join.h - 104);
  rounded_(slide, join.x + 14, codeTop, join.w - 28, 46, '#EAF7EF', '#CBEAD4');
  text_(slide, '#' + code, join.x + 14, codeTop + 8, join.w - 28, 30, 21, true, '#168A3A', SlidesApp.ParagraphAlignment.CENTER);
  text_(slide, truncate_(joinUrl, Math.max(28, Math.floor(join.w / 3.8))), join.x + 12, codeTop + 56, join.w - 24, 30, 8, false, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);

  rounded_(slide, result.x, result.y, result.w, result.h, '#FFFFFF', '#DDEBE3');
  text_(slide, truncate_(snapshot.question, 96), result.x + 28, result.y + 28, result.w - 56, 74, 28, true, '#17172F');
  text_(slide, 'Scan the QR code or enter the event code to join.', result.x + 28, result.y + 108, result.w - 56, 22, 11, true, '#6B7B8D');
  renderQuestionSlideContent_(slide, interaction, content);
}

function pageLayout_() {
  var presentation = SlidesApp.getActivePresentation();
  var width = presentation.getPageWidth();
  var height = presentation.getPageHeight();
  var margin = 30;
  var top = 58;
  var panelHeight = Math.max(260, height - top - margin);
  var joinWidth = Math.min(Math.max(width * 0.25, 140), width * 0.28);
  var gap = 24;
  var resultX = margin + joinWidth + gap;
  var resultWidth = width - resultX - margin;
  var result = { x: resultX, y: top, w: Math.max(260, resultWidth), h: panelHeight };
  return {
    width: width,
    height: height,
    margin: margin,
    join: { x: margin, y: top, w: joinWidth, h: panelHeight },
    result: result,
    content: { x: result.x + 28, y: result.y + 152, w: result.w - 56, h: Math.max(150, result.h - 180) },
  };
}

function presenterUrl_(event) {
  var code = event.event_code || event.code;
  return SLIDEENGAGE_URL + '/present/' + encodeURIComponent(code);
}

function liveResultUrl_(eventId, interactionId) {
  return SLIDEENGAGE_URL + '/present/live-result/' + encodeURIComponent(eventId) + '/' + encodeURIComponent(interactionId);
}

function renderQuestionSlideContent_(slide, interaction, box) {
  if (interaction.type === 'poll' || interaction.type === 'quiz') {
    var options = (interaction.interaction_options || []).sort(function (a, b) {
      return (a.position || 0) - (b.position || 0);
    });
    var visible = Math.min(options.length, Math.max(2, Math.floor((box.h - 18) / 54)));
    var rowHeight = Math.max(42, Math.min(58, (box.h - 10) / Math.max(1, visible)));
    for (var i = 0; i < visible; i++) {
      var y = box.y + i * rowHeight;
      rounded_(slide, box.x, y, box.w, Math.min(46, rowHeight - 8), '#F4F7F4', '#DDEBE3');
      text_(slide, String.fromCharCode(65 + i) + '. ' + truncate_(options[i].option_text || 'Option', Math.floor((box.w - 36) / 5.2)), box.x + 14, y + 11, box.w - 28, 23, 13, true, options[i].is_correct ? '#168A3A' : '#17172F');
    }
    if (options.length > visible) text_(slide, '+' + (options.length - visible) + ' more options', box.x, box.y + Math.max(0, visible * rowHeight), box.w, 20, 10, false, '#6B7B8D');
  } else {
    text_(slide, 'Answer from your phone', box.x, box.y + Math.max(28, box.h * 0.24), box.w, 40, 24, true, '#17172F', SlidesApp.ParagraphAlignment.CENTER);
    text_(slide, 'Scan the QR code or enter the event code to submit your response.', box.x + 10, box.y + Math.max(74, box.h * 0.24 + 44), box.w - 20, 40, 13, false, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);
  }
}

function renderResults_(slide, interaction, data, box) {
  var results = data.results || [];
  if (interaction.type === 'poll' || interaction.type === 'quiz') return renderPoll_(slide, interaction, results, box);
  if (interaction.type === 'word_cloud') return renderWordCloud_(slide, results, box);
  if (interaction.type === 'qa') return renderQa_(slide, results, box);
  if (interaction.type === 'feedback' && interaction.config && interaction.config.poll_kind === 'rating') return renderRating_(slide, results, box);
  return renderOpenText_(slide, Array.isArray(results) ? results : (results.text_responses || []), box);
}

function renderPoll_(slide, interaction, results, box) {
  var rows = results.length ? results : (interaction.interaction_options || []).map(function (option) {
    return { option_text: option.option_text, percentage: 0, count: 0 };
  });
  if (!rows.length) {
    waiting_(slide, box);
    return;
  }
  var visibleRows = Math.min(rows.length, Math.max(2, Math.floor((box.h - 18) / 46)));
  var rowHeight = Math.max(34, Math.min(46, (box.h - 24) / visibleRows));
  for (var i = 0; i < visibleRows; i++) {
    var row = rows[i];
    var y = box.y + i * rowHeight;
    text_(slide, truncate_(row.option_text || row.label || 'Option', Math.floor((box.w - 95) / 6)), box.x, y, box.w - 95, 20, 12, true, '#17172F');
    bar_(slide, box.x, y + 25, box.w - 115, 9, Number(row.percentage || 0), '#168A3A');
    text_(slide, (row.percentage || 0) + '% · ' + (row.count || 0), box.x + box.w - 100, y + 18, 95, 18, 10, true, '#168A3A');
  }
  if (rows.length > visibleRows) text_(slide, '+' + (rows.length - visibleRows) + ' more options', box.x, box.y + box.h - 16, box.w, 16, 9, false, '#6B7B8D');
}

function renderWordCloud_(slide, results, box) {
  if (!results.length) {
    waiting_(slide, box);
    return;
  }
  var colors = ['#168A3A', '#1A6BB5', '#D46B08', '#8B1A4A', '#7C3AED', '#0F766E'];
  var maxWords = Math.min(results.length, 30);
  var cols = maxWords <= 5 ? 2 : maxWords <= 12 ? 3 : maxWords <= 22 ? 4 : 5;
  var rows = Math.ceil(maxWords / cols);
  var cellW = Math.max(58, box.w / cols);
  var cellH = Math.max(24, box.h / rows);
  var maxCount = 1;
  for (var c = 0; c < maxWords; c++) maxCount = Math.max(maxCount, Number(results[c].count || 1));

  for (var i = 0; i < maxWords; i++) {
    var col = i % cols;
    var row = Math.floor(i / cols);
    var wordLimit = Math.max(7, Math.floor((cellW - 10) / 5.2));
    var word = truncate_(results[i].word || results[i].text || '', wordLimit);
    var weightedSize = 10 + (Number(results[i].count || 1) / maxCount) * (maxWords > 18 ? 10 : 16) + (i < 3 ? 4 : 0);
    var fitSize = (cellW - 10) / Math.max(3, word.length) * 1.55;
    var size = Math.max(8, Math.min(Math.min(maxWords > 18 ? 22 : 32, cellH * 0.58, fitSize), weightedSize));
    var wordX = box.x + col * cellW + 5;
    var wordY = box.y + row * cellH + Math.max(0, (cellH - size - 8) / 2);
    text_(slide, word, wordX, wordY, Math.max(20, cellW - 10), Math.min(cellH, size + 10), size, true, colors[i % colors.length], SlidesApp.ParagraphAlignment.CENTER);
  }
  if (results.length > maxWords) text_(slide, '+' + (results.length - maxWords) + ' more words', box.x, box.y + box.h - 16, box.w, 16, 9, false, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);
}

function renderQa_(slide, questions, box) {
  if (!questions.length) {
    waiting_(slide, box);
    return;
  }
  var visible = Math.min(questions.length, Math.max(2, Math.floor((box.h - 18) / 48)));
  var rowHeight = Math.max(38, Math.min(48, (box.h - 22) / visible));
  for (var i = 0; i < visible; i++) {
    var y = box.y + i * rowHeight;
    rounded_(slide, box.x, y, box.w, Math.min(38, rowHeight - 6), '#F4F7F4', '#DDEBE3');
    text_(slide, truncate_(questions[i].question_text || questions[i].text || '', Math.floor((box.w - 70) / 6)), box.x + 12, y + 10, box.w - 70, 18, 10, true, '#17172F');
    text_(slide, '+' + (questions[i].upvote_count || 0), box.x + box.w - 50, y + 10, 38, 18, 9, true, '#168A3A');
  }
  if (questions.length > visible) text_(slide, '+' + (questions.length - visible) + ' more questions', box.x, box.y + box.h - 16, box.w, 16, 9, false, '#6B7B8D');
}

function renderOpenText_(slide, items, box) {
  if (!items.length) {
    waiting_(slide, box);
    return;
  }
  var visible = Math.min(items.length, Math.max(2, Math.floor((box.h - 18) / 48)));
  var rowHeight = Math.max(38, Math.min(48, (box.h - 22) / visible));
  for (var i = 0; i < visible; i++) {
    var y = box.y + i * rowHeight;
    rounded_(slide, box.x, y, box.w, Math.min(38, rowHeight - 6), '#F4F7F4', '#DDEBE3');
    text_(slide, truncate_(items[i].text || items[i].text_value || JSON.stringify(items[i]), Math.floor((box.w - 24) / 6)), box.x + 12, y + 10, box.w - 24, 18, 10, true, '#17172F');
  }
  if (items.length > visible) text_(slide, '+' + (items.length - visible) + ' more responses', box.x, box.y + box.h - 16, box.w, 16, 9, false, '#6B7B8D');
}

function renderRating_(slide, results, box) {
  var average = Number(results && results.average_rating ? results.average_rating : 0);
  var count = Number(results && results.rating_count ? results.rating_count : 0);
  if (!count) {
    waiting_(slide, box);
    return;
  }

  text_(slide, String(average.toFixed ? average.toFixed(1) : average), box.x, box.y + 12, box.w * 0.42, 70, 48, true, '#168A3A', SlidesApp.ParagraphAlignment.CENTER);
  text_(slide, 'average rating', box.x, box.y + 80, box.w * 0.42, 22, 12, true, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);
  text_(slide, count + ' response' + (count === 1 ? '' : 's'), box.x + box.w * 0.48, box.y + 45, box.w * 0.42, 30, 18, true, '#17172F', SlidesApp.ParagraphAlignment.CENTER);
  bar_(slide, box.x + box.w * 0.08, box.y + 135, box.w * 0.84, 14, Math.min(100, average / 5 * 100), '#168A3A');
}

function waiting_(slide, box) {
  text_(slide, 'Waiting for responses…', box.x, box.y + Math.max(30, box.h * 0.32), box.w, 34, 21, true, '#A3AEA8', SlidesApp.ParagraphAlignment.CENTER);
  text_(slide, 'Results will show here once your audience responds.', box.x + 10, box.y + Math.max(68, box.h * 0.32 + 40), box.w - 20, 28, 12, false, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);
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

function qrBlobForCode_(code) {
  var cache = CacheService.getScriptCache();
  var cacheKey = QR_CACHE_PREFIX + code;
  var cached = cache.get(cacheKey);
  if (cached) {
    return Utilities.newBlob(Utilities.base64Decode(cached), 'image/png', 'slideengage-qr.png');
  }

  var response = UrlFetchApp.fetch(SLIDEENGAGE_URL + '/api/qrcode?code=' + encodeURIComponent(code) + '&format=png', {
    method: 'get',
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() >= 400) throw new Error('QR code unavailable.');

  var blob = response.getBlob().setName('slideengage-qr.png');
  cache.put(cacheKey, Utilities.base64Encode(blob.getBytes()), 21600);
  return blob;
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
  return event && event.status !== 'archived' && !event.archived_at && !event.deleted_at && event.is_archived !== true;
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

function truncate_(value, maxLength) {
  var text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!maxLength || text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 1)).trim() + '…';
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
