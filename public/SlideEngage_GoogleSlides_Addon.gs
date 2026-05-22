/**
 * ============================================
 * SlideEngage — Google Slides Add-on
 * ============================================
 *
 * HOW TO INSTALL:
 * 1. Open your Google Slides presentation
 * 2. Click Extensions → Apps Script
 * 3. Delete any existing code in Code.gs
 * 4. Paste this entire file into Code.gs
 * 5. Click Save (Ctrl+S)
 * 6. Run the onOpen() function once (click Run → onOpen)
 * 7. Authorize the script when prompted
 * 8. Reload your Google Slides — "SlideEngage" menu appears!
 *
 * CONFIGURATION:
 * Change SLIDEENGAGE_URL to your deployed app URL
 */

// ── CONFIG ──────────────────────────────────────────────────
var SLIDEENGAGE_URL = 'https://your-real-vercel-domain.vercel.app'; // Public Slide Engage deployment URL
var EVENT_CODE = ''; // Set your event code here, or leave empty to prompt

// ── MENU ────────────────────────────────────────────────────
function onOpen() {
  SlidesApp.getUi()
    .createMenu('🎯 SlideEngage')
    .addItem('📊 Insert Poll Slide', 'insertPollSlide')
    .addItem('🧠 Insert Quiz Slide', 'insertQuizSlide')
    .addItem('❓ Insert Q&A Slide', 'insertQASlide')
    .addItem('☁️ Insert Word Cloud Slide', 'insertWordCloudSlide')
    .addItem('⭐ Insert Feedback Slide', 'insertFeedbackSlide')
    .addSeparator()
    .addItem('📱 Insert QR Code Slide', 'insertQRCodeSlide')
    .addItem('🎯 Insert Title Slide', 'insertTitleSlide')
    .addSeparator()
    .addItem('⚙️ Set Event Code', 'setEventCode')
    .addItem('ℹ️ About SlideEngage', 'showAbout')
    .addToUi();
}

// ── SET EVENT CODE ──────────────────────────────────────────
function setEventCode() {
  var ui = SlidesApp.getUi();
  var response = ui.prompt(
    '🎯 SlideEngage — Set Event Code',
    'Enter your event code (e.g., KICK26):',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() == ui.Button.OK) {
    var code = response.getResponseText().toUpperCase().replace('#', '').trim();
    if (code) {
      PropertiesService.getDocumentProperties().setProperty('SLIDEENGAGE_EVENT_CODE', code);
      ui.alert('Event code set to: #' + code);
    }
  }
}

function getEventCode() {
  if (!isPublicSlideEngageUrl()) return null;

  var saved = PropertiesService.getDocumentProperties().getProperty('SLIDEENGAGE_EVENT_CODE');
  if (saved) return saved;
  if (EVENT_CODE) return EVENT_CODE;

  // Prompt user
  var ui = SlidesApp.getUi();
  var response = ui.prompt(
    '🎯 SlideEngage',
    'Enter your event code first:',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() == ui.Button.OK) {
    var code = response.getResponseText().toUpperCase().replace('#', '').trim();
    if (code) {
      PropertiesService.getDocumentProperties().setProperty('SLIDEENGAGE_EVENT_CODE', code);
      return code;
    }
  }
  return null;
}

function isPublicSlideEngageUrl() {
  if (!SLIDEENGAGE_URL || SLIDEENGAGE_URL.indexOf('http') !== 0 || SLIDEENGAGE_URL.indexOf('your-vercel-domain') !== -1) {
    SlidesApp.getUi().alert('Set SLIDEENGAGE_URL to your public HTTPS Slide Engage URL before using the add-on.');
    return false;
  }

  if (SLIDEENGAGE_URL.indexOf('localhost') !== -1 || SLIDEENGAGE_URL.indexOf('127.0.0.1') !== -1) {
    SlidesApp.getUi().alert('SLIDEENGAGE_URL cannot use localhost. Deploy Slide Engage to Vercel and use the public HTTPS URL.');
    return false;
  }

  return true;
}

// ── SLIDE HELPERS ───────────────────────────────────────────
function getPresentation() {
  return SlidesApp.getActivePresentation();
}

