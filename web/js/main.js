/**
 * ============================================================
 * INNOVATEC — MÓDULO PRINCIPAL DE JAVASCRIPT
 * ============================================================
 * Funcionalidades:
 * - Navbar navigation (scroll, active link, mobile menu)
 * - Scroll reveal (IntersectionObserver)
 * - Counter animation
 * - Testimonials carousel
 * - FAQ accordion
 * - Form validation (email institucional)
 * - Smooth scroll
 * ============================================================
 */

// ═══════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════

/**
 * Debounce function
 */
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle function
 */
function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Verificar si un email es institucional ETEC
 */
function isInstitutionalEmail(email) {
  const studentDomain = '@alumno.etec.um.edu.ar';
  const teacherDomain = '@etec.um.edu.ar';
  const normalized = email.toLowerCase().trim();
  return normalized.endsWith(studentDomain) || normalized.endsWith(teacherDomain);
}

/**
 * Obtener tipo de usuario por email
 */
function getUserType(email) {
  const normalized = email.toLowerCase().trim();
  if (normalized.endsWith('@alumno.etec.um.edu.ar')) return 'student';
  if (normalized.endsWith('@etec.um.edu.ar')) return 'teacher';
  return null;
}

/**
 * Formatear número con separador de miles
 */
function formatNumber(num) {
  return new Intl.NumberFormat('es-AR').format(num);
}

// ═══════════════════════════════════════════════════════
// SCROLL REVEAL
// ═══════════════════════════════════════════════════════

function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal:not(.visible)');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}

// ═══════════════════════════════════════════════════════
// COUNTER ANIMATION
// ═══════════════════════════════════════════════════════

function initCounters() {
  const counters = document.querySelectorAll('.stat-num[data-target]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.dataset.target);
        const hasDecimal = el.dataset.decimal !== undefined;
        const duration = 1800;
        const start = performance.now();

        function step(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out quart
          const eased = 1 - Math.pow(1 - progress, 4);
          const val = eased * target;
          el.textContent = hasDecimal ? val.toFixed(1) : Math.floor(val);
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            el.textContent = hasDecimal ? target.toFixed(1) : target;
          }
        }
        requestAnimationFrame(step);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.4 });

  counters.forEach(counter => observer.observe(counter));
}

// ═══════════════════════════════════════════════════════
// TESTIMONIALS CAROUSEL
// ═══════════════════════════════════════════════════════

