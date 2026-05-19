/* Dr. A. K. Prasad — Site JS */

/* =================================================================
   GA4 EVENT TRACKING
   Safe wrapper — works whether or not GA4 is loaded.
   Once you replace G-XXXXXXXXXX in all HTML files with your real
   Measurement ID, these events start appearing in GA4 → Reports →
   Realtime and Events.
   ================================================================= */
function trackEvent(eventName, params) {
  if (typeof gtag === 'function') {
    gtag('event', eventName, params || {});
  }
}
/* ================================================================= */

/* =================================================================
   PHONE NUMBER — update ONLY this line to change the number
   everywhere on the site (all call/WhatsApp links update via JS).
   Format: 10-digit Indian mobile number, no spaces or dashes.
   ================================================================= */
const PHONE = '7258968821';
/* ================================================================= */

const PHONE_DISPLAY = `+91 ${PHONE.slice(0, 5)} ${PHONE.slice(5)}`;

/* --- Inject live phone number into all call/WA links ----------- */
(function injectPhone() {
  document.querySelectorAll('a[href^="tel:"]').forEach(a => {
    a.href = `tel:+91${PHONE}`;
    a.addEventListener('click', () =>
      trackEvent('phone_call', { method: 'tel_link', page: location.pathname })
    );
  });
  document.querySelectorAll('a[href*="wa.me/"]').forEach(a => {
    try {
      const u = new URL(a.href);
      const text = u.searchParams.get('text');
      a.href = `https://wa.me/91${PHONE}${text ? '?text=' + encodeURIComponent(text) : ''}`;
    } catch (_) {
      a.href = `https://wa.me/91${PHONE}`;
    }
    a.addEventListener('click', () =>
      trackEvent('whatsapp_click', { page: location.pathname })
    );
  });
  document.querySelectorAll('.phone-num').forEach(el => {
    el.textContent = PHONE_DISPLAY;
  });
})();

/* --- Mobile nav ------------------------------------------- */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

/* --- Mark active nav link --------------------------------- */
(function markActive() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
})();

/* --- Appointment form ------------------------------------- */
const apptForm = document.getElementById('apptForm');
const apptSuccess = document.getElementById('apptSuccess');

/* Google Form entry ID → our form field mapping
   Confirmed from form inspection:
     1748434264 = Full Name       | 1958966629 = Age (inferred by position)
     544134649  = Mobile Number   | 1837994620 = Patient's Problem
     1564166899 = Preferred Date (split into _year / _month / _day)
     327965814  = Select Clinic/Service
*/
const GF_ENTRY = {
  name:      'entry.1748434264',
  age:       'entry.1958966629',
  phone:     'entry.544134649',
  dateYear:  'entry.1564166899_year',
  dateMonth: 'entry.1564166899_month',
  dateDay:   'entry.1564166899_day',
  clinic:    'entry.327965814',
  complaint: 'entry.1837994620',
};

/* Exact option text must match what's in the Google Form dropdown.
   Keep these SHORT and STABLE — change them here AND in the Google Form together.
   Display labels in appointment.html are separate and can be changed freely. */
const CLINIC_GF_VALUE = {
  hall:  'Sinha Pharma Clinic — Walk-in (Bansidih, Dharmshala More)',
  home:  'Residential Clinic — By Appointment (Sector-12, Bokaro)',
  phone: 'Teleconsultation — Call or WhatsApp',
};

if (apptForm) {
  apptForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = apptForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    const name      = apptForm.querySelector('[name="patientName"]').value.trim();
    const age       = apptForm.querySelector('[name="age"]').value.trim();
    const phone     = apptForm.querySelector('[name="phone"]').value.trim();
    const dateVal   = apptForm.querySelector('[name="date"]').value;         /* YYYY-MM-DD */
    const clinic    = apptForm.querySelector('[name="clinic"]').value;
    const complaint = apptForm.querySelector('[name="complaint"]').value.trim();

    const [yr, mo, dy] = dateVal ? dateVal.split('-') : ['', '', ''];

    const clinicLabel = clinic === 'hall' ? 'Clinic, Sinha Pharma (Dharmshala More)'
      : clinic === 'home' ? 'Residential Clinic, Sector-12, Bokaro'
      : 'Teleconsultation (call back requested)';

    /* WhatsApp fallback message */
    const msg = encodeURIComponent(
      `*Appointment Request*\nName: ${name}\nAge: ${age}\nPhone: ${phone}\nDate: ${dateVal}\nClinic: ${clinicLabel}\nComplaint: ${complaint || 'Not specified'}`
    );

    const action = apptForm.getAttribute('data-action');
    if (action && action !== '#') {
      /* Build FormData with Google Form entry IDs */
      const fd = new FormData();
      fd.append(GF_ENTRY.name,      name);
      fd.append(GF_ENTRY.age,       age);
      fd.append(GF_ENTRY.phone,     phone);
      fd.append(GF_ENTRY.dateYear,  yr);
      fd.append(GF_ENTRY.dateMonth, mo ? String(parseInt(mo, 10)) : '');
      fd.append(GF_ENTRY.dateDay,   dy ? String(parseInt(dy, 10)) : '');
      fd.append(GF_ENTRY.clinic,    CLINIC_GF_VALUE[clinic] || clinic);
      fd.append(GF_ENTRY.complaint, complaint);

      fetch(action, { method: 'POST', body: fd, mode: 'no-cors' })
        .finally(showSuccess);
    } else {
      window.open(`https://wa.me/91${PHONE}?text=${msg}`, '_blank');
      showSuccess();
    }

    function showSuccess() {
      apptForm.reset();
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-regular fa-calendar-check"></i> Submit Appointment Request';

      /* Show toast */
      const toast = document.getElementById('apptToast');
      if (toast) {
        clearTimeout(toast._hideTimer);
        toast.classList.add('toast-show');
        toast._hideTimer = setTimeout(dismissToast, 5000);
      }

      /* GA4 — appointment conversion event */
      trackEvent('appointment_submit', {
        clinic_type: clinic,          /* hall / home / phone */
        preferred_date: dateVal,
      });
    }
  });
}

/* --- Toast dismiss ---------------------------------------- */
function dismissToast() {
  const toast = document.getElementById('apptToast');
  if (!toast) return;
  clearTimeout(toast._hideTimer);
  toast.classList.remove('toast-show');
}
(function() {
  const closeBtn = document.getElementById('apptToastClose');
  if (closeBtn) closeBtn.addEventListener('click', dismissToast);
})();

/* --- Smooth scroll for anchor links ----------------------- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
