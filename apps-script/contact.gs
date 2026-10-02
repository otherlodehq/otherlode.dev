/** @OnlyCurrentDoc */

/**
 * Receives early-access requests from the otherlode.dev contact form.
 *
 * The site's Worker validates each submission and POSTs it here as JSON.
 * This script checks the shared token, appends one row to the sheet it is
 * bound to, and emails a notification to hello@otherlode.dev with
 * Reply-To set to the person who asked. It runs as luke@otherlode.dev,
 * so the data stays in Google Workspace.
 *
 * Script properties (Project Settings > Script properties):
 *   CONTACT_TOKEN   the same random value as the Worker's CONTACT_TOKEN secret
 *   RETENTION_DAYS  how many days to keep a row; pruneOldRows deletes older ones
 *
 * Apps Script cannot set an HTTP status, so every reply is 200 and the
 * Worker reads `ok` in the JSON body instead.
 */

var NOTIFY_TO = 'hello@otherlode.dev';
var SHEET_NAME = 'Requests';
var HEADERS = ['Received (UTC)', 'Name', 'Email', 'Company', 'Company size', 'Job title', 'JVM stack', 'Message'];
var FIELDS = ['name', 'email', 'company', 'company_size', 'job_title', 'jvm_stack', 'message'];
var MAX_LENGTH = { name: 200, email: 254, company: 200, company_size: 20, job_title: 200, jvm_stack: 200, message: 5000 };
var REQUIRED = ['name', 'email', 'company', 'company_size'];

/** Handles one submission from the Worker. */
function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply(false, 'bad_json');
  }
  if (!tokenMatches(body.token)) {
    return reply(false, 'bad_token');
  }

  var submission = {};
  for (var i = 0; i < FIELDS.length; i++) {
    var key = FIELDS[i];
    var value = typeof body[key] === 'string' ? body[key].trim() : '';
    if (value.length > MAX_LENGTH[key]) {
      return reply(false, 'too_long');
    }
    submission[key] = value;
  }
  for (var j = 0; j < REQUIRED.length; j++) {
    if (!submission[REQUIRED[j]]) {
      return reply(false, 'missing_field');
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.email)) {
    return reply(false, 'bad_email');
  }

  var received = new Date();
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var row = [received.toISOString()];
    for (var k = 0; k < FIELDS.length; k++) {
      row.push(asText(submission[FIELDS[k]]));
    }
    requestsSheet().appendRow(row);
  } finally {
    lock.releaseLock();
  }

  // The row is the record. A failed notification still counts as a
  // success, so the person is not told to send the request again; the
  // row is there to read, and the execution log says the email failed.
  try {
    MailApp.sendEmail({
      to: NOTIFY_TO,
      replyTo: submission.email,
      subject: 'Early access: ' + oneLine(submission.company),
      body: notification(submission, received),
    });
  } catch (err) {
    console.error('notification email failed');
  }

  return reply(true);
}

/**
 * Deletes rows older than RETENTION_DAYS. Run it from a daily
 * time-driven trigger so the sheet keeps what the privacy policy says.
 * A deleted row stays in the sheet's version history; see the README for
 * the yearly copy that clears it.
 */
function pruneOldRows() {
  var days = Number(PropertiesService.getScriptProperties().getProperty('RETENTION_DAYS'));
  if (!days || days < 1) {
    throw new Error('Set RETENTION_DAYS to a whole number of days.');
  }
  var cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  var sheet = requestsSheet();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var values = sheet.getDataRange().getValues();
    // Delete from the bottom up, so the row numbers above stay valid.
    for (var r = values.length - 1; r >= 1; r--) {
      var received = new Date(values[r][0]).getTime();
      if (received && received < cutoff) {
        sheet.deleteRow(r + 1);
      }
    }
  } finally {
    lock.releaseLock();
  }
}

/** Returns the Requests sheet, creating it with its header row if needed. */
function requestsSheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    // Plain text, so Sheets keeps "2024" or "1/2" as typed rather than
    // turning it into a number or a date.
    sheet.getRange(1, 1, sheet.getMaxRows(), HEADERS.length).setNumberFormat('@');
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Compares the token in constant time for its content. A token of the
 * wrong length is refused at once, which shows only its length; the
 * token is a fixed 64 hex characters, so that tells nobody anything.
 */
function tokenMatches(given) {
  var expected = PropertiesService.getScriptProperties().getProperty('CONTACT_TOKEN');
  if (!expected || typeof given !== 'string' || given.length !== expected.length) {
    return false;
  }
  var diff = 0;
  for (var i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Stops Sheets reading a value as a formula. A cell that starts with
 * =, +, - or @ is a formula to Sheets, and a submitted one could pull
 * in outside data when someone opens the sheet.
 */
function asText(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

/** Removes line breaks, for a value that goes into a subject line. */
function oneLine(value) {
  return value.replace(/[\r\n]+/g, ' ');
}

/** Builds the plain-text notification email. */
function notification(s, received) {
  return [
    'A new early-access request from the otherlode.dev form.',
    '',
    'Name: ' + s.name,
    'Email: ' + s.email,
    'Company: ' + s.company,
    'Company size: ' + s.company_size,
    'Job title: ' + (s.job_title || '-'),
    'JVM stack: ' + (s.jvm_stack || '-'),
    '',
    'Message:',
    s.message || '-',
    '',
    'Received: ' + received.toISOString(),
    'Reply to this email to answer them.',
  ].join('\n');
}

/** Returns the JSON reply the Worker reads. */
function reply(ok, error) {
  var payload = ok ? { ok: true } : { ok: false, error: error };
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
