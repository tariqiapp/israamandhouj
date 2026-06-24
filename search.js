const state = {
  origin: '',
  destination: '',
  date: '',
  sort: 'price_asc',
  minPrice: 0,
  maxPrice: 200,
  seats: 1,
  page: 1,
  limit: 6
};

const API_BASE = 'http://localhost:3000';

const dom = {
  stripForm: document.getElementById('search-strip-form'),
  stripFrom: document.getElementById('strip-from'),
  stripTo: document.getElementById('strip-to'),
  stripDate: document.getElementById('strip-date'),
  filterDate: document.getElementById('filter-date'),
  priceMin: document.getElementById('price-min'),
  priceMax: document.getElementById('price-max'),
  seatsValue: document.getElementById('seats-value'),
  seatsLabel: document.getElementById('seats-label'),
  sortChips: Array.from(document.querySelectorAll('.sort-chip')),
  filtersCard: document.getElementById('filters-card'),
  filtersToggle: document.querySelector('.filters-toggle'),
  resultsList: document.getElementById('results-list'),
  resultsCount: document.getElementById('results-count'),
  resultsEmpty: document.getElementById('results-empty'),
  pagination: document.getElementById('results-pagination')
};

const mapCache = new Map();
const geoCache = new Map();
let lastTrips = [];

const priceMin = document.getElementById('price-min');
const priceMax = document.getElementById('price-max');
const trackFill = document.getElementById('track-fill');
const tickMin = document.getElementById('tick-min');
const tickMax = document.getElementById('tick-max');
const priceLabel = document.getElementById('price-range-label');
const sliderContainer = document.getElementById('slider-container');

function debounce(callback, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

function getToken() {
  return localStorage.getItem('tariqi_token');
}

function parseParams() {
  const params = new URLSearchParams(window.location.search);
  state.origin = params.get('from') || '';
  state.destination = params.get('to') || '';
  state.date = params.get('date') || '';
  state.sort = params.get('sort') || 'price_asc';
  state.minPrice = Number(params.get('minPrice')) || 0;
  state.maxPrice = Number(params.get('maxPrice')) || 200;
  state.seats = Math.min(Math.max(Number(params.get('seats')) || 1, 1), 8);
  state.page = Math.max(Number(params.get('page')) || 1, 1);
}

function setupSearchHeader() {
  const host = document.querySelector('[data-component="components/header.html"]');
  const applyHeader = () => {
    const header = document.getElementById('site-header');
    if (!header) return false;
    const brand = header.querySelector('.nav-brand');
    if (brand) brand.setAttribute('href', 'index.html');
    return true;
  };

  if (applyHeader()) return;
  if (!host) return;

  const observer = new MutationObserver(() => {
    if (applyHeader()) observer.disconnect();
  });

  observer.observe(host, { childList: true, subtree: true });
}

function syncInputs() {
  if (dom.stripFrom) dom.stripFrom.value = state.origin;
  if (dom.stripTo) dom.stripTo.value = state.destination;
  if (dom.stripDate) dom.stripDate.value = state.date;
  if (dom.filterDate) dom.filterDate.value = state.date;
  if (dom.priceMin) dom.priceMin.value = state.minPrice;
  if (dom.priceMax) dom.priceMax.value = state.maxPrice;
  if (dom.seatsValue) dom.seatsValue.textContent = String(state.seats);
  if (dom.seatsLabel) dom.seatsLabel.textContent = `${state.seats}+ place disponible`;
  setActiveSort(state.sort);
  updatePriceSlider();
}

function updateUrl() {
  const params = new URLSearchParams();
  if (state.origin) params.set('from', state.origin);
  if (state.destination) params.set('to', state.destination);
  if (state.date) params.set('date', state.date);
  if (state.sort) params.set('sort', state.sort);
  if (state.minPrice) params.set('minPrice', String(state.minPrice));
  if (state.maxPrice) params.set('maxPrice', String(state.maxPrice));
  if (state.seats) params.set('seats', String(state.seats));
  if (state.page) params.set('page', String(state.page));

  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', nextUrl);
}

function setActiveSort(sort) {
  dom.sortChips.forEach((chip) => {
    chip.classList.toggle('is-active', chip.dataset.sort === sort);
  });
}

function thumbPercent(input) {
  const min = parseFloat(input.min);
  const max = parseFloat(input.max);
  const val = parseFloat(input.value);
  const rawPct = (val - min) / (max - min);
  const thumbHalf = 9;
  const trackWidth = sliderContainer.offsetWidth;
  const adjustedPct = (rawPct * (trackWidth - 2 * thumbHalf) + thumbHalf) / trackWidth;
  return adjustedPct * 100;
}

function updatePriceSlider() {
  if (parseFloat(priceMin.value) > parseFloat(priceMax.value)) {
    priceMin.value = priceMax.value;
  }
  if (parseFloat(priceMax.value) < parseFloat(priceMin.value)) {
    priceMax.value = priceMin.value;
  }

  const pMin = thumbPercent(priceMin);
  const pMax = thumbPercent(priceMax);

  trackFill.style.left = `${pMin}%`;
  trackFill.style.width = `${pMax - pMin}%`;

  tickMin.style.left = `${pMin}%`;
  tickMax.style.left = `${pMax}%`;

  priceLabel.textContent = `${priceMin.value} DT — ${priceMax.value} DT`;
}

function updatePriceLimits(trips) {
  if (!dom.priceMax || !dom.priceMin) return;
  const prices = trips.map((trip) => Number(trip.price || 0)).filter((value) => !Number.isNaN(value));
  const max = prices.length ? Math.max(...prices, 50) : 200;
  const cap = Math.min(Math.max(max, 50), 500);

  dom.priceMin.max = String(cap);
  dom.priceMax.max = String(cap);

  if (state.maxPrice > cap) state.maxPrice = cap;
  dom.priceMin.value = String(state.minPrice);
  dom.priceMax.value = String(state.maxPrice);
  updatePriceSlider();
}

function showSkeleton() {
  if (!dom.resultsList) return;
  dom.resultsList.innerHTML = '';
  for (let i = 0; i < 4; i += 1) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
    dom.resultsList.appendChild(skeleton);
  }
}

