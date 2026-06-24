const API_BASE = 'http://localhost:3000';

function initHeader() {
  const header = document.getElementById('site-header');
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const downloadWrapper = document.querySelector('.download-wrapper');
  const downloadTrigger = document.querySelector('.download-trigger');
  const downloadDropdown = document.getElementById('download-dropdown');
  const mobileDownloadTrigger = document.querySelector('.mobile-download-trigger');
  const mobileDownloadPanel = document.getElementById('mobile-download-panel');
  let hoverOpenTimeout;
  let hoverCloseTimeout;

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

      if (!isOpen && mobileDownloadTrigger && mobileDownloadPanel) {
        mobileDownloadPanel.classList.remove('open');
        mobileDownloadTrigger.setAttribute('aria-expanded', 'false');
      }
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');

        if (mobileDownloadTrigger && mobileDownloadPanel) {
          mobileDownloadPanel.classList.remove('open');
          mobileDownloadTrigger.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  if (mobileDownloadTrigger && mobileDownloadPanel) {
    mobileDownloadTrigger.addEventListener('click', () => {
      const isOpen = mobileDownloadPanel.classList.toggle('open');
      mobileDownloadTrigger.setAttribute('aria-expanded', String(isOpen));
    });
  }

  if (downloadWrapper && downloadTrigger && downloadDropdown) {
    const openDropdown = () => {
      downloadDropdown.classList.add('open');
      downloadTrigger.setAttribute('aria-expanded', 'true');
    };

    const closeDropdown = () => {
      downloadDropdown.classList.remove('open');
      downloadTrigger.setAttribute('aria-expanded', 'false');
    };

    downloadTrigger.addEventListener('click', () => {
      const isOpen = downloadDropdown.classList.contains('open');
      if (isOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });

    document.addEventListener('click', (event) => {
      if (!downloadWrapper.contains(event.target)) {
        closeDropdown();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeDropdown();
      }
    });

    if (window.matchMedia('(hover: hover)').matches) {
      downloadWrapper.addEventListener('mouseenter', () => {
        clearTimeout(hoverCloseTimeout);
        hoverOpenTimeout = setTimeout(openDropdown, 150);
      });

      downloadWrapper.addEventListener('mouseleave', () => {
        clearTimeout(hoverOpenTimeout);
        hoverCloseTimeout = setTimeout(closeDropdown, 300);
      });
    }
  }
}

function initHero() {
  const hero = document.getElementById('hero');
  const heroOverlay = hero ? hero.querySelector('.hero-overlay') : null;
  const heroVeil = hero ? hero.querySelector('.hero-top-veil') : null;
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

        if (heroVeil) {
          if (progress > 0.15) {
            heroVeil.classList.add('hidden');
          } else {
            heroVeil.classList.remove('hidden');
          }
        }
      },
      { passive: true }
    );
  }
}

function initSearchBarNavigation() {
  const searchBar = document.getElementById('search-bar');
  if (!searchBar) return;

  const submitButton = searchBar.querySelector('.search-submit');
  const fromInput = document.getElementById('input-depart');
  const toInput = document.getElementById('input-destination');
  const dateInput = document.getElementById('input-date');

  if (!submitButton) return;

  submitButton.addEventListener('click', () => {
    const params = new URLSearchParams();
    if (fromInput && fromInput.value.trim()) {
      params.set('from', fromInput.value.trim());
    }
    if (toInput && toInput.value.trim()) {
      params.set('to', toInput.value.trim());
    }
    if (dateInput && dateInput.value) {
      params.set('date', dateInput.value);
    }

    const query = params.toString();
    window.location.href = query ? `search.html?${query}` : 'search.html';
  });
}

function initDestinations() {
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
}

