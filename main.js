  // Hero video: play then fade out to reveal logo
  const heroVideo = document.querySelector('.hero-video');
  const heroLogo  = document.querySelector('.hero-logo');
  const heroBlack = document.querySelector('.hero-black');

  function showLogo() {
    if (!heroLogo) return;
    heroLogo.querySelectorAll('.neon-path').forEach(el => {
      el.style.animation = 'none';
      el.getBoundingClientRect();
      el.style.animation = '';
    });
    heroLogo.style.transition = 'opacity 0.4s ease';
    heroLogo.style.opacity = '1';
    setTimeout(() => { if (heroBlack) heroBlack.style.opacity = '0'; }, 2500);
  }

  if (heroVideo) {
    // Fallback: show logo after 8s regardless (covers slow connections)
    const logoTimer = setTimeout(showLogo, 8000);

    // Show video as soon as browser has enough data to play.
    // Also check readyState immediately in case canplay already fired before this script ran.
    function startVideo() {
      heroVideo.style.opacity = '1';
      heroVideo.play().catch(() => {});
    }
    if (heroVideo.readyState >= 3) {
      startVideo();
    } else {
      heroVideo.addEventListener('canplay', startVideo, { once: true });
    }

    // If video errors, skip straight to logo
    heroVideo.addEventListener('error', () => {
      clearTimeout(logoTimer);
      showLogo();
    }, { once: true });

    // Fade out 1.5s before end so video keeps playing through the transition
    const FADE_BEFORE_END = 1.5;
    let fadingOut = false;
    heroVideo.addEventListener('timeupdate', () => {
      if (!fadingOut && heroVideo.duration && heroVideo.currentTime >= heroVideo.duration - FADE_BEFORE_END) {
        fadingOut = true;
        clearTimeout(logoTimer);
        heroVideo.style.opacity = '0';
        showLogo();
      }
    });
  } else {
    showLogo();
  }

  // Hide scroll indicator on scroll
  const scrollIndicator = document.querySelector('.hero-scroll');

  if (scrollIndicator) {
    // Once the fade-in animation finishes, remove it so JS can control opacity freely
    scrollIndicator.addEventListener('animationend', () => {
      scrollIndicator.style.animation = 'none';
      scrollIndicator.style.opacity = '1';
    }, { once: true });
  }

  const nav = document.querySelector('nav');
  let lastScrollY = 0;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;

    // Hide nav on scroll down, show on scroll up
    if (y > lastScrollY && y > 80) {
      nav.classList.add('nav--hidden');
    } else {
      nav.classList.remove('nav--hidden');
    }
    lastScrollY = y;

    // Hide scroll indicator once user starts scrolling
    if (scrollIndicator) {
      if (y > 0) {
        scrollIndicator.style.opacity = '0';
        scrollIndicator.style.pointerEvents = 'none';
      } else {
        scrollIndicator.style.opacity = '1';
        scrollIndicator.style.pointerEvents = '';
      }
    }
  }, { passive: true });

  // Set each path's dasharray/dashoffset to its real length so the draw animation completes fully
  document.querySelectorAll('.neon-path').forEach(path => {
    const len = Math.ceil(path.getTotalLength());
    path.style.setProperty('--path-length', len);
  });

  // Build about-panel logo by cloning the hero SVG (avoids duplicating hundreds of lines of markup)
  const heroSvg = document.querySelector('.hero-logo svg');
  const aboutWrap = document.getElementById('aboutLogoWrap');

  if (heroSvg && aboutWrap) {
    (function buildAboutLogo() {
      const clone = heroSvg.cloneNode(true);
      // Rename filter ID to avoid document-level collision
      // Swap class + path IDs so the about-panel rules in style.css apply
      clone.querySelectorAll('.neon-path').forEach(el => {
        el.classList.replace('neon-path', 'neon-path-about');
        if (/^p\d/.test(el.id)) el.id = 'a' + el.id;
      });
      aboutWrap.appendChild(clone);
    })();

    // Replay animation when section scrolls into view
    let played = false;
    new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !played) {
          played = true;
          const svg = aboutWrap.querySelector('svg');
          if (svg) aboutWrap.replaceChild(svg.cloneNode(true), svg);
        }
      });
    }, { threshold: 0.3 }).observe(aboutWrap);
  }

  // Hamburger menu
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileMenu = document.querySelector('.nav-mobile-menu');
  if (hamburger && mobileMenu) {
    function closeMenu() {
      hamburger.classList.remove('is-open');
      mobileMenu.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
    hamburger.addEventListener('click', () => {
      const opening = !hamburger.classList.contains('is-open');
      hamburger.classList.toggle('is-open');
      mobileMenu.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', String(opening));
      document.body.style.overflow = opening ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  }

  // Contact form — validation + Netlify AJAX submission
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    const errorName    = document.getElementById('error-name');
    const errorEmail   = document.getElementById('error-email');
    const errorMessage = document.getElementById('error-message');
    const formSuccess  = document.getElementById('formSuccess');
    const emailRegex   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function setError(el, msg) { if (el) el.textContent = msg; }
    function clearErrors() {
      [errorName, errorEmail, errorMessage].forEach(el => { if (el) el.textContent = ''; });
    }

    // Clear errors as user types
    contactForm.querySelectorAll('input, textarea').forEach(el => {
      el.addEventListener('input', clearErrors);
    });

    contactForm.addEventListener('submit', async e => {
      e.preventDefault();
      clearErrors();

      const name    = contactForm.querySelector('[name="name"]').value.trim();
      const email   = contactForm.querySelector('[name="email"]').value.trim();
      const message = contactForm.querySelector('[name="message"]').value.trim();
      let valid = true;

      if (!name)               { setError(errorName,    'Name is required.');           valid = false; }
      if (!email)              { setError(errorEmail,   'Email is required.');           valid = false; }
      else if (!emailRegex.test(email)) { setError(errorEmail, 'Enter a valid email.'); valid = false; }
      if (!message)            { setError(errorMessage, 'Message is required.');         valid = false; }
      if (!valid) return;

      const submitBtn = contactForm.querySelector('[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      try {
        const data = new FormData(contactForm);
        await fetch('/', { method: 'POST', body: new URLSearchParams(data).toString(),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        contactForm.reset();
        formSuccess.classList.add('visible');
        submitBtn.style.display = 'none';
      } catch {
        setError(errorMessage, 'Something went wrong. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
    });
  }
