/* === HEADER JS === */
const header = document.getElementById('site-header');
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');

if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 80);
  });
}

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

/* === HERO JS === */
const hero = document.getElementById('hero');
const heroOverlay = hero ? hero.querySelector('.hero-overlay') : null;
const searchBar = document.getElementById('search-bar');

if (hero && heroOverlay && searchBar) {
  window.addEventListener(
    'scroll',
    () => {
      const scrollY = window.scrollY;
      const heroHeight = hero.offsetHeight;
      const progress = Math.min(scrollY / heroHeight, 1);

      heroOverlay.style.opacity = String(Math.max(1 - progress * 1.4, 0.15));
      hero.style.backgroundPositionY = `calc(50% + ${scrollY * 0.4}px)`;

      if (progress > 0.28) {
        searchBar.classList.add('visible');
      } else {
        searchBar.classList.remove('visible');
      }
    },
    { passive: true }
  );
}

/* === DESTINATIONS JS === */
const track = document.getElementById('dest-track');
const prevBtn = document.getElementById('dest-prev');
const nextBtn = document.getElementById('dest-next');
const SCROLL_AMOUNT = 290;

if (track && prevBtn && nextBtn) {
  prevBtn.addEventListener('click', () => {
    track.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
  });

  nextBtn.addEventListener('click', () => {
    track.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
  });

  function updateArrows() {
    const atStart = track.scrollLeft <= 10;
    prevBtn.style.opacity = atStart ? '0.35' : '1';
    prevBtn.style.pointerEvents = atStart ? 'none' : 'all';

    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 10;
    nextBtn.style.opacity = atEnd ? '0.35' : '1';
    nextBtn.style.pointerEvents = atEnd ? 'none' : 'all';
  }

  track.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();
}

document.querySelectorAll('.dest-card').forEach((card) => {
  card.addEventListener('click', () => {
    const city = card.dataset.city;
    const destInput = document.getElementById('input-destination');
    const searchBarElement = document.getElementById('search-bar');

    if (destInput && city) {
      destInput.value = city;
      if (searchBarElement) {
        searchBarElement.classList.add('visible');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
});
