'use strict';

const API_BASE = 'https://gwradio-live.onrender.com/api';

async function apiPost(endpoint, payload) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body:    JSON.stringify(payload),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}


function showFieldErrors(form, errors) {

  form.querySelectorAll('.field-error').forEach(el => el.remove());
  form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

  if (!errors || !errors.length) return;

  errors.forEach(({ field, message }) => {

    const input = form.querySelector(`[name="${field}"], #${field}, [data-field="${field}"]`);
    if (input) {
      input.classList.add('input-error');
      const errEl = document.createElement('span');
      errEl.className = 'field-error';
      errEl.textContent = message;
      input.parentElement.appendChild(errEl);
    }
  });
}


(function injectErrorStyles() {
  if (document.getElementById('api-error-styles')) return;
  const style = document.createElement('style');
  style.id = 'api-error-styles';
  style.textContent = `
    .input-error { border-color: #f2503a !important; }
    .field-error {
      display: block;
      color: #f2503a;
      font-size: 0.78rem;
      margin-top: 4px;
      font-family: 'Roboto', sans-serif;
    }
  `;
  document.head.appendChild(style);
})();


function setLoading(btn, isLoading) {
  if (isLoading) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = 'Sending…';
    btn.disabled = true;
    btn.style.opacity = '0.75';
  } else {
    btn.textContent = btn.dataset.originalText || 'Submit';
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}

window.handleFormSubmit = async function (e, type) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  showFieldErrors(form, []);

  if (type === 'signup') {
    setLoading(submitBtn, true);

    const payload = {
      first_name:   form.querySelector('input[placeholder="Jane"]')?.value?.trim() || '',
      last_name:    form.querySelector('input[placeholder="Doe"]')?.value?.trim() || '',
      email:        form.querySelector('input[type="email"]')?.value?.trim() || '',
      phone:        form.querySelector('input[type="tel"]')?.value?.trim() || '',
      interest:     form.querySelector('select')?.value || 'General Membership',
      about:        form.querySelector('textarea')?.value?.trim() || '',
      agreed_terms: form.querySelector('#terms')?.checked ? '1' : '0',
    };

    const { ok, data } = await apiPost('/signup', payload).catch(() => ({
      ok: false,
      data: { message: 'Could not reach the server. Is it running?' },
    }));

    setLoading(submitBtn, false);

    if (ok) {
      showToast(`✅ ${data.message}`, 'success');
      form.reset();
    } else {
      showFieldErrors(form, data.errors);
      showToast(`❌ ${data.message}`, 'error');
    }

  } else if (type === 'contact') {
    setLoading(submitBtn, true);

    const inputs = form.querySelectorAll('input[type="text"]');
    const payload = {
      first_name: inputs[0]?.value?.trim() || '',
      last_name:  inputs[1]?.value?.trim() || '',
      email:      form.querySelector('input[type="email"]')?.value?.trim() || '',
      subject:    form.querySelector('select')?.value || 'General Inquiry',
      message:    form.querySelector('textarea')?.value?.trim() || '',
    };

    const { ok, data } = await apiPost('/contact', payload).catch(() => ({
      ok: false,
      data: { message: 'Could not reach the server. Is it running?' },
    }));

    setLoading(submitBtn, false);

    if (ok) {
      showToast(`✅ ${data.message}`, 'success');
      form.reset();
    } else {
      showFieldErrors(form, data.errors);
      showToast(`❌ ${data.message}`, 'error');
    }
  }
};


window.handleNewsletterSubmit = async function (e) {
  e.preventDefault();
  const form      = e.target;
  const emailInput = form.querySelector('input[type="email"]');
  const submitBtn  = form.querySelector('button[type="submit"]');

  if (!emailInput?.value) return;

  setLoading(submitBtn, true);

  const source = form.closest('.section-newsletter') ? 'home'
               : form.closest('.footer-newsletter')  ? 'footer'
               : 'signup_page';

  const { ok, data } = await apiPost('/subscribe', {
    email:  emailInput.value.trim(),
    source,
  }).catch(() => ({
    ok: false,
    data: { message: 'Could not reach the server. Is it running?' },
  }));

  setLoading(submitBtn, false);

  if (ok) {
    showToast(`✅ ${data.message}`, 'success');
    emailInput.value = '';
  } else {
    showToast(`❌ ${data.message}`, 'error');
  }
};
