function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = answer.classList.contains('open');

  // Close all
  document.querySelectorAll('.faq-answer.open').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-question.open').forEach(q => q.classList.remove('open'));

  if (!isOpen) {
    answer.classList.add('open');
    btn.classList.add('open');
  }
}

/* ========== TOAST NOTIFICATION FUNCTION (UPDATED - NO DUPLICATES) ========== */
function showToast(message, type = 'info') {
  // Remove any existing toasts first
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  });

  // Create new toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease forwards';
  }, 10);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ========== DARK / LIGHT MODE TOGGLE ========== */
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';

  if (isDark) {
    html.removeAttribute('data-theme');
    try { localStorage.setItem('gwr-theme', 'light'); } catch (e) { /* ignore */ }
  } else {
    html.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('gwr-theme', 'dark'); } catch (e) { /* ignore */ }
  }
}