function initDestinationPrices() {
  const cards = Array.from(document.querySelectorAll('.dest-card'));
  if (!cards.length) return;

  const requests = cards.map((card) => {
    const cityHeading = card.querySelector('h3');
    const city = (card.dataset.city || (cityHeading ? cityHeading.textContent : '')).trim();
    if (!city) return Promise.resolve();

    const cardBody = card.querySelector('.dest-card-body') || card;
    let priceEl = card.querySelector('.dest-price') || card.querySelector('.card-min-price');

    if (!priceEl) {
      priceEl = document.createElement('p');
      priceEl.className = 'card-min-price';
      cardBody.appendChild(priceEl);
    }

    const originalText = priceEl.textContent ? priceEl.textContent.trim() : '';
    priceEl.classList.remove('is-live', 'is-empty');
    priceEl.classList.add('is-loading');
    priceEl.textContent = '';

    const url = `${API_BASE}/api/trips?destination=${encodeURIComponent(city)}&limit=50`;

    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Request failed');
        }
        return response.json();
      })
      .then((data) => {
        priceEl.classList.remove('is-loading');
        const trips = data && Array.isArray(data.trips) ? data.trips : [];
        const prices = trips
          .map((trip) => Number(trip.price))
          .filter((price) => Number.isFinite(price));

        if (prices.length === 0) {
          priceEl.textContent = 'Aucun trajet disponible';
          priceEl.classList.add('is-empty');
          priceEl.classList.remove('is-live');
          return;
        }

        const minPrice = Math.min(...prices);
        priceEl.textContent = `À partir de ${minPrice} DT`;
        priceEl.classList.add('is-live');
        priceEl.classList.remove('is-empty');
      })
      .catch(() => {
        priceEl.classList.remove('is-loading');
        priceEl.textContent = originalText;
      });
  });

  Promise.all(requests).catch(() => {});
}

window.initHeader = initHeader;
window.initHero = initHero;
window.initDestinations = initDestinations;
window.initDestinationPrices = initDestinationPrices;

/* === ANIMATIONS JS === */
function countUp(el) {
  const target = parseInt(el.dataset.target, 10);
  if (Number.isNaN(target)) return;

  const duration = 1200;
  const step = 16;
  const increment = target / (duration / step);
  let current = 0;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      el.textContent = String(target);
      clearInterval(timer);
    } else {
      el.textContent = String(Math.floor(current));
    }
  }, step);
}

function initAnimations() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ratingsTrack = document.querySelector('.ratings-track');

  const destinationCards = document.querySelectorAll('.dest-card');
  destinationCards.forEach((card, i) => {
    card.style.transitionDelay = `${i * 0.07}s`;
    card.classList.add('reveal');
  });

  if (prefersReducedMotion) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
    if (ratingsTrack) {
      ratingsTrack.classList.add('running');
    }
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (entry.target.classList.contains('reveal-group')) {
            entry.target.querySelectorAll('.reveal').forEach((el) => {
              el.classList.add('visible');
            });
          } else {
            entry.target.classList.add('visible');
          }

          if (entry.target.id === 'ratings' && ratingsTrack) {
            setTimeout(() => {
              ratingsTrack.classList.add('running');
            }, 700);
          }

          if (entry.target.id === 'about') {
            entry.target.querySelectorAll('.stat-number').forEach(countUp);
          }
        } else if (entry.boundingClientRect.top > 0) {
          if (entry.target.classList.contains('reveal-group')) {
            entry.target.querySelectorAll('.reveal').forEach((el) => {
              el.classList.remove('visible');
            });
          } else {
            entry.target.classList.remove('visible');
          }

          if (entry.target.id === 'ratings' && ratingsTrack) {
            ratingsTrack.classList.remove('running');
          }

          if (entry.target.id === 'about') {
            entry.target.querySelectorAll('.stat-number').forEach((el) => {
              el.textContent = '0';
            });
          }
        }
      });
    },
    {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px'
    }
  );

  document.querySelectorAll('.reveal, .reveal-group').forEach((el) => {
    if (el.classList.contains('reveal')) {
      const parentGroup = el.closest('.reveal-group');
      if (parentGroup && parentGroup !== el) {
        return;
      }
    }

    revealObserver.observe(el);
  });
}

window.initAnimations = initAnimations;

async function bootstrap() {
  if (typeof window.loadAllComponents === 'function') {
    await window.loadAllComponents();
  }

  initHeader();
  initHero();
  initDestinations();
  initDestinationPrices();
  initSearchBarNavigation();
  initAnimations();
}

bootstrap();
