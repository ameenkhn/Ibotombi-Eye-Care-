/* =========================================================================
   Ibotombi Eye Care — premium interaction layer
   - Sticky header shade on scroll
   - Mobile nav drawer
   - IntersectionObserver scroll reveal with staggered delays
   - Stat / counter animation (number-up on view)
   - Lightweight testimonial carousel (autoplay, dots, swipe)
   - Marquee duplication for seamless loop
   - FAQ accordion: exclusive-open behavior
   - Appointment form -> WhatsApp handoff
   - Back-to-top floating button
   - Current-year stamp in footers
   ========================================================================= */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------------------
     Preloader — fade out once page is loaded, with a guaranteed minimum
     display time measured from the moment this script starts (so cached
     loads on mobile still show the branded loader).
  ---------------------------------------------------------------------- */
  const preloader = document.getElementById('preloader');
  if (preloader) {
    // Lock body scroll while the preloader is visible
    const htmlEl = document.documentElement;
    const prev = { htmlOverflow: htmlEl.style.overflow, bodyOverflow: document.body.style.overflow };
    htmlEl.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    const scriptStart = performance.now();
    const MIN_MS = prefersReducedMotion ? 300 : 1500;   // guaranteed display from script start
    const HIDE_MS = 700;                                // fade-out duration (matches CSS)
    let hidden = false;

    const hide = () => {
      if (hidden) return;
      hidden = true;
      preloader.classList.add('is-hidden');
      htmlEl.style.overflow = prev.htmlOverflow;
      document.body.style.overflow = prev.bodyOverflow;
      setTimeout(() => { if (preloader.parentNode) preloader.remove(); }, HIDE_MS);
    };
    const trigger = () => {
      const elapsed = performance.now() - scriptStart;
      const wait = Math.max(0, MIN_MS - elapsed);
      setTimeout(hide, wait);
    };

    if (document.readyState === 'complete') trigger();
    else window.addEventListener('load', trigger, { once: true });

    // Safety fallback — never let the preloader hang if load never fires
    setTimeout(hide, 7000);
  }

  /* ----------------------------------------------------------------------
     Sticky header
  ---------------------------------------------------------------------- */
  const header = document.querySelector('.site-header');
  const syncHeader = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  /* ----------------------------------------------------------------------
     Mobile nav
  ---------------------------------------------------------------------- */
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');
  if (navToggle && siteNav) {
    // Create a dimmed backdrop once, wired to close the drawer on tap
    const backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);

    const openNav = () => {
      navToggle.setAttribute('aria-expanded', 'true');
      siteNav.classList.add('is-open');
      backdrop.classList.add('is-visible');
      document.body.style.overflow = 'hidden';
    };
    const closeNav = () => {
      navToggle.setAttribute('aria-expanded', 'false');
      siteNav.classList.remove('is-open');
      backdrop.classList.remove('is-visible');
      document.body.style.overflow = '';
    };
    const toggleNav = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      if (expanded) closeNav(); else openNav();
    };

    // Use both click and touchstart for reliable tap response on iOS
    navToggle.addEventListener('click', toggleNav);
    backdrop.addEventListener('click', closeNav);
    siteNav.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeNav));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && siteNav.classList.contains('is-open')) closeNav();
    });
  }

  /* ----------------------------------------------------------------------
     Scroll reveal with staggered delay for grouped items
  ---------------------------------------------------------------------- */
  const revealItems = document.querySelectorAll('.reveal');
  if (revealItems.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealItems.forEach((el, idx) => {
      if (!el.style.transitionDelay) {
        const group = el.closest('[data-stagger]');
        if (group) {
          const siblings = Array.from(group.querySelectorAll('.reveal'));
          const pos = siblings.indexOf(el);
          el.style.transitionDelay = `${Math.min(pos, 5) * 80}ms`;
        }
      }
      observer.observe(el);
    });
  } else {
    revealItems.forEach((el) => el.classList.add('is-visible'));
  }

  /* ----------------------------------------------------------------------
     Stat counter (data-count attribute on strong tag)
  ---------------------------------------------------------------------- */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const animate = (el) => {
      const target = parseFloat(el.getAttribute('data-count'));
      const decimals = (String(target).split('.')[1] || '').length;
      const duration = 1400;
      const start = performance.now();
      const from = 0;
      const step = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = from + (target - from) * eased;
        el.textContent = decimals ? val.toFixed(decimals) : Math.round(val).toString();
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (prefersReducedMotion) {
            entry.target.textContent = entry.target.getAttribute('data-count');
          } else {
            animate(entry.target);
          }
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((c) => obs.observe(c));
  }

  /* ----------------------------------------------------------------------
     Marquee: duplicate children so the loop is seamless
  ---------------------------------------------------------------------- */
  document.querySelectorAll('.marquee-track').forEach((track) => {
    const clone = track.cloneNode(true);
    // keep outer wrapper semantics, just append children
    Array.from(clone.children).forEach((c) => track.appendChild(c.cloneNode(true)));
  });

  /* ----------------------------------------------------------------------
     FAQ accordion: exclusive-open
  ---------------------------------------------------------------------- */
  document.querySelectorAll('.faq-list').forEach((list) => {
    const items = list.querySelectorAll('.faq-item');
    items.forEach((item) => {
      item.addEventListener('toggle', () => {
        if (item.open) {
          items.forEach((other) => { if (other !== item) other.open = false; });
        }
      });
    });
  });

  /* ----------------------------------------------------------------------
     Testimonial carousel
  ---------------------------------------------------------------------- */
  const carousel = document.querySelector('[data-carousel]');
  if (carousel) {
    const track = carousel.querySelector('.testimonial-track');
    const slides = carousel.querySelectorAll('.testimonial-slide');
    const dots = carousel.querySelectorAll('.carousel-dot');
    let index = 0;
    let timer = null;

    const goTo = (i) => {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((d, di) => d.classList.toggle('is-active', di === index));
    };
    const next = () => goTo(index + 1);

    dots.forEach((d, di) => d.addEventListener('click', () => { goTo(di); restart(); }));

    const start = () => { if (!prefersReducedMotion) timer = setInterval(next, 6000); };
    const stop = () => { if (timer) clearInterval(timer); };
    const restart = () => { stop(); start(); };

    // Swipe support
    let sx = 0, sdx = 0;
    track.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sdx = 0; stop(); }, { passive: true });
    track.addEventListener('touchmove',  (e) => { sdx = e.touches[0].clientX - sx; }, { passive: true });
    track.addEventListener('touchend',   () => {
      if (Math.abs(sdx) > 50) goTo(index + (sdx < 0 ? 1 : -1));
      start();
    });

    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', start);
    goTo(0);
    start();
  }

  /* ----------------------------------------------------------------------
     Appointment form -> WhatsApp
  ---------------------------------------------------------------------- */
  const appointmentForm = document.querySelector('.appointment-form');
  if (appointmentForm) {
    appointmentForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const d = new FormData(appointmentForm);
      const get = (k) => (d.get(k) || '').toString().trim();
      const lines = [
        'Hello Ibotombi Eye Care, I would like to request an appointment.',
        get('name')    && `• Name: ${get('name')}`,
        get('phone')   && `• Phone: ${get('phone')}`,
        get('service') && `• Service needed: ${get('service')}`,
        get('date')    && `• Preferred day/time: ${get('date')}`,
        get('age')     && `• Age: ${get('age')}`,
        get('message') && `• Note: ${get('message')}`,
      ].filter(Boolean);
      const url = `https://wa.me/919863006204?text=${encodeURIComponent(lines.join('\n'))}`;
      window.open(url, '_blank', 'noopener');
      // Provide friendly feedback
      const btn = appointmentForm.querySelector('button[type="submit"]');
      if (btn) {
        const original = btn.innerHTML;
        btn.innerHTML = 'Opening WhatsApp…';
        btn.disabled = true;
        setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 1800);
      }
    });
  }

  /* ----------------------------------------------------------------------
     Back to top
  ---------------------------------------------------------------------- */
  const toTop = document.querySelector('.fab-to-top');
  if (toTop) {
    const syncToTop = () => toTop.classList.toggle('is-visible', window.scrollY > 600);
    syncToTop();
    window.addEventListener('scroll', syncToTop, { passive: true });
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ----------------------------------------------------------------------
     Footer year
  ---------------------------------------------------------------------- */
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear().toString();
  });

})();