function showEmpty(show) {
  if (!dom.resultsEmpty) return;
  dom.resultsEmpty.classList.toggle('visible', show);
}

function formatDeparture(trip) {
  const raw = trip.departure_time || trip.departure || '';
  if (raw) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    }
  }

  const datePart = trip.date || '';
  const timePart = trip.time || '';
  if (datePart) {
    return `${datePart} ${timePart}`.trim();
  }

  return 'Horaire à confirmer';
}

function sortTrips(trips) {
  const sorted = [...trips];
  if (state.sort === 'price_asc') {
    sorted.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (state.sort === 'price_desc') {
    sorted.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (state.sort === 'date_asc') {
    sorted.sort((a, b) => {
      const aDate = new Date(a.departure_time || a.departure || a.date || 0).getTime();
      const bDate = new Date(b.departure_time || b.departure || b.date || 0).getTime();
      return aDate - bDate;
    });
  }
  return sorted;
}

function filterTrips(trips) {
  return trips.filter((trip) => {
    const price = Number(trip.price || 0);
    const seats = Number(trip.available_seats || trip.seats || 0);
    if (price < state.minPrice || price > state.maxPrice) return false;
    if (seats < state.seats) return false;
    return true;
  });
}

function renderPagination(pagination) {
  if (!dom.pagination) return;
  dom.pagination.innerHTML = '';

  const totalPages = pagination.totalPages || 1;
  const page = pagination.page || 1;

  const prev = document.createElement('button');
  prev.className = 'page-btn';
  prev.textContent = '←';
  prev.disabled = page === 1;
  prev.addEventListener('click', () => {
    state.page = page - 1;
    fetchTrips();
    dom.resultsList.scrollIntoView({ behavior: 'smooth' });
  });
  dom.pagination.appendChild(prev);

  for (let i = 1; i <= totalPages; i += 1) {
    const btn = document.createElement('button');
    btn.className = 'page-btn';
    btn.textContent = String(i);
    btn.classList.toggle('active', i === page);
    btn.addEventListener('click', () => {
      state.page = i;
      fetchTrips();
      dom.resultsList.scrollIntoView({ behavior: 'smooth' });
    });
    dom.pagination.appendChild(btn);
  }

  const next = document.createElement('button');
  next.className = 'page-btn';
  next.textContent = '→';
  next.disabled = page === totalPages;
  next.addEventListener('click', () => {
    state.page = page + 1;
    fetchTrips();
    dom.resultsList.scrollIntoView({ behavior: 'smooth' });
  });
  dom.pagination.appendChild(next);
}

function renderResults(trips, pagination) {
  if (!dom.resultsList) return;
  dom.resultsList.innerHTML = '';

  const filtered = filterTrips(sortTrips(trips));
  lastTrips = filtered;

  if (dom.resultsCount) {
    dom.resultsCount.textContent = `${filtered.length} trajets trouvés`;
  }

  if (!filtered.length) {
    showEmpty(true);
    if (dom.pagination) dom.pagination.innerHTML = '';
    return;
  }

  showEmpty(false);
  filtered.forEach((trip) => {
    const card = document.createElement('div');
    card.className = 'trip-card';
    card.dataset.tripId = String(trip.id);

    const origin = trip.origin || trip.departure || '';
    const destination = trip.destination || '';
    const seats = trip.available_seats || trip.seats || 0;
    const driverName = (trip.driver && trip.driver.name) || trip.driver_name || 'Conducteur';
    const departureLabel = formatDeparture(trip);

    card.innerHTML = `
      <div class="trip-summary">
        <div class="trip-route">
          <strong>${origin}</strong>
          <span class="route-arrow">→</span>
          <strong>${destination}</strong>
          <div class="trip-meta">${departureLabel}</div>
        </div>
        <div class="trip-seats">${seats} places</div>
        <div class="trip-price">
          <strong>${trip.price} DT</strong>
          <span>/ pers.</span>
          <button class="trip-toggle" type="button">Voir le trajet</button>
        </div>
      </div>
      <div class="trip-expand">
        <div class="trip-expand-inner">
          <div class="trip-expand-left">
            <div class="driver-card">
              <div class="driver-avatar">${driverName.trim().charAt(0).toUpperCase()}</div>
              <div>
                <div class="driver-name">${driverName}</div>
                ${trip.driver_approved ? '<div class="driver-badge">Conducteur vérifié</div>' : ''}
              </div>
            </div>
            <div class="trip-details">
              <span>🕐 Départ: ${departureLabel}</span>
              <span>💺 Places disponibles: ${seats}</span>
              <span>💰 Prix: ${trip.price} DT / personne</span>
            </div>
            <button class="book-btn" type="button">Réserver ce trajet</button>
          </div>
          <div class="trip-expand-right">
            <div class="trip-map" id="map-${trip.id}"></div>
          </div>
        </div>
      </div>
    `;

    const toggleButtons = card.querySelectorAll('.trip-toggle');
    const bookButton = card.querySelector('.book-btn');

    toggleButtons.forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleCard(card, trip);
      });
    });

    card.addEventListener('click', () => {
      toggleCard(card, trip);
    });

    bookButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      const token = getToken();
      if (!token) {
        const trigger = document.querySelector('[data-auth-trigger]');
        if (trigger) trigger.click();
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ trip_id: trip.id })
        });

        if (response.status === 201) {
          showToast('Réservation confirmée !', 'success');
        } else if (response.status === 400) {
          showToast("Plus de places disponibles.", 'error');
        } else {
          showToast('Une erreur est survenue.', 'error');
        }
      } catch (error) {
        showToast('Une erreur est survenue.', 'error');
      }
    });

    dom.resultsList.appendChild(card);
  });

  renderPagination(pagination);
}

