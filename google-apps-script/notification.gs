/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  Dr. A. K. Prasad — Appointment Notification Script             ║
 * ║  Google Apps Script · runs free on Google's servers             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * WHAT THIS DOES:
 *   Every time a patient submits the appointment form, this script:
 *   1. Sends Dr. Prasad an instant email with all patient details
 *   2. Includes a one-tap WhatsApp reply link to message the patient back
 *   3. Includes a Hindi/WhatsApp-ready copy-paste block for quick forwarding
 *   4. Logs every submission to Apps Script's built-in logger
 *
 * ──────────────────────────────────────────────────────────────────
 * ONE-TIME SETUP (5 minutes, completely free):
 * ──────────────────────────────────────────────────────────────────
 *
 * STEP 1 — Open the linked Google Sheet
 *   • Go to: https://docs.google.com/spreadsheets/
 *   • Open the Sheet that is linked to the appointment Google Form
 *     (Form responses are written to this sheet automatically)
 *
 * STEP 2 — Open Apps Script editor
 *   • In the Sheet: Extensions → Apps Script
 *   • This opens the script editor in a new tab
 *
 * STEP 3 — Paste this script
 *   • Delete any existing code in Code.gs
 *   • Paste the entire contents of THIS file
 *
 * STEP 4 — Update the config below
 *   • Set DOCTOR_EMAIL to Dr. Prasad's Gmail address
 *   • Save (Ctrl+S / Cmd+S)
 *
 * STEP 5 — Install the trigger
 *   • In the Apps Script editor, click ⏰ Triggers (left sidebar, clock icon)
 *   • Click "+ Add Trigger" (bottom right)
 *   • Choose function:       onFormSubmit
 *   • Choose event source:   From spreadsheet
 *   • Choose event type:     On form submit
 *   • Click Save
 *   • Authorize when prompted (use the Google account that owns the sheet)
 *
 * STEP 6 — Test it
 *   • Run testNotification() from the editor (select it in dropdown → Run)
 *   • You should receive a test email within 30 seconds
 *   • Then do a real test: submit the appointment form on the website
 *     and confirm the email arrives
 *
 * ──────────────────────────────────────────────────────────────────
 * TROUBLESHOOTING:
 *   • No email received → Check spam folder; re-authorize permissions
 *   • "getVal returns null" → Open Executions log (left sidebar) and
 *     check the exact column header names in your Google Sheet, then
 *     update FIELD_NAMES below to match exactly
 *   • Script error → Click Executions (left sidebar) to see full trace
 * ──────────────────────────────────────────────────────────────────
 */

// ══════════════════════════════════════════════════════════════════
//  CONFIGURATION — update these before deploying
// ══════════════════════════════════════════════════════════════════

var CONFIG = {
  // ▶ Dr. Prasad's email address — change this
  DOCTOR_EMAIL:  'drakprasad121@gmail.com',

  // ▶ Dr. Prasad's WhatsApp number (10 digits, no +91)
  DOCTOR_PHONE:  '7258968821',

  // ▶ Clinic display name in email subject
  CLINIC_LABEL:  'Dr. A. K. Prasad Clinic',

  // ▶ Auto-reply WhatsApp message sent to patient
  //   {name} and {date} are replaced automatically
  PATIENT_REPLY_MSG:
    'Hello {name}, your appointment request with Dr. A. K. Prasad has been received. ' + 
    'Confirmation for {date} will be sent shortly. ' + 
    'For any queries, please call: +91 7258968821. Thank you 🙏 ' +
    'नमस्ते {name}, आपका अपॉइंटमेंट रिक्वेस्ट डॉ. ए. के. प्रसाद के पास मिल गया है।' + 
    '{date} के लिए पुष्टि जल्द ही भेजा जाएगा।' + 
    'किसी भी जानकारी के लिए कॉल करें: +91 7258968821। धन्यवाद 🙏',
};

// ══════════════════════════════════════════════════════════════════
//  FORM FIELD NAMES
//  These must match exactly the question titles in your Google Form.
//  Check your Google Sheet column headers — they are the same.
// ══════════════════════════════════════════════════════════════════

var FIELD_NAMES = {
  name:      'Full Name (पूरा नाम)',
  age:       'Age (उम्र / आयु)',
  phone:     'Mobile Number (मोबाइल नंबर)',
  date:      'Preferred Date (पसंदीदा तारीख)',
  clinic:    'Select Clinic/Service (क्लीनिक/सेवा चुनें)',
  complaint: "Patient's Problem / Complaint (मरीज की समस्या / शिकायत)",
};