function createSlide(layout) {
  var presentation = getPresentation();
  var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  return slide;
}

function addBackground(slide, color) {
  slide.getBackground().setSolidFill(color);
}

function addTextBox(slide, text, left, top, width, height, fontSize, bold, color, align) {
  var shape = slide.insertShape(SlidesApp.ShapeType.TEXT_BOX, left, top, width, height);
  var textRange = shape.getText();
  textRange.setText(text);
  var style = textRange.getTextStyle();
  style.setFontSize(fontSize);
  style.setBold(bold || false);
  if (color) style.setForegroundColor(color);
  if (align) {
    var paragraphs = textRange.getParagraphs();
    for (var i = 0; i < paragraphs.length; i++) {
      paragraphs[i].getRange().getParagraphStyle().setParagraphAlignment(align);
    }
  }
  return shape;
}

// ── INSERT POLL SLIDE ───────────────────────────────────────
function insertPollSlide() {
  var code = getEventCode();
  if (!code) return;

  var slide = createSlide();
  addBackground(slide, '#F4F7F4');

  // Header
  addTextBox(slide, '📊 LIVE POLL', 30, 20, 660, 40, 14, true, '#2D8A4E', SlidesApp.ParagraphAlignment.START);

  // Question
  addTextBox(slide, 'Your poll question here?', 30, 70, 660, 60, 28, true, '#1A1A2E', SlidesApp.ParagraphAlignment.START);

  // Options
  var options = ['Option A — Your first choice', 'Option B — Your second choice', 'Option C — Your third choice', 'Option D — Your fourth choice'];
  var colors = ['#2D8A4E', '#1A6BB5', '#D46B08', '#8B1A4A'];

  for (var i = 0; i < options.length; i++) {
    var optShape = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 30, 150 + (i * 65), 500, 50);
    optShape.getBorder().setWeight(2).getLineFill().setSolidFill(colors[i]);
    optShape.getFill().setSolidFill('#FFFFFF');
    var optText = optShape.getText();
    optText.setText(String.fromCharCode(65 + i) + '.  ' + options[i]);
    optText.getTextStyle().setFontSize(16).setForegroundColor('#1A1A2E');
  }

  // Join info
  addTextBox(slide, 'Join at: ' + SLIDEENGAGE_URL + '/join    Code: #' + code, 30, 440, 660, 30, 12, true, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);

  SlidesApp.getUi().alert('Poll slide inserted! Edit the question and options.');
}

// ── INSERT QUIZ SLIDE ───────────────────────────────────────
function insertQuizSlide() {
  var code = getEventCode();
  if (!code) return;

  var slide = createSlide();
  addBackground(slide, '#F4F7F4');

  // Header with timer
  addTextBox(slide, '🧠 QUIZ — 30s', 30, 20, 400, 40, 14, true, '#D46B08', SlidesApp.ParagraphAlignment.START);
  addTextBox(slide, '⏱ 30', 580, 20, 100, 40, 24, true, '#D46B08', SlidesApp.ParagraphAlignment.END);

  // Question
  addTextBox(slide, 'Your quiz question here?', 30, 70, 660, 60, 28, true, '#1A1A2E', SlidesApp.ParagraphAlignment.START);

  // Options (2x2 grid)
  var optLabels = ['A', 'B', 'C', 'D'];
  var optTexts = ['First answer option', 'Second answer option', 'Third answer option', 'Fourth answer option'];
  var optColors = ['#2D8A4E', '#1A6BB5', '#D46B08', '#8B1A4A'];
  var positions = [[30, 150], [370, 150], [30, 280], [370, 280]];

  for (var i = 0; i < 4; i++) {
    var box = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, positions[i][0], positions[i][1], 310, 110);
    box.getBorder().setWeight(2).getLineFill().setSolidFill(optColors[i]);
    box.getFill().setSolidFill('#FFFFFF');
    var t = box.getText();
    t.setText(optLabels[i] + '\n' + optTexts[i]);
    var runs = t.getRuns();
    if (runs.length > 0) {
      runs[0].getTextStyle().setFontSize(20).setBold(true).setForegroundColor(optColors[i]);
    }
    t.getTextStyle().setFontSize(14).setForegroundColor('#1A1A2E');
  }

  // Join info
  addTextBox(slide, 'Join at: ' + SLIDEENGAGE_URL + '/join    Code: #' + code, 30, 440, 660, 30, 12, true, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);

  SlidesApp.getUi().alert('Quiz slide inserted! Edit the question and mark the correct answer.');
}