function initTestimonialsCarousel() {
  const track = document.querySelector('.testimonials-track');
  const cards = document.querySelectorAll('.testimonial-card');
  const prevBtn = document.querySelector('.carousel-btn.prev');
  const nextBtn = document.querySelector('.carousel-btn.next');
  const dotsContainer = document.querySelector('.carousel-dots');

  if (!track || cards.length === 0) return;

  let currentIndex = 0;
  let isAnimating = false;
  let autoTimer = null;
  const totalCards = cards.length;

  // Crear dots
  cards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Testimonio ${i + 1}`);
    dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  });

  const dots = dotsContainer.querySelectorAll('button');

  function updateDots() {
    dots.forEach((dot, i) => {
      dot.setAttribute('aria-selected', i === currentIndex ? 'true' : 'false');
    });
  }

  function goTo(index) {
    if (isAnimating) return;
    isAnimating = true;
    currentIndex = (index + totalCards) % totalCards;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    updateDots();

    setTimeout(() => { isAnimating = false; }, 700);
    resetAuto();
  }

  function next() { goTo(currentIndex + 1); }
  function prev() { goTo(currentIndex - 1); }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  // Auto play
  function startAuto() { autoTimer = setInterval(next, 5000); }
  function stopAuto() { clearInterval(autoTimer); }
  function resetAuto() { stopAuto(); startAuto(); }

  track.addEventListener('mouseenter', stopAuto);
  track.addEventListener('mouseleave', startAuto);

  // Touch swipe
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { diff > 0 ? next() : prev(); resetAuto(); }
  });

  // Keyboard navigation
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { prev(); resetAuto(); }
    if (e.key === 'ArrowRight') { next(); resetAuto(); }
  });

  startAuto();
}

// ═══════════════════════════════════════════════════════
// NAVBAR — Fixed top, scroll shadow, active link, mobile menu
// ═══════════════════════════════════════════════════════

function initNavbar() {
  const navbar = document.getElementById('mainNavbar');
  const toggle = document.getElementById('navbarToggle');
  const panel = document.getElementById('navbarPanel');
  const overlay = document.getElementById('navbarOverlay');
  const links = document.querySelectorAll('.navbar-link, .navbar-panel-link');
  const sections = document.querySelectorAll('section[id]');

  if (!navbar || !toggle || !panel || !overlay) return;

  // Scroll shadow effect
  function handleScroll() {
    if (window.scrollY > 10) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Active link tracking via IntersectionObserver
  function initActiveLinks() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          links.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${id}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, {
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0.1
    });

    sections.forEach(section => observer.observe(section));
  }
  initActiveLinks();

  // Mobile menu open/close
  function openMenu() {
    toggle.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    panel.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    toggle.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('open');
    panel.classList.remove('open');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMenu() : openMenu();
  });

  overlay.addEventListener('click', closeMenu);

  // Close on link click (mobile)
  panel.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Escape key to close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('open')) {
      closeMenu();
    }
  });
}

// ═══════════════════════════════════════════════════════
// FAQ ACCORDION
// ═══════════════════════════════════════════════════════

function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  const toggleAllBtn = document.getElementById('faqToggleAll');
  const toggleIcon = document.getElementById('faqToggleIcon');

  if (faqItems.length === 0) return;

  let allOpen = false;

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => toggleFaq(item));
    question.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFaq(item); }
    });
  });

  function toggleFaq(item) {
    const isOpen = item.hasAttribute('open');
    item.toggleAttribute('open', !isOpen);
    item.querySelector('.faq-question').setAttribute('aria-expanded', !isOpen);
  }

  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      allOpen = !allOpen;
      faqItems.forEach(item => {
        item.toggleAttribute('open', allOpen);
        item.querySelector('.faq-question').setAttribute('aria-expanded', String(allOpen));
      });
      toggleIcon.textContent = allOpen ? '−' : '+';
      toggleAllBtn.lastChild.textContent = allOpen ? ' Contraer todo' : ' Expandir todo';
    });
  }
}

// ═══════════════════════════════════════════════════════
// FORM VALIDATION (EMAIL INSTITUCIONAL)
// ═══════════════════════════════════════════════════════

function initFormValidation() {
  const forms = document.querySelectorAll('form[aria-label="Formulario de contacto rápido"], .cta-form, .newsletter-form');

  forms.forEach(form => {
    const emailInput = form.querySelector('input[type="email"]');
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!emailInput || !submitBtn) return;

    // Validación en tiempo real
    emailInput.addEventListener('input', debounce(() => {
      const email = emailInput.value.trim();
      if (email && !isInstitutionalEmail(email)) {
        emailInput.classList.add('has-error');
        showFieldError(emailInput, 'Solo se permiten correos @alumno.etec.um.edu.ar o @etec.um.edu.ar');
        submitBtn.disabled = true;
      } else {
        emailInput.classList.remove('has-error');
        hideFieldError(emailInput);
        submitBtn.disabled = false;
      }
    }, 300));

    // Submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();
      if (!isInstitutionalEmail(email)) {
        emailInput.classList.add('has-error');
        showFieldError(emailInput, 'Solo se permiten correos institucionales ETEC');
        emailInput.focus();
        return;
      }

      // Simular envío
      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span class="spinner"></span> Enviando...';

      try {
        // En producción: enviar a backend
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log('Form submitted:', new FormData(form));

        // Mostrar éxito
        showToast('¡Consulta enviada! Te responderemos pronto.', 'success');
        form.reset();
      } catch (error) {
        showToast('Error al enviar. Intenta nuevamente.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  });
}

/**
 * Mostrar error bajo un campo
 */
function showFieldError(input, message) {
  let errorEl = input.parentNode.querySelector('.form-error');
  if (!errorEl) {
    errorEl = document.createElement('p');
    errorEl.className = 'form-error';
    input.parentNode.appendChild(errorEl);
  }
  errorEl.textContent = message;
}

/**
 * Ocultar error de un campo
 */
function hideFieldError(input) {
  const errorEl = input.parentNode.querySelector('.form-error');
  if (errorEl) errorEl.remove();
}

/**
 * Toast notification simple
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} glass`;
  toast.style.cssText = `
    position: fixed; bottom: 100px; right: 24px; z-index: var(--z-toast);
    padding: var(--space-4) var(--space-6); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg); animation: slideUp 0.3s var(--ease-silk);
    max-width: 360px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideUp 0.3s var(--ease-silk) reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ═══════════════════════════════════════════════════════
// SMOOTH SCROLL PARA ENLACES ANCLA
// ═══════════════════════════════════════════════════════

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (href === '#') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const navbar = document.getElementById('mainNavbar');
          const navbarHeight = navbar ? navbar.offsetHeight + 20 : 100;
          const targetPosition = target.getBoundingClientRect().top + window.scrollY - navbarHeight;
          window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }
      }
    });
  });
}

// ═══════════════════════════════════════════════════════
// HERO SCROLL INDICATOR
// ═══════════════════════════════════════════════════════

function initHeroScroll() {
  const scrollLink = document.querySelector('.hero-scroll');
  if (!scrollLink) return;

  scrollLink.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(scrollLink.getAttribute('href'));
    if (target) {
      const navbar = document.getElementById('mainNavbar');
      const navbarHeight = navbar ? navbar.offsetHeight + 20 : 100;
      const targetPosition = target.getBoundingClientRect().top + window.scrollY - navbarHeight;
      window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    }
  });
}

// ═══════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initScrollReveal();
  initCounters();
  initTestimonialsCarousel();
  initFaqAccordion();
  initFormValidation();
  initSmoothScroll();
  initHeroScroll();

  // Log de inicialización
  console.log('🚀 InnovaTec - Módulo principal inicializado');
  console.log('🎨 Design tokens cargados desde variables.css');
  console.log('🔮 Glassmorphism activado');
});

// Exportar utilidades para uso en otros módulos
export { debounce, throttle, isInstitutionalEmail, getUserType, formatNumber, showToast };