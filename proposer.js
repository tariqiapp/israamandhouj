(function () {
  const overlay = document.getElementById('driver-auth-overlay');
  const applyPanel = document.querySelector('[data-panel="apply"]');
  const tripPanel = document.querySelector('[data-panel="trip"]');
  const applyForm = document.getElementById('driver-apply-form');
  const tripForm = document.getElementById('driver-trip-form');
  const applySuccess = document.querySelector('.driver-apply-success');
  const heroCta = document.querySelector('.driver-hero-cta');
  const routeCoordsInput = document.getElementById('route-coords');
  const routeHint = document.querySelector('.route-hint');
  const routeReset = document.querySelector('.route-reset');

  const mapState = {
    map: null,
    originMarker: null,
    destinationMarker: null,
    polyline: null,
    points: [],
    finalized: false
  };

  const geoCache = new Map();

  function getToken() {
    return localStorage.getItem('tariqi_token');
  }

  function setOverlayVisible(show) {
    if (!overlay) return;
    overlay.classList.toggle('is-visible', show);
    overlay.setAttribute('aria-hidden', String(!show));
  }

  function setPanel(panelName) {
    if (applyPanel) applyPanel.classList.toggle('is-active', panelName === 'apply');
    if (tripPanel) tripPanel.classList.toggle('is-active', panelName === 'trip');
  }

  function clearErrors(form) {
    if (!form) return;
    form.querySelectorAll('.driver-field').forEach((field) => {
      field.classList.remove('has-error');
      const error = field.querySelector('.form-error');
      if (error) error.textContent = '';
    });
  }

  function setFieldError(form, fieldName, message) {
    if (!form) return;
    const field = form.querySelector(`[data-field="${fieldName}"]`);
    if (!field) return;
    field.classList.add('has-error');
    const error = field.querySelector('.form-error');
    if (error) error.textContent = message;
  }

  function showToast(message, type) {
    let toast = document.querySelector('.driver-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'driver-toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.toggle('success', type === 'success');
    toast.classList.toggle('error', type === 'error');
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  async function checkAuthGate() {
    const token = getToken();
    setPanel(null);

    if (!token) {
      setOverlayVisible(true);
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 401) {
        localStorage.removeItem('tariqi_token');
        setOverlayVisible(true);
        return;
      }

      if (!response.ok) {
        setOverlayVisible(true);
        return;
      }

      const data = await response.json();
      const user = data.user;
      if (user && user.role === 'driver') {
        setOverlayVisible(false);
        setPanel('trip');
        initMap();
        document.getElementById('driver-form-section').scrollIntoView({ behavior: 'smooth' });
      } else {
        setOverlayVisible(false);
        setPanel('apply');
      }
    } catch (error) {
      setOverlayVisible(true);
    }
  }

  function hookAuthUpdate() {
    if (typeof window.updateNavbarState === 'function') {
      const original = window.updateNavbarState;
      window.updateNavbarState = async function () {
        await original();
        await checkAuthGate();
      };
    } else {
      setTimeout(hookAuthUpdate, 100);
    }
  }

  function bindHeroCta() {
    if (!heroCta) return;
    heroCta.addEventListener('click', () => {
      const section = document.getElementById('driver-form-section');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (applyForm) {
    applyForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearErrors(applyForm);

      const token = getToken();
      if (!token) {
        setOverlayVisible(true);
        return;
      }

      const license = applyForm.querySelector('[name="license_number"]');
      const vehicle = applyForm.querySelector('[name="vehicle_info"]');
      let hasError = false;

      if (!license.value.trim()) {
        setFieldError(applyForm, 'license_number', 'Numéro de permis requis.');
        hasError = true;
      }

      if (!vehicle.value.trim()) {
        setFieldError(applyForm, 'vehicle_info', 'Informations véhicule requises.');
        hasError = true;
      }

      if (hasError) return;

      try {
        const response = await fetch('/api/drivers/apply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            license_number: license.value.trim(),
            vehicle_info: vehicle.value.trim()
          })
        });

        if (response.ok) {
          applyForm.classList.add('is-hidden');
          if (applySuccess) applySuccess.classList.add('is-visible');
          return;
        }

        const data = await response.json().catch(() => null);
        if (data && data.error) {
          showToast(data.error, 'error');
        } else {
          showToast('Une erreur est survenue.', 'error');
        }
      } catch (error) {
        showToast('Une erreur est survenue.', 'error');
      }
    });
  }

  function buildTripPayload(routeCoords) {
    const origin = tripForm.querySelector('[name="origin"]').value.trim();
    const destination = tripForm.querySelector('[name="destination"]').value.trim();
    const date = tripForm.querySelector('[name="date"]').value;
    const time = tripForm.querySelector('[name="time"]').value;
    const availableSeats = tripForm.querySelector('[name="available_seats"]').value;
    const price = tripForm.querySelector('[name="price"]').value;

    const payload = {
      origin,
      destination,
      departure_time: `${date}T${time}:00`,
      available_seats: Number(availableSeats),
      price: Number(price)
    };

    if (routeCoords && routeCoords.length) {
      payload.route_coordinates = routeCoords;
    }

    return payload;
  }

  async function submitTrip(payload, token, allowRetry = true) {
    const response = await fetch('/api/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 400 && payload.route_coordinates && allowRetry) {
      const data = await response.json().catch(() => null);
      const message = data && (data.error || data.message || '');
      if (message && /route|unknown/i.test(message)) {
        const retryPayload = { ...payload };
        delete retryPayload.route_coordinates;
        return submitTrip(retryPayload, token, false);
      }
    }

    return response;
  }

  if (tripForm) {
    tripForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearErrors(tripForm);

      const token = getToken();
      if (!token) {
        setOverlayVisible(true);
        return;
      }

      const origin = tripForm.querySelector('[name="origin"]').value.trim();
      const destination = tripForm.querySelector('[name="destination"]').value.trim();
      const date = tripForm.querySelector('[name="date"]').value;
      const time = tripForm.querySelector('[name="time"]').value;
      const seats = tripForm.querySelector('[name="available_seats"]').value;
      const price = tripForm.querySelector('[name="price"]').value;

      let hasError = false;
      if (!origin) {
        setFieldError(tripForm, 'origin', 'Ville de départ requise.');
        hasError = true;
      }
      if (!destination) {
        setFieldError(tripForm, 'destination', 'Ville d\'arrivée requise.');
        hasError = true;
      }
      if (!date) {
        setFieldError(tripForm, 'date', 'Date requise.');
        hasError = true;
      }
      if (!time) {
        setFieldError(tripForm, 'time', 'Heure requise.');
        hasError = true;
      }
      if (!seats || Number(seats) < 1) {
        setFieldError(tripForm, 'available_seats', 'Indiquez le nombre de places.');
        hasError = true;
      }
      if (!price || Number(price) < 1) {
        setFieldError(tripForm, 'price', 'Indiquez un prix valide.');
        hasError = true;
      }

      if (hasError) return;

      const coordsValue = routeCoordsInput ? routeCoordsInput.value : '';
      const coords = coordsValue ? JSON.parse(coordsValue) : [];
      const payload = buildTripPayload(coords);

      try {
        const response = await submitTrip(payload, token);
        if (response.status === 201) {
          tripForm.reset();
          resetRoute();
          showToast('Trajet publié !', 'success');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        const data = await response.json().catch(() => null);
        if (response.status === 400 && data && Array.isArray(data.details)) {
          data.details.forEach((detail) => {
            const field = detail.field === 'departure_time' ? 'date' : detail.field;
            setFieldError(tripForm, field, detail.message);
          });
          return;
        }

        showToast('Une erreur est survenue.', 'error');
      } catch (error) {
        showToast('Une erreur est survenue.', 'error');
      }
    });
  }

  function updateRouteInput() {
    if (!routeCoordsInput) return;
    routeCoordsInput.value = JSON.stringify(mapState.points);
  }

  function drawPolyline() {
    if (!mapState.map) return;
    const coords = mapState.points.map((point) => [point.lat, point.lng]);

    if (!coords.length) {
      if (mapState.polyline) {
        mapState.map.removeLayer(mapState.polyline);
        mapState.polyline = null;
      }
      return;
    }

    if (!mapState.polyline) {
      mapState.polyline = window.L.polyline(coords, {
        color: '#2d8c4e',
        weight: 4
      }).addTo(mapState.map);
    } else {
      mapState.polyline.setLatLngs(coords);
    }
  }

  function updateMarkers() {
    if (!mapState.map) return;
    const origin = mapState.points[0];
    const destination = mapState.points[mapState.points.length - 1];

    if (origin) {
      if (!mapState.originMarker) {
        mapState.originMarker = window.L.circleMarker([origin.lat, origin.lng], {
          radius: 6,
          color: '#2d8c4e',
          fillColor: '#2d8c4e',
          fillOpacity: 1
        }).addTo(mapState.map);
      } else {
        mapState.originMarker.setLatLng([origin.lat, origin.lng]);
      }
    }

    if (destination && mapState.points.length > 1) {
      if (!mapState.destinationMarker) {
        mapState.destinationMarker = window.L.circleMarker([destination.lat, destination.lng], {
          radius: 6,
          color: '#4ecdc4',
          fillColor: '#4ecdc4',
          fillOpacity: 1
        }).addTo(mapState.map);
      } else {
        mapState.destinationMarker.setLatLng([destination.lat, destination.lng]);
      }
    }
  }

  function addRoutePoint(latlng) {
    if (mapState.finalized) return;
    mapState.points.push({ lat: latlng.lat, lng: latlng.lng });
    drawPolyline();
    updateMarkers();
    updateRouteInput();
    if (routeHint) routeHint.classList.add('is-hidden');
  }

  function resetRoute() {
    mapState.points = [];
    mapState.finalized = false;
    if (mapState.originMarker) {
      mapState.map.removeLayer(mapState.originMarker);
      mapState.originMarker = null;
    }
    if (mapState.destinationMarker) {
      mapState.map.removeLayer(mapState.destinationMarker);
      mapState.destinationMarker = null;
    }
    if (mapState.polyline) {
      mapState.map.removeLayer(mapState.polyline);
      mapState.polyline = null;
    }
    if (routeHint) routeHint.classList.remove('is-hidden');
    updateRouteInput();
    if (mapState.map) {
      mapState.map.setView([34.0, 9.0], 6);
    }
  }

  function initMap() {
    if (mapState.map || !window.L) return;
    const mapEl = document.getElementById('route-map');
    if (!mapEl) return;

    mapState.map = window.L.map(mapEl, {
      scrollWheelZoom: false,
      doubleClickZoom: false
    });

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapState.map);

    mapState.map.setView([34.0, 9.0], 6);

    mapState.map.on('click', (event) => {
      addRoutePoint(event.latlng);
    });

    mapState.map.on('dblclick', () => {
      mapState.finalized = true;
      updateRouteInput();
    });

    if (routeReset) {
      routeReset.addEventListener('click', resetRoute);
    }
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
    const coords = { lat: Number(data[0].lat), lng: Number(data[0].lon) };
    geoCache.set(key, coords);
    return coords;
  }

  async function syncMapFromInput(type) {
    if (!mapState.map) initMap();
    if (!mapState.map) return;

    const originInput = tripForm.querySelector('[name="origin"]');
    const destinationInput = tripForm.querySelector('[name="destination"]');
    const value = type === 'origin' ? originInput.value.trim() : destinationInput.value.trim();

    const coords = await geocodeCity(value);
    if (!coords) return;

    if (type === 'origin') {
      if (!mapState.points.length) {
        mapState.points.push(coords);
      } else {
        mapState.points[0] = coords;
      }
    } else {
      if (mapState.points.length < 2) {
        if (!mapState.points.length) {
          mapState.points.push(coords);
        } else {
          mapState.points[1] = coords;
        }
      } else {
        mapState.points[mapState.points.length - 1] = coords;
      }
    }

    drawPolyline();
    updateMarkers();
    updateRouteInput();
    if (routeHint) routeHint.classList.add('is-hidden');
    mapState.map.setView([coords.lat, coords.lng], 8);
  }

  function bindMapInputs() {
    if (!tripForm) return;
    const originInput = tripForm.querySelector('[name="origin"]');
    const destinationInput = tripForm.querySelector('[name="destination"]');

    if (originInput) {
      originInput.addEventListener('blur', () => {
        syncMapFromInput('origin');
      });
    }

    if (destinationInput) {
      destinationInput.addEventListener('blur', () => {
        syncMapFromInput('destination');
      });
    }
  }

  hookAuthUpdate();
  bindHeroCta();
  bindMapInputs();
  checkAuthGate();
})();