// ══════════════════════════════════════════════════════════════════
//  MAIN TRIGGER FUNCTION
//  Installed as: Spreadsheet → On form submit
// ══════════════════════════════════════════════════════════════════

function onFormSubmit(e) {
  try {
    var r = e.namedValues; // { "Question Title": ["value"], ... }

    // Extract patient details
    var name      = getVal(r, FIELD_NAMES.name)      || 'Not provided';
    var age       = getVal(r, FIELD_NAMES.age)        || 'Not provided';
    var phone     = getVal(r, FIELD_NAMES.phone)      || 'Not provided';
    var date      = getVal(r, FIELD_NAMES.date)       || 'Not provided';
    var clinic    = getVal(r, FIELD_NAMES.clinic)     || 'Not provided';
    var complaint = getVal(r, FIELD_NAMES.complaint)  || 'Not specified';

    // Clean phone number (digits only) for WhatsApp link
    var phoneClean = phone.replace(/\D/g, '');
    if (phoneClean.length === 10) phoneClean = '91' + phoneClean;

    // Short clinic label for subject line
    var clinicShort = clinic.indexOf('Sinha Pharma') !== -1
      ? 'Sinha Pharma Clinic (Dharmshala More)'
      : clinic.indexOf('Residential') !== -1 || clinic.indexOf('Sector-12') !== -1
        ? 'Residential Clinic, Sector-12 Bokaro'
        : clinic.indexOf('Teleconsult') !== -1 || clinic.indexOf('phone') !== -1
          ? 'Teleconsultation (Call Back)'
          : clinic.substring(0, 50);

    var timestamp = Utilities.formatDate(
      new Date(), 'Asia/Kolkata', 'dd MMM yyyy, hh:mm a'
    );

    // ── WhatsApp reply link (one tap for Dr. Prasad) ──────────────
    var replyMsg = CONFIG.PATIENT_REPLY_MSG
      .replace('{name}', name)
      .replace('{date}', date);
    var waReplyLink = 'https://wa.me/' + phoneClean +
      '?text=' + encodeURIComponent(replyMsg);

    // ── WhatsApp-ready Hindi copy-paste summary ───────────────────
    var waBlock = [
      '━━━━━━━━━━━━━━━━━━━━━━━',
      '📋 *WhatsApp पर कॉपी-पेस्ट करें:*',
      '',
      '*नया अपॉइंटमेंट* 🏥',
      '👤 नाम: ' + name,
      '🔢 उम्र: ' + age + ' वर्ष',
      '📱 फोन: ' + phone,
      '📅 तारीख: ' + date,
      '🏥 क्लीनिक: ' + clinicShort,
      '🩺 समस्या: ' + complaint,
      '━━━━━━━━━━━━━━━━━━━━━━━',
    ].join('\n');

    // ── Email subject ─────────────────────────────────────────────
    var subject = '🏥 New Appointment — ' + name + ' · ' + date + ' · ' + clinicShort;

    // ── Email body ────────────────────────────────────────────────
    var body = [
      '🏥 NEW APPOINTMENT REQUEST',
      '═══════════════════════════════════════',
      '',
      '  👤  Name       : ' + name,
      '  🔢  Age        : ' + age + ' years',
      '  📱  Phone      : ' + phone,
      '  📅  Date       : ' + date,
      '  🏥  Clinic     : ' + clinicShort,
      '  🩺  Complaint  : ' + complaint,
      '',
      '  ⏰  Submitted  : ' + timestamp + ' IST',
      '',
      '═══════════════════════════════════════',
      '',
      '📲 REPLY ON WHATSAPP (one click):',
      waReplyLink,
      '',
      '═══════════════════════════════════════',
      '',
      waBlock,
      '',
      '═══════════════════════════════════════',
      '',
      '📊 View all appointments in Google Sheets:',
      'https://docs.google.com/spreadsheets/d/' +
        SpreadsheetApp.getActiveSpreadsheet().getId(),
      '',
      '───────────────────────────────────────',
      CONFIG.CLINIC_LABEL + ' · Chas, Bokaro',
      'Sinha Pharma, Dharmshala More · +91 ' + CONFIG.DOCTOR_PHONE,
      '───────────────────────────────────────',
    ].join('\n');

    // ── Send email to Dr. Prasad ──────────────────────────────────
    GmailApp.sendEmail(CONFIG.DOCTOR_EMAIL, subject, body, {
      name: CONFIG.CLINIC_LABEL + ' — Appointment Alert',
    });

    Logger.log('✅ Notification sent for: ' + name + ' (' + date + ')');

  } catch (err) {
    Logger.log('❌ Error in onFormSubmit: ' + err.toString());
    // Safety fallback — always alert on error so no submission is missed
    try {
      GmailApp.sendEmail(
        CONFIG.DOCTOR_EMAIL,
        '⚠️ Appointment Form Error — check manually',
        'An error occurred while processing a new form submission.\n\n' +
        'Error: ' + err.toString() + '\n\n' +
        'Please check the Google Sheet directly:\n' +
        'https://docs.google.com/spreadsheets/d/' +
          SpreadsheetApp.getActiveSpreadsheet().getId()
      );
    } catch (mailErr) {
      Logger.log('❌ Also failed to send error email: ' + mailErr.toString());
    }
  }
}