function toggleCard(card, trip) {
  const expanded = card.classList.contains('expanded');
  document.querySelectorAll('.trip-card.expanded').forEach((openCard) => {
    openCard.classList.remove('expanded');
  });

  if (!expanded) {
    card.classList.add('expanded');
    const mapEl = card.querySelector(`#map-${trip.id}`);
    if (mapEl) {
      setTimeout(() => initMap(trip, mapEl), 50);
    }
  }
}

function showToast(message, type) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.remove('success', 'error');
  toast.classList.add('show', type);

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

async function geocodeCity(city) {
  if (!city) return null;
  const key = city.toLowerCase();
  if (geoCache.has(key)) return geoCache.get(key);

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      `${city}, Tunisia`
    )}&format=json&limit=1&countrycodes=tn`
  );
  const data = await response.json();
  if (!data || !data.length) return null;
  const coords = [Number(data[0].lat), Number(data[0].lon)];
  geoCache.set(key, coords);
  return coords;
}

async function initMap(trip, container) {
  if (mapCache.has(trip.id)) return;
  if (!window.L) return;

  const map = window.L.map(container, {
    scrollWheelZoom: false,
    zoomControl: false
  });

  window.L.control.zoom({ position: 'bottomright' }).addTo(map);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const origin = trip.origin || trip.departure || '';
  const destination = trip.destination || '';

  let originCoords = null;
  let destinationCoords = null;

  // Assumed no route_coordinates in trip object.
  if (Array.isArray(trip.route_coordinates) && trip.route_coordinates.length >= 2) {
    originCoords = trip.route_coordinates[0];
    destinationCoords = trip.route_coordinates[trip.route_coordinates.length - 1];
  } else {
    originCoords = await geocodeCity(origin);
    destinationCoords = await geocodeCity(destination);
  }

  if (!originCoords || !destinationCoords) {
    map.setView([34.0, 9.0], 6);
    return;
  }

  const bounds = window.L.latLngBounds([originCoords, destinationCoords]);

  window.L.circleMarker(originCoords, {
    radius: 6,
    color: '#2d8c4e',
    fillColor: '#2d8c4e',
    fillOpacity: 1
  }).addTo(map);

  window.L.circleMarker(destinationCoords, {
    radius: 6,
    color: '#4ecdc4',
    fillColor: '#4ecdc4',
    fillOpacity: 1
  }).addTo(map);

  window.L.polyline([originCoords, destinationCoords], {
    color: '#2d8c4e',
    weight: 3,
    dashArray: '6, 8'
  }).addTo(map);

  map.fitBounds(bounds, { padding: [20, 20] });
  mapCache.set(trip.id, map);
}

async function fetchTrips() {
  showSkeleton();
  updateUrl();

  const params = new URLSearchParams();
  if (state.origin) params.set('origin', state.origin);
  if (state.destination) params.set('destination', state.destination);
  if (state.date) params.set('date', state.date);
  params.set('page', state.page);
  params.set('limit', state.limit);

  const token = getToken();

  try {
    const response = await fetch(`${API_BASE}/api/trips?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const data = await response.json();
    const trips = Array.isArray(data.trips) ? data.trips : [];
    const pagination = data.pagination || {
      page: state.page,
      totalPages: 1,
      total: trips.length,
      limit: state.limit
    };

    updatePriceLimits(trips);
    renderResults(trips, pagination);
  } catch (error) {
    showEmpty(true);
  }
}