// ── INSERT Q&A SLIDE ────────────────────────────────────────
function insertQASlide() {
  var code = getEventCode();
  if (!code) return;

  var slide = createSlide();
  addBackground(slide, '#F4F7F4');

  // Header
  addTextBox(slide, '❓ LIVE Q&A', 30, 20, 660, 40, 14, true, '#2D8A4E', SlidesApp.ParagraphAlignment.START);

  // Main text
  addTextBox(slide, 'Ask your questions!', 30, 120, 660, 80, 36, true, '#1A1A2E', SlidesApp.ParagraphAlignment.CENTER);

  // Instruction
  addTextBox(slide, 'Submit your questions and upvote the ones you want answered.\nThe most popular questions rise to the top.', 60, 220, 600, 60, 16, false, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);

  // Join box
  var joinBox = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 150, 320, 420, 80);
  joinBox.getBorder().setWeight(2).setDashStyle(SlidesApp.DashStyle.DASH).getLineFill().setSolidFill('#2D8A4E');
  joinBox.getFill().setSolidFill('#EAF7EF');
  var joinText = joinBox.getText();
  joinText.setText('#' + code + '\n' + SLIDEENGAGE_URL + '/join');
  joinText.getTextStyle().setFontSize(14).setForegroundColor('#2D8A4E');
  joinText.getRuns()[0].getTextStyle().setFontSize(28).setBold(true);

  SlidesApp.getUi().alert('Q&A slide inserted!');
}

// ── INSERT WORD CLOUD SLIDE ─────────────────────────────────
function insertWordCloudSlide() {
  var code = getEventCode();
  if (!code) return;

  var slide = createSlide();
  addBackground(slide, '#F4F7F4');

  // Header
  addTextBox(slide, '☁️ WORD CLOUD', 30, 20, 660, 40, 14, true, '#1A6BB5', SlidesApp.ParagraphAlignment.START);

  // Prompt
  addTextBox(slide, 'In ONE word, describe...', 30, 80, 660, 70, 32, true, '#1A1A2E', SlidesApp.ParagraphAlignment.CENTER);

  // Placeholder word cloud area
  var cloudArea = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 60, 170, 600, 220);
  cloudArea.getBorder().setWeight(1).getLineFill().setSolidFill('#E2EBE6');
  cloudArea.getFill().setSolidFill('#FFFFFF');
  var cloudText = cloudArea.getText();
  cloudText.setText('Words will appear here as students submit them\n\n💡 Tip: Open your SlideEngage dashboard to see the live word cloud');
  cloudText.getTextStyle().setFontSize(14).setForegroundColor('#6B7B8D');
  cloudText.getParagraphs()[0].getRange().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);

  // Join info
  addTextBox(slide, 'Join at: ' + SLIDEENGAGE_URL + '/join    Code: #' + code, 30, 440, 660, 30, 12, true, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);

  SlidesApp.getUi().alert('Word Cloud slide inserted! Edit the prompt question.');
}

// ── INSERT FEEDBACK SLIDE ───────────────────────────────────
function insertFeedbackSlide() {
  var code = getEventCode();
  if (!code) return;

  var slide = createSlide();
  addBackground(slide, '#F4F7F4');

  // Header
  addTextBox(slide, '⭐ FEEDBACK', 30, 20, 660, 40, 14, true, '#D46B08', SlidesApp.ParagraphAlignment.START);

  // Title
  addTextBox(slide, 'Rate today\'s session', 30, 80, 660, 70, 36, true, '#1A1A2E', SlidesApp.ParagraphAlignment.CENTER);

  // Stars
  addTextBox(slide, '★  ★  ★  ★  ★', 30, 180, 660, 60, 48, false, '#FFD700', SlidesApp.ParagraphAlignment.CENTER);

  // Instruction
  addTextBox(slide, 'Your feedback is anonymous.\nRate and leave a comment using your device.', 60, 270, 600, 60, 16, false, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);

  // Join info
  addTextBox(slide, 'Join at: ' + SLIDEENGAGE_URL + '/join    Code: #' + code, 30, 440, 660, 30, 12, true, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);

  SlidesApp.getUi().alert('Feedback slide inserted!');
}

