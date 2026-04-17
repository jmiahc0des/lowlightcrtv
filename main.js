  // Hero video: play first ~4.5s then fade out to reveal logo
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
    // Fallback: if video hasn't started playing within 3s, show logo anyway
    const fallbackTimer = setTimeout(() => {
      heroVideo.style.opacity = '0';
      showLogo();
    }, 3000);

    heroVideo.addEventListener('loadedmetadata', () => { heroVideo.currentTime = 6.5; }, { once: true });
    heroVideo.addEventListener('seeked', () => {
      clearTimeout(fallbackTimer);
      heroVideo.style.opacity = '1';
    }, { once: true });

    // Also clear fallback on error
    heroVideo.addEventListener('error', () => {
      clearTimeout(fallbackTimer);
      showLogo();
    }, { once: true });

    const VIDEO_END = 11;
    const FADE_DUR  = 1500;
    let fadingOut = false;

    function onVideoProgress() {
      if (!fadingOut && heroVideo.currentTime >= VIDEO_END - FADE_DUR / 1000) {
        fadingOut = true;
        heroVideo.style.opacity = '0';
        showLogo();
      }
      if (heroVideo.currentTime >= VIDEO_END) {
        heroVideo.removeEventListener('timeupdate', onVideoProgress);
        heroVideo.pause();
      }
    }
    heroVideo.addEventListener('timeupdate', onVideoProgress);
  } else {
    // No video element at all — show logo immediately
    showLogo();
  }

  // Hide scroll indicator on scroll
  const scrollIndicator = document.querySelector('.hero-scroll');

  // Once the fade-in animation finishes, remove it so JS can control opacity freely
  scrollIndicator.addEventListener('animationend', () => {
    scrollIndicator.style.animation = 'none';
    scrollIndicator.style.opacity = '1';
  }, { once: true });

  window.addEventListener('scroll', () => {
    if (window.scrollY > 0) {
      scrollIndicator.style.opacity = '0';
      scrollIndicator.style.pointerEvents = 'none';
    } else {
      scrollIndicator.style.opacity = '1';
      scrollIndicator.style.pointerEvents = '';
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

  (function buildAboutLogo() {
    const clone = heroSvg.cloneNode(true);
    // Rename filter ID to avoid document-level collision
    clone.querySelectorAll('defs').forEach(d => {
      d.innerHTML = d.innerHTML.replace(/id="neonGlow"/g, 'id="neonGlow2"');
    });
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