const debouncedFetch = debounce(() => {
  state.page = 1;
  fetchTrips();
}, 300);

function bindEvents() {
  if (dom.stripForm) {
    dom.stripForm.addEventListener('submit', (event) => {
      event.preventDefault();
      state.origin = dom.stripFrom.value.trim();
      state.destination = dom.stripTo.value.trim();
      state.date = dom.stripDate.value;
      if (dom.filterDate) dom.filterDate.value = state.date;
      state.page = 1;
      fetchTrips();
    });
  }

  if (dom.filterDate) {
    dom.filterDate.addEventListener('change', () => {
      state.date = dom.filterDate.value;
      if (dom.stripDate) dom.stripDate.value = state.date;
      debouncedFetch();
    });
  }

  dom.sortChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      state.sort = chip.dataset.sort;
      setActiveSort(state.sort);
      debouncedFetch();
    });
  });

  if (dom.priceMin && dom.priceMax) {
    dom.priceMin.addEventListener('input', () => {
      updatePriceSlider();
      state.minPrice = Number(dom.priceMin.value);
      debouncedFetch();
    });

    dom.priceMax.addEventListener('input', () => {
      updatePriceSlider();
      state.maxPrice = Number(dom.priceMax.value);
      debouncedFetch();
    });
  }

  const stepperButtons = Array.from(document.querySelectorAll('.stepper-btn'));
  stepperButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const step = Number(btn.dataset.step || 0);
      state.seats = Math.min(Math.max(state.seats + step, 1), 8);
      if (dom.seatsValue) dom.seatsValue.textContent = String(state.seats);
      if (dom.seatsLabel) dom.seatsLabel.textContent = `${state.seats}+ place disponible`;
      debouncedFetch();
    });
  });

  const resetButtons = Array.from(document.querySelectorAll('.filters-reset'));
  resetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.minPrice = 0;
      state.maxPrice = 200;
      state.seats = 1;
      state.sort = 'price_asc';
      state.page = 1;
      if (dom.filterDate) dom.filterDate.value = '';
      if (dom.stripDate) dom.stripDate.value = '';
      setActiveSort(state.sort);
      syncInputs();
      fetchTrips();
    });
  });

  if (dom.filtersToggle && dom.filtersCard) {
    dom.filtersToggle.addEventListener('click', () => {
      dom.filtersCard.classList.toggle('is-open');
    });
  }
}

setupSearchHeader();
parseParams();
syncInputs();
bindEvents();
fetchTrips();