// ══════════════════════════════════════════════════════════════════
//  HELPER — safely pull a value from namedValues
// ══════════════════════════════════════════════════════════════════

function getVal(namedValues, key) {
  if (!namedValues) return null;
  var val = namedValues[key];
  if (val && val.length > 0 && val[0] !== '') return val[0];
  // Fallback: try case-insensitive partial match
  for (var k in namedValues) {
    if (k.toLowerCase().indexOf(key.toLowerCase().split('(')[0].trim()) !== -1) {
      var v = namedValues[k];
      if (v && v.length > 0 && v[0] !== '') return v[0];
    }
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════
//  TEST FUNCTION — run manually from the editor to send a test email
//  Select "testNotification" in the function dropdown and click ▶ Run
// ══════════════════════════════════════════════════════════════════

function testNotification() {
  var fakeEvent = {
    namedValues: {
      'Full Name (पूरा नाम)':                                        ['Ramesh Kumar (TEST)'],
      'Age (उम्र / आयु)':                                             ['45'],
      'Mobile Number (मोबाइल नंबर)':                                 ['9876543210'],
      'Preferred Date (पसंदीदा तारीख)':                              ['2025-08-15'],
      'Select Clinic/Service (क्लीनिक/सेवा चुनें)':                  ['Sinha Pharma Clinic — Walk-in (Bansidih, Dharmshala More)'],
      "Patient's Problem / Complaint (मरीज की समस्या / शिकायत)":    ['बुखार — 3 दिन से (TEST)'],
    },
  };
  onFormSubmit(fakeEvent);
  Logger.log('Test sent to: ' + CONFIG.DOCTOR_EMAIL + ' — check inbox/spam');
}

// ══════════════════════════════════════════════════════════════════
//  DAILY SUMMARY (OPTIONAL — leave disabled unless needed)
//  Sends a morning digest of yesterday's appointments.
//  To enable: add a Time-driven trigger → Day timer → 8am–9am IST
// ══════════════════════════════════════════════════════════════════

function dailySummary() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var data  = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    Logger.log('No appointments to summarise.');
    return;
  }

  var headers = data[0];
  var today = new Date();
  var yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Filter rows from yesterday
  var rows = data.slice(1).filter(function(row) {
    var ts = row[0]; // Timestamp is always col 0
    return ts instanceof Date && ts.toDateString() === yesterday.toDateString();
  });

  if (rows.length === 0) {
    Logger.log('No submissions yesterday.');
    return;
  }

  var lines = ['📊 DAILY APPOINTMENT SUMMARY — ' +
    Utilities.formatDate(yesterday, 'Asia/Kolkata', 'dd MMM yyyy'), ''];
  rows.forEach(function(row, i) {
    lines.push((i + 1) + '. ' + row[1] + ' | ' + row[3] + ' | ' + row[4]);
  });
  lines.push('', 'Total: ' + rows.length + ' appointment(s)');
  lines.push('View sheet: https://docs.google.com/spreadsheets/d/' + ss.getId());

  GmailApp.sendEmail(
    CONFIG.DOCTOR_EMAIL,
    '📊 Daily Appointments — ' + Utilities.formatDate(yesterday, 'Asia/Kolkata', 'dd MMM'),
    lines.join('\n'),
    { name: CONFIG.CLINIC_LABEL }
  );
  Logger.log('Daily summary sent: ' + rows.length + ' appointment(s)');
}
