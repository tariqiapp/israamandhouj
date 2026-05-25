(function () {
  let initialized = false;

  function initAuthUI() {
    if (initialized) return;

    const modal = document.getElementById('auth-modal');
    if (!modal) {
      setTimeout(initAuthUI, 80);
      return;
    }

    initialized = true;

    const card = modal.querySelector('.auth-card');
    const closeButton = modal.querySelector('.auth-close');
    const tabs = Array.from(modal.querySelectorAll('.auth-tab'));
    const forms = Array.from(modal.querySelectorAll('.auth-form'));
    const globalError = modal.querySelector('.auth-global-error');
    let activeTab = 'login';
    let lastFocused = null;

    function setGlobalError(message) {
      if (!globalError) return;
      if (message) {
        globalError.textContent = message;
        globalError.classList.add('is-visible');
      } else {
        globalError.textContent = '';
        globalError.classList.remove('is-visible');
      }
    }

    function setFieldError(fieldEl, message) {
      if (!fieldEl) return;
      const errorText = fieldEl.querySelector('.auth-error-text');
      fieldEl.classList.add('has-error');
      if (errorText) {
        errorText.textContent = message || '';
      }
    }

    function clearFieldError(fieldEl) {
      if (!fieldEl) return;
      fieldEl.classList.remove('has-error');
      const errorText = fieldEl.querySelector('.auth-error-text');
      if (errorText) {
        errorText.textContent = '';
      }
    }

    function resetForm(form) {
      if (!form) return;
      form.reset();
      form.querySelectorAll('.auth-field').forEach(clearFieldError);
      const toggles = form.querySelectorAll('.auth-toggle');
      toggles.forEach((toggle) => {
        toggle.classList.remove('is-visible');
        toggle.setAttribute('aria-label', 'Afficher le mot de passe');
      });
      const passwordInputs = form.querySelectorAll('[data-password]');
      passwordInputs.forEach((input) => {
        input.type = 'password';
      });
      const strength = form.querySelector('.auth-strength');
      if (strength) {
        strength.classList.remove('visible', 'weak', 'medium', 'strong');
        const label = strength.querySelector('.auth-strength-label');
        if (label) label.textContent = '';
      }
    }

    function setActiveTab(targetTab) {
      activeTab = targetTab;
      tabs.forEach((tab) => {
        const isActive = tab.dataset.tab === targetTab;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });

      forms.forEach((form) => {
        const isActive = form.dataset.form === targetTab;
        form.classList.toggle('is-active', isActive);
        resetForm(form);
      });

      setGlobalError('');
    }

    function openModal() {
      lastFocused = document.activeElement;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('auth-modal-open');

      const activeForm = forms.find((form) => form.dataset.form === activeTab);
      const firstInput = activeForm ? activeForm.querySelector('input') : null;
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 10);
      }
    }

    function closeModal() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('auth-modal-open');
      forms.forEach(resetForm);
      setGlobalError('');

      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }

    function trapFocus(event) {
      if (event.key !== 'Tab' || !modal.classList.contains('open')) return;

      const focusable = Array.from(
        modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled'));

      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-auth-trigger]');
      if (trigger) {
        event.preventDefault();
        openModal();

        const hamburger = document.querySelector('.hamburger');
        const mobileMenu = document.querySelector('.mobile-menu');
        if (hamburger && mobileMenu && mobileMenu.classList.contains('open')) {
          hamburger.classList.remove('open');
          mobileMenu.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
        }
      }
    });

    closeButton.addEventListener('click', closeModal);

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('open')) {
        closeModal();
      }
    });

    document.addEventListener('keydown', trapFocus);

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        setActiveTab(tab.dataset.tab);
      });
    });

    modal.querySelectorAll('.auth-toggle').forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const input = toggle.closest('.auth-input-wrap').querySelector('input');
        const isVisible = input.type === 'password';
        input.type = isVisible ? 'text' : 'password';
        toggle.classList.toggle('is-visible', isVisible);
        toggle.setAttribute(
          'aria-label',
          isVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
        );
        input.classList.add('auth-password');
      });
    });

    function setLoading(button, isLoading) {
      if (!button) return;
      const label = button.querySelector('.auth-submit-label');
      const loadingText = button.getAttribute('data-loading-text');
      if (isLoading) {
        button.classList.add('is-loading');
        button.disabled = true;
        if (label && loadingText) label.textContent = loadingText;
      } else {
        button.classList.remove('is-loading');
        button.disabled = false;
        if (label) {
          label.textContent = button.getAttribute('data-default-label') || label.textContent;
        }
      }
    }

    function validateEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).toLowerCase());
    }

    function updateStrength(password, strengthEl) {
      if (!strengthEl) return;
      const label = strengthEl.querySelector('.auth-strength-label');
      strengthEl.classList.remove('weak', 'medium', 'strong', 'visible');

      if (!password || password.length < 6) {
        if (label) label.textContent = '';
        return;
      }

      const hasLetter = /[a-zA-Z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSymbol = /[^a-zA-Z0-9]/.test(password);
      const hasMix = hasLetter && hasNumber;

      strengthEl.classList.add('visible');

      if (password.length >= 8 && hasMix && hasSymbol) {
        strengthEl.classList.add('strong');
        if (label) label.textContent = 'Fort';
      } else if (hasMix) {
        strengthEl.classList.add('medium');
        if (label) label.textContent = 'Moyen';
      } else {
        strengthEl.classList.add('weak');
        if (label) label.textContent = 'Faible';
      }
    }

    const registerPassword = modal.querySelector('#register-password');
    const strength = modal.querySelector('.auth-strength');
    if (registerPassword && strength) {
      registerPassword.addEventListener('input', () => {
        updateStrength(registerPassword.value, strength);
      });
    }

    const loginForm = modal.querySelector('[data-form="login"]');
    const registerForm = modal.querySelector('[data-form="register"]');

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setGlobalError('');

      const emailField = loginForm.querySelector('[data-field="email"]');
      const passwordField = loginForm.querySelector('[data-field="password"]');
      const emailInput = loginForm.querySelector('#login-email');
      const passwordInput = loginForm.querySelector('#login-password');
      const submitButton = loginForm.querySelector('.auth-submit');

      clearFieldError(emailField);
      clearFieldError(passwordField);

      let hasError = false;
      if (!validateEmail(emailInput.value)) {
        setFieldError(emailField, 'Adresse email invalide.');
        hasError = true;
      }

      if (!passwordInput.value) {
        setFieldError(passwordField, 'Mot de passe requis.');
        hasError = true;
      }

      if (hasError) return;

      setLoading(submitButton, true);

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailInput.value.trim(),
            password: passwordInput.value
          })
        });

        if (response.status === 401) {
          setGlobalError('Email ou mot de passe incorrect.');
          setLoading(submitButton, false);
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          setGlobalError('Une erreur est survenue. Réessayez.');
          setLoading(submitButton, false);
          return;
        }

        if (data && data.token) {
          localStorage.setItem('tariqi_token', data.token);
          closeModal();
          updateNavbarState();
        }
      } catch (error) {
        setGlobalError('Une erreur est survenue. Réessayez.');
      } finally {
        setLoading(submitButton, false);
      }
    });

    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setGlobalError('');

      const nameField = registerForm.querySelector('[data-field="name"]');
      const emailField = registerForm.querySelector('[data-field="email"]');
      const passwordField = registerForm.querySelector('[data-field="password"]');
      const confirmField = registerForm.querySelector('[data-field="confirm"]');
      const nameInput = registerForm.querySelector('#register-name');
      const emailInput = registerForm.querySelector('#register-email');
      const passwordInput = registerForm.querySelector('#register-password');
      const confirmInput = registerForm.querySelector('#register-confirm');
      const submitButton = registerForm.querySelector('.auth-submit');

      [nameField, emailField, passwordField, confirmField].forEach(clearFieldError);

      let hasError = false;
      if (!nameInput.value.trim()) {
        setFieldError(nameField, 'Nom requis.');
        hasError = true;
      }

      if (!validateEmail(emailInput.value)) {
        setFieldError(emailField, 'Adresse email invalide.');
        hasError = true;
      }

      if (!passwordInput.value || passwordInput.value.length < 6) {
        setFieldError(passwordField, 'Le mot de passe doit contenir au moins 6 caractères.');
        hasError = true;
      }

      if (passwordInput.value !== confirmInput.value) {
        setFieldError(confirmField, 'Les mots de passe ne correspondent pas.');
        hasError = true;
      }

      if (hasError) return;

      setLoading(submitButton, true);

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value
          })
        });

        if (response.status === 409) {
          setFieldError(emailField, 'Cette adresse email est déjà utilisée.');
          setLoading(submitButton, false);
          return;
        }

        const data = await response.json();

        if (response.status === 400 && data && Array.isArray(data.details)) {
          data.details.forEach((detail) => {
            const field = registerForm.querySelector(`[data-field="${detail.field}"]`);
            if (field) {
              setFieldError(field, detail.message);
            }
          });
          setLoading(submitButton, false);
          return;
        }

        if (!response.ok) {
          setGlobalError('Une erreur est survenue. Réessayez.');
          setLoading(submitButton, false);
          return;
        }

        if (data && data.token) {
          localStorage.setItem('tariqi_token', data.token);
          closeModal();
          updateNavbarState();
        }
      } catch (error) {
        setGlobalError('Une erreur est survenue. Réessayez.');
      } finally {
        setLoading(submitButton, false);
      }
    });

    async function fetchUser(token) {
      try {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data.user || null;
      } catch (error) {
        return null;
      }
    }

    function buildUserMenu(user) {
      const navActions = document.querySelector('.nav-actions');
      if (!navActions) return;

      const existing = navActions.querySelector('.auth-user');
      if (existing) existing.remove();

      const authUser = document.createElement('div');
      authUser.className = 'auth-user';

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'auth-user-trigger';
      trigger.setAttribute('aria-haspopup', 'true');
      trigger.setAttribute('aria-expanded', 'false');

      const initial = document.createElement('span');
      initial.className = 'auth-user-initial';
      initial.textContent = user.name ? user.name.trim().charAt(0).toUpperCase() : '?';

      const name = document.createElement('span');
      name.className = 'auth-user-name';
      const displayName = user.name ? user.name.trim() : 'Utilisateur';
      name.textContent = displayName.length > 14 ? `${displayName.slice(0, 14)}…` : displayName;

      const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      chevron.setAttribute('viewBox', '0 0 12 12');
      chevron.setAttribute('width', '12');
      chevron.setAttribute('height', '12');
      chevron.classList.add('auth-user-chevron');
      chevron.innerHTML = '<path fill="currentColor" d="M2.1 4.2 6 8l3.9-3.8 1 1L6 10.2 1.1 5.2z" />';

      trigger.appendChild(initial);
      trigger.appendChild(name);
      trigger.appendChild(chevron);

      const menu = document.createElement('div');
      menu.className = 'auth-user-menu';

      const profile = document.createElement('a');
      profile.href = '/profil.html';
      profile.textContent = 'Mon profil';

      const trips = document.createElement('a');
      trips.href = '/mes-trajets.html';
      trips.textContent = 'Mes trajets';

      const divider = document.createElement('div');
      divider.className = 'auth-user-divider';

      const logoutButton = document.createElement('button');
      logoutButton.type = 'button';
      logoutButton.textContent = 'Se déconnecter';
      logoutButton.addEventListener('click', () => {
        logout();
      });

      menu.appendChild(profile);
      menu.appendChild(trips);
      menu.appendChild(divider);
      menu.appendChild(logoutButton);

      authUser.appendChild(trigger);
      authUser.appendChild(menu);

      navActions.insertBefore(authUser, navActions.firstChild);

      function closeMenu() {
        menu.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }

      trigger.addEventListener('click', () => {
        const isOpen = menu.classList.contains('open');
        menu.classList.toggle('open', !isOpen);
        trigger.setAttribute('aria-expanded', String(!isOpen));
      });

      document.addEventListener('click', (event) => {
        if (!authUser.contains(event.target)) {
          closeMenu();
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeMenu();
        }
      });
    }

    async function updateNavbarState() {
      const token = localStorage.getItem('tariqi_token');
      const navActions = document.querySelector('.nav-actions');
      if (!navActions) {
        setTimeout(updateNavbarState, 80);
        return;
      }
      const authTriggers = document.querySelectorAll('[data-auth-trigger]');

      if (!token) {
        authTriggers.forEach((el) => el.classList.remove('auth-hidden'));
        const existing = document.querySelector('.auth-user');
        if (existing) existing.remove();
        return;
      }

      const user = await fetchUser(token);
      if (!user) {
        localStorage.removeItem('tariqi_token');
        authTriggers.forEach((el) => el.classList.remove('auth-hidden'));
        const existing = document.querySelector('.auth-user');
        if (existing) existing.remove();
        return;
      }

      authTriggers.forEach((el) => el.classList.add('auth-hidden'));
      buildUserMenu(user);
    }

    function logout() {
      localStorage.removeItem('tariqi_token');
      updateNavbarState();

      const path = window.location.pathname;
      if (path && !path.endsWith('index.html') && path !== '/') {
        window.location.href = 'index.html';
      }
    }

    window.updateNavbarState = updateNavbarState;
    window.logout = logout;

    updateNavbarState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthUI);
  } else {
    initAuthUI();
  }
})();