// ── INSERT QR CODE SLIDE ────────────────────────────────────
function insertQRCodeSlide() {
  var code = getEventCode();
  if (!code) return;

  var slide = createSlide();
  addBackground(slide, '#FFFFFF');

  // Title
  addTextBox(slide, '🎯 Join the session!', 30, 30, 660, 60, 32, true, '#1A1A2E', SlidesApp.ParagraphAlignment.CENTER);

  // QR Code (fetched from API)
  try {
    var qrUrl = SLIDEENGAGE_URL + '/api/qrcode?code=' + code + '&format=png';
    var response = UrlFetchApp.fetch(qrUrl);
    var blob = response.getBlob();
    var image = slide.insertImage(blob, 210, 100, 300, 300);
  } catch (e) {
    // If QR API not available, show placeholder
    var placeholder = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 210, 100, 300, 300);
    placeholder.getBorder().setWeight(2).getLineFill().setSolidFill('#E2EBE6');
    placeholder.getFill().setSolidFill('#F4F7F4');
    var pText = placeholder.getText();
    pText.setText('QR Code\n\n(Deploy your app first, then re-insert this slide)');
    pText.getTextStyle().setFontSize(14).setForegroundColor('#6B7B8D');
    pText.getParagraphs()[0].getRange().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  // Event code
  addTextBox(slide, '#' + code, 30, 410, 660, 50, 36, true, '#2D8A4E', SlidesApp.ParagraphAlignment.CENTER);

  // URL
  addTextBox(slide, SLIDEENGAGE_URL + '/join?code=' + code, 30, 455, 660, 30, 14, false, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);

  SlidesApp.getUi().alert('QR Code slide inserted! Students can scan to join.');
}

// ── INSERT TITLE SLIDE ──────────────────────────────────────
function insertTitleSlide() {
  var code = getEventCode();
  if (!code) return;

  var slide = createSlide();
  addBackground(slide, '#1A1A2E');

  // Logo
  addTextBox(slide, '🎯', 30, 30, 60, 60, 36, false, '#FFFFFF', SlidesApp.ParagraphAlignment.START);

  // Title
  addTextBox(slide, 'Interactive Session', 30, 120, 660, 80, 44, true, '#FFFFFF', SlidesApp.ParagraphAlignment.CENTER);

  // Subtitle
  addTextBox(slide, 'Powered by SlideEngage', 30, 210, 660, 40, 18, false, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);

  // Join box
  var joinBox = slide.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, 180, 290, 360, 90);
  joinBox.getBorder().setWeight(2).getLineFill().setSolidFill('#2D8A4E');
  joinBox.getFill().setSolidFill('#2D8A4E');
  var joinText = joinBox.getText();
  joinText.setText('Join at Slide Engage\n#' + code + '\n' + SLIDEENGAGE_URL + '/join?code=' + code);
  joinText.getTextStyle().setFontSize(16).setBold(true).setForegroundColor('#FFFFFF');

  // Instructions
  addTextBox(slide, 'Open your browser or scan the QR code to participate', 30, 420, 660, 30, 12, false, '#6B7B8D', SlidesApp.ParagraphAlignment.CENTER);

  SlidesApp.getUi().alert('Title slide inserted!');
}

// ── ABOUT ───────────────────────────────────────────────────
function showAbout() {
  var ui = SlidesApp.getUi();
  ui.alert(
    '🎯 SlideEngage',
    'Version 1.0\n\n' +
    'SlideEngage adds interactive polls, quizzes, Q&A, word clouds, and feedback directly into your Google Slides.\n\n' +
    'Students join at: ' + SLIDEENGAGE_URL + '/join\n\n' +
    'Current event code: #' + (getEventCode() || 'Not set') + '\n\n' +
    'Need help? Visit ' + SLIDEENGAGE_URL,
    ui.ButtonSet.OK
  );
}
