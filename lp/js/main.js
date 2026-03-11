(() => {
  'use strict';

  // ========== Scroll Animations (IntersectionObserver) ==========
  const animatedEls = document.querySelectorAll('[data-animate]');
  if (animatedEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    animatedEls.forEach((el) => observer.observe(el));
  }

  // ========== Navbar Scroll State ==========
  const navbar = document.getElementById('navbar');
  let lastScroll = 0;

  function updateNavbar() {
    const scrollY = window.scrollY;
    if (scrollY > 60) {
      navbar.classList.add('navbar--scrolled');
    } else {
      navbar.classList.remove('navbar--scrolled');
    }
    lastScroll = scrollY;
  }

  window.addEventListener('scroll', updateNavbar, { passive: true });
  updateNavbar();

  // ========== Mobile Drawer ==========
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const drawer = document.getElementById('drawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const drawerClose = document.getElementById('drawerClose');

  function openDrawer() {
    drawer.classList.add('drawer--open');
    drawerOverlay.classList.add('drawer-overlay--open');
    hamburgerBtn.classList.add('navbar__hamburger--open');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.remove('drawer--open');
    drawerOverlay.classList.remove('drawer-overlay--open');
    hamburgerBtn.classList.remove('navbar__hamburger--open');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburgerBtn.addEventListener('click', () => {
    const isOpen = drawer.classList.contains('drawer--open');
    isOpen ? closeDrawer() : openDrawer();
  });

  drawerClose.addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);

  // Close drawer on link click
  drawer.querySelectorAll('.drawer__link').forEach((link) => {
    link.addEventListener('click', closeDrawer);
  });

  // ========== Steps Auto-Advance + Click ==========
  const stepsItems = document.querySelectorAll('.steps__item');
  const stepsMocks = document.querySelectorAll('.steps__mock');
  let currentStep = 0;
  let stepsInterval;

  function setActiveStep(index) {
    stepsItems.forEach((item, i) => {
      item.classList.toggle('steps__item--active', i === index);
    });
    stepsMocks.forEach((mock, i) => {
      mock.classList.toggle('steps__mock--active', i === index);
    });
    currentStep = index;
  }

  function startStepsAutoAdvance() {
    stepsInterval = setInterval(() => {
      setActiveStep((currentStep + 1) % stepsItems.length);
    }, 4000);
  }

  stepsItems.forEach((item) => {
    item.addEventListener('click', () => {
      clearInterval(stepsInterval);
      setActiveStep(parseInt(item.dataset.step, 10));
      startStepsAutoAdvance();
    });
  });

  if (stepsItems.length) {
    startStepsAutoAdvance();
  }

  // ========== FAQ Smooth Animation ==========
  document.querySelectorAll('.faq__item').forEach((details) => {
    const summary = details.querySelector('.faq__question');
    const answer = details.querySelector('.faq__answer');

    summary.addEventListener('click', (e) => {
      e.preventDefault();

      if (details.open) {
        // Close
        answer.style.maxHeight = answer.scrollHeight + 'px';
        requestAnimationFrame(() => {
          answer.style.maxHeight = '0';
          answer.style.opacity = '0';
        });
        answer.addEventListener(
          'transitionend',
          () => {
            details.open = false;
            answer.style.maxHeight = '';
            answer.style.opacity = '';
          },
          { once: true }
        );
      } else {
        // Open
        details.open = true;
        const height = answer.scrollHeight;
        answer.style.maxHeight = '0';
        answer.style.opacity = '0';
        requestAnimationFrame(() => {
          answer.style.maxHeight = height + 'px';
          answer.style.opacity = '1';
        });
        answer.addEventListener(
          'transitionend',
          () => {
            answer.style.maxHeight = '';
            answer.style.opacity = '';
          },
          { once: true }
        );
      }
    });

    // Style the answer for transitions
    answer.style.overflow = 'hidden';
    answer.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
  });

  // ========== Smooth Scroll for Anchor Links ==========
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = navbar.offsetHeight + 16;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
})();
