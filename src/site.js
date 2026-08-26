/* =========================================================================
   Ibotombi Eye Care — premium interaction layer
   - Sticky header shade on scroll
   - Mobile nav drawer
   - IntersectionObserver scroll reveal with staggered delays
   - Stat / counter animation (number-up on view)
   - Lightweight testimonial carousel (autoplay, dots, swipe)
   - Marquee duplication for seamless loop
   - FAQ accordion: exclusive-open behavior
   - Back-to-top floating button
   - Current-year stamp in footers
   ========================================================================= */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------------------
     Preloader — dismissed as soon as the DOM is ready.
     It deliberately does NOT wait for window.load (that waits on every
     image) and enforces no artificial minimum display time, so a fast
     connection sees content immediately instead of a held splash screen.
  ---------------------------------------------------------------------- */
  const preloader = document.getElementById('preloader');
  if (preloader) {
    const htmlEl = document.documentElement;
    const prev = { htmlOverflow: htmlEl.style.overflow, bodyOverflow: document.body.style.overflow };
    htmlEl.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    const HIDE_MS = 260;                                // fade-out duration (matches CSS)
    let hidden = false;

    const hide = () => {
      if (hidden) return;
      hidden = true;
      preloader.classList.add('is-hidden');
      htmlEl.style.overflow = prev.htmlOverflow;
      document.body.style.overflow = prev.bodyOverflow;
      setTimeout(() => { if (preloader.parentNode) preloader.remove(); }, HIDE_MS);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', hide, { once: true });
    } else {
      hide();
    }

    // Safety fallback — never let the preloader hang
    setTimeout(hide, 3000);
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
    // Width at which the drawer gives way to the inline desktop nav.
    // Must match the max-width of the drawer block in site.css.
    const DRAWER_MQ = window.matchMedia('(max-width: 1279px)');
    const SLIDE_MS = 360;                               // matches the CSS transition

    if (!siteNav.id) siteNav.id = 'primary-navigation';
    navToggle.setAttribute('aria-controls', siteNav.id);

    // Dimmed backdrop, created once and wired to close the drawer on tap.
    const backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);

    let isOpen = false;
    let stowTimer = null;
    let scrollY = 0;
    let lastFocused = null;

    /* A closed drawer is display:none (see .is-stowed). Beyond removing the
       horizontal scroll it also keeps the off-screen links out of the tab
       order and the accessibility tree, which the old translate-away drawer
       left exposed. Only meaningful below the drawer breakpoint — the CSS
       rule is scoped to that media query, so the class is inert on desktop. */
    const stow = () => siteNav.classList.add('is-stowed');
    const unstow = () => siteNav.classList.remove('is-stowed');

    const focusables = () =>
      Array.from(siteNav.querySelectorAll('a[href], button:not([disabled])'))
        .filter((el) => el.offsetParent !== null);

    const openNav = () => {
      if (isOpen) return;
      isOpen = true;
      clearTimeout(stowTimer);
      lastFocused = document.activeElement;

      // Pin the page. iOS Safari ignores overflow:hidden on body, so the
      // scroll offset is captured and reapplied as a negative top.
      scrollY = window.scrollY || window.pageYOffset || 0;
      document.body.style.top = `-${scrollY}px`;
      document.body.classList.add('nav-open');

      unstow();
      // Force a reflow so the browser registers the drawer at its off-screen
      // start position before .is-open transitions it in — without this the
      // display flip and the transform land in the same frame and it snaps.
      void siteNav.offsetWidth;

      siteNav.classList.add('is-open');
      backdrop.classList.add('is-visible');
      navToggle.setAttribute('aria-expanded', 'true');

      const first = focusables()[0];
      if (first) first.focus({ preventScroll: true });
    };

    const closeNav = (opts) => {
      if (!isOpen) return;
      isOpen = false;
      const instant = !!(opts && opts.instant);

      siteNav.classList.remove('is-open');
      backdrop.classList.remove('is-visible');
      navToggle.setAttribute('aria-expanded', 'false');

      // Release the page and put the reader back where they were.
      document.body.classList.remove('nav-open');
      document.body.style.top = '';
      window.scrollTo(0, scrollY);

      // Wait for the slide-out before pulling the drawer from the layout,
      // otherwise it vanishes mid-animation.
      clearTimeout(stowTimer);
      if (instant || prefersReducedMotion) stow();
      else stowTimer = setTimeout(stow, SLIDE_MS);

      if (lastFocused && document.contains(lastFocused)) {
        lastFocused.focus({ preventScroll: true });
      }
    };

    const toggleNav = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (isOpen) closeNav(); else openNav();
    };

    navToggle.addEventListener('click', toggleNav);
    backdrop.addEventListener('click', () => closeNav());
    siteNav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => closeNav({ instant: true }));
    });

    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { closeNav(); return; }
      if (e.key !== 'Tab') return;

      // Keep focus inside the drawer while it is open.
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !siteNav.contains(active))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus();
      }
    });

    // Rotating a phone or resizing past the breakpoint must not leave the
    // page pinned behind an invisible drawer.
    const syncToBreakpoint = () => {
      if (DRAWER_MQ.matches) {
        if (!isOpen) stow();
      } else {
        if (isOpen) closeNav({ instant: true });
        unstow();
      }
    };
    if (DRAWER_MQ.addEventListener) DRAWER_MQ.addEventListener('change', syncToBreakpoint);
    else DRAWER_MQ.addListener(syncToBreakpoint);            // Safari < 14
    syncToBreakpoint();
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
