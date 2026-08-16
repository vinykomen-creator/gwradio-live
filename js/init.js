document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  initHamburger();
  initScrollEffects();
  initFadeInObserver();
  initCountdown();
  initListenLive();
  initPrayersPage();

  function initGiveawayForm() {
    const form = document.getElementById('giveawayForm');
    if (!form) return;
    form.addEventListener('submit', handleGiveawaySubmit);
  }
  initGiveawayForm();

  await fetchEvents(true);
  await renderEventsGrid();
  await renderHomeEvents();
  await renderFeaturedEvent();
  renderGiveawayPromo();

  checkInitialPage();

  const contactForm = document.getElementById('contactForm');
  if (contactForm) contactForm.addEventListener('submit', (e) => handleFormSubmit(e, 'contact'));

  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) newsletterForm.addEventListener('submit', handleNewsletterSubmit);

  const heroNewsletterForm = document.getElementById('heroNewsletterForm');
  if (heroNewsletterForm) heroNewsletterForm.addEventListener('submit', handleNewsletterSubmit);
});