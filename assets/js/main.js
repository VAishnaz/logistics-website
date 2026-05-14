/* ─── Aetheris · main.js ─── */

/* ═══════════════════════════════════════════════════════════════
   0. LENIS SMOOTH SCROLL — The Foundation
   ═══════════════════════════════════════════════════════════════ */
const lenis = new Lenis({
  duration: 1.8,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -11 * t)),
  orientation: 'vertical',
  gestureOrientation: 'vertical',
  smoothWheel: true,
  wheelMultiplier: 1.1,
  smoothTouch: false,
  touchMultiplier: 2,
  infinite: false,
});

function lenisRaf(time) {
  lenis.raf(time);
  requestAnimationFrame(lenisRaf);
}
requestAnimationFrame(lenisRaf);

/* ═══════════════════════════════════════════════════════════════
   1. HERO VIDEO — Scroll-Driven Canvas-from-Video Scrub Engine
   ═══════════════════════════════════════════════════════════════
   Architecture:
   · Hidden <video> element as frame source (never displayed directly)
   · Visible <canvas> renders video frames via drawImage(video)
   · Canvas always retains the last drawn frame — zero flicker/glitch
   · Scroll position → normalised [0,1] via hero-scroll-wrapper bounds
   · rawProgress on scroll; lerpedProgress chased via RAF lerp
   · On seeked event → paint frame to canvas (async-safe)
   · Adaptive lerp: fast snap on large delta, silky-slow on small delta
═══════════════════════════════════════════════════════════════ */

(function heroImageEngine() {

  /* ── Config ── */
  const LERP_FACTOR = 0.06;
  const frameCount = 147;
  const imageDir = 'assets/hero images/';
  const imagePrefix = 'grok-video-433601d2-aaff-47b0-8855-ae21786426d4__1__';
  const imageExt = '.png';

  /* ── DOM ── */
  const canvas = document.getElementById('heroCanvas');
  const wrapper = document.getElementById('heroScrollWrapper');
  const heroBgText = document.getElementById('heroBgText');
  const heroLines = [
    document.getElementById('heroLine1'),
    document.getElementById('heroLine2'),
    document.getElementById('heroLine3'),
    document.getElementById('heroExplore')
  ];
  if (!canvas || !wrapper) return;
  const ctx = canvas.getContext('2d');

  /* ── State ── */
  let rawProgress = 0;
  let lerpedProgress = 0;
  let rafId = null;
  let images = [];
  let imagesLoaded = 0;
  let resizeTimer = null;
  let dpr = window.devicePixelRatio || 1;
  let W = window.innerWidth;
  let H = window.innerHeight;

  /* ── Image Preloading ── */
  function preloadImages() {
    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      const frameNum = i.toString().padStart(3, '0');
      img.src = `${imageDir}${imagePrefix}${frameNum}${imageExt}`;
      img.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === 1) {
          // Draw first frame as soon as it's ready
          requestAnimationFrame(drawFrame);
        }
      };
      images.push(img);
    }
  }

  /* ── Lerp ── */
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ── Resize canvas — retina-aware ── */
  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    alignLuxuryContent();
    drawFrame();
  }

  /* ── Align luxury content, nav-logo, and nav-cta with BG text edges ── */
  function alignLuxuryContent() {
    const luxuryContent = document.querySelector('.hero-luxury-content');
    const navLogo = document.querySelector('.nav-logo');
    const navCta = document.querySelector('.nav-cta');
    if (!heroBgText || !luxuryContent) return;

    const firstSpan = heroBgText.querySelector('span');
    const lastSpan = heroBgText.querySelector('span:last-child');
    if (firstSpan) {
      const rect = firstSpan.getBoundingClientRect();
      const parentRect = heroBgText.offsetParent.getBoundingClientRect();
      // Calculate position relative to parent with a subtle optical nudge to the right (+0.8vw)
      const targetLeft = (rect.left - parentRect.left) + (window.innerWidth * 0.008);
      luxuryContent.style.left = targetLeft + 'px';

      // Align nav-logo left edge with hero-bg-text left edge
      if (navLogo) {
        const navPadLeft = window.innerWidth * 0.05; // 5vw nav padding
        const logoOffset = rect.left - navPadLeft;
        navLogo.style.transform = 'translateX(' + logoOffset + 'px)';
      }
    }

    // Align nav-cta right edge with hero-bg-text right edge
    if (lastSpan && navCta) {
      const lastRect = lastSpan.getBoundingClientRect();
      const lastPadRight = 17;
      const heroTextRight = lastRect.right - lastPadRight;
      const navPadRight = window.innerWidth * 0.05; // 5vw nav padding
      const ctaCurrentRight = window.innerWidth - navPadRight;
      const ctaOffset = heroTextRight - ctaCurrentRight;
      navCta.style.setProperty('--cta-align-offset', ctaOffset + 'px');
    }
  }

  /* ── Draw current frame to canvas (cover-fit) ── */
  function drawFrame() {
    const frameIndex = Math.min(
      frameCount - 1,
      Math.floor(lerpedProgress * frameCount)
    );
    const img = images[frameIndex];

    if (!img || !img.complete) return;

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!iw || !ih) return;

    const scale = Math.max(W / iw, H / ih);
    // Subtle zoom-in effect as we scroll for more depth/flow
    const zoom = 1 + (lerpedProgress * 0.15);
    const finalScale = scale * zoom;

    const dw = iw * finalScale;
    const dh = ih * finalScale;
    const ox = (W - dw) * 0.5;
    const oy = (H - dh) * 0.5;

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, ox, oy, dw, dh);
  }

  /* ── RAF loop ── */
  function tick() {
    const delta = rawProgress - lerpedProgress;

    // Fluid, consistent lerp for 'momentum' feel
    const factor = LERP_FACTOR;
    lerpedProgress = lerp(lerpedProgress, rawProgress, factor);

    // Clamp residual drift
    if (Math.abs(rawProgress - lerpedProgress) < 0.0001) {
      lerpedProgress = rawProgress;
    }

    drawFrame();

    /* ── Cinematic hero text: scroll-driven parallax & fade ── */
    const p = lerpedProgress;

    if (heroBgText) {
      // Background word "VOYAGE" fades out as we scroll (from 0.6 to 0)
      const bgOpacity = 0.6 * (1 - Math.min(1, p / 0.6));
      heroBgText.style.opacity = bgOpacity;
    }

    heroLines.forEach((line, i) => {
      if (line) {
        // Uniform parallax upward for the whole block to prevent congestion
        const speed = 100;
        const yPos = -p * speed;

        // Fade out at the very end of the hero section scroll
        let opacity = 1;
        if (p > 0.8) {
          opacity = 1 - ((p - 0.8) / 0.2);
        }

        line.style.transform = `translateY(${yPos}px)`;
        line.style.opacity = opacity;
      }
    });

    rafId = requestAnimationFrame(tick);
  }

  /* ── Progress calculation ── */
  function updateProgress(scroll) {
    const wrapperTop = wrapper.offsetTop;
    const scrollRange = wrapper.offsetHeight - window.innerHeight;
    const currentScroll = scroll || window.scrollY;
    const into = currentScroll - wrapperTop;
    rawProgress = Math.max(0, Math.min(1, into / scrollRange));
  }

  lenis.on('scroll', (e) => {
    updateProgress(e.scroll);
  });

  /* ── Init ── */
  preloadImages();
  resizeCanvas();
  updateProgress();

  if (heroBgText) {
    heroBgText.style.opacity = '0.6';
  }
  heroLines.forEach(line => {
    if (line) {
      line.style.opacity = '1';
      line.style.transform = 'translateY(0px)';
    }
  });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 120);
  });

  rafId = requestAnimationFrame(tick);

})();


/* ═══════════════════════════════════════════
   2. NAVBAR — visibility & mobile toggle
═══════════════════════════════════════════ */
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');

// Scroll visibility logic: Hide navbar as soon as scrolling starts
gsap.registerPlugin(ScrollTrigger);

ScrollTrigger.create({
  start: "top -20px", // Triggers almost immediately after scroll starts
  onEnter: () => gsap.to(navbar, { y: -100, opacity: 0, duration: 0.5, ease: "power3.inOut" }),
  onLeaveBack: () => gsap.to(navbar, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" }),
});

lenis.on('scroll', (e) => {
  navbar.classList.toggle('scrolled', e.scroll > 60);
});

if (hamburger) {
  hamburger.addEventListener('click', () => {
    navbar.classList.toggle('active');
  });
}

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navbar.classList.remove('active');
  });
});


/* ═══════════════════════════════════════════
   3. SCROLL-REVEAL — IntersectionObserver
═══════════════════════════════════════════ */
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
revealEls.forEach(el => revealObs.observe(el));


/* ═══════════════════════════════════════════
    4. (Removed — Stats section replaced by Process)
═══════════════════════════════════════════ */


/* ═══════════════════════════════════════════
   5. SERVICES — Scroll-Scrubbed Canvas Engine
═══════════════════════════════════════════ */
(function servicesCanvasEngine() {

  /* ── Config ── */
  const LERP_FACTOR = 0.06;
  const startFrame = 17;   // First 16 frames are blank placeholders
  const endFrame = 140;
  const frameCount = endFrame - startFrame + 1; // 124 usable frames
  const imageDir = 'assets/services/';
  const imagePrefix = 'download_';
  const imageExt = '.png';

  /* ── DOM ── */
  const canvas = document.getElementById('servicesCanvas');
  const wrapper = document.getElementById('servicesScrollWrapper');
  const header = document.getElementById('servicesHeader');
  const serviceItems = document.querySelectorAll('.service-item');
  if (!canvas || !wrapper) return;
  const ctx = canvas.getContext('2d');

  /* ── State ── */
  let rawProgress = 0;
  let lerpedProgress = 0;
  let rafId = null;
  let images = [];
  let imagesLoaded = 0;
  let resizeTimer = null;
  let dpr = window.devicePixelRatio || 1;
  let W = window.innerWidth;
  let H = window.innerHeight;

  /* ── Image Preloading (only real frames 17–140) ── */
  function preloadImages() {
    for (let i = startFrame; i <= endFrame; i++) {
      const img = new Image();
      const frameNum = i.toString().padStart(3, '0');
      img.src = `${imageDir}${imagePrefix}${frameNum}${imageExt}`;
      img.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === 1) {
          // Draw first real frame immediately
          requestAnimationFrame(drawFrame);
        }
      };
      images.push(img);
    }
  }

  /* ── Lerp ── */
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ── Resize canvas — retina-aware ── */
  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFrame();
  }

  /* ── Draw current frame to canvas (cover-fit) ── */
  function drawFrame() {
    const frameIndex = Math.min(
      frameCount - 1,
      Math.floor(lerpedProgress * frameCount)
    );
    const img = images[frameIndex];

    if (!img || !img.complete) return;

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!iw || !ih) return;

    const scale = Math.max(W / iw, H / ih);
    // Subtle zoom-in effect for cinematic depth
    const zoom = 1 + (lerpedProgress * 0.12);
    const finalScale = scale * zoom;

    const dw = iw * finalScale;
    const dh = ih * finalScale;
    const ox = (W - dw) * 0.5;
    const oy = (H - dh) * 0.5;

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, ox, oy, dw, dh);
  }

  /* ── Easing helpers ── */
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInCubic(t) { return t * t * t; }

  /* ── RAF loop ── */
  function tick() {
    lerpedProgress = lerp(lerpedProgress, rawProgress, LERP_FACTOR);

    if (Math.abs(rawProgress - lerpedProgress) < 0.0001) {
      lerpedProgress = rawProgress;
    }

    drawFrame();

    /* ── Scroll-driven UI animations ── */
    const p = lerpedProgress;

    // Header: fade in early, fade out fast to clear stage for panels
    if (header) {
      let hOpacity, hY;
      if (p < 0.01) {
        hOpacity = 0; hY = 20;
      } else if (p <= 0.10) {
        const t = easeOutCubic((p - 0.01) / 0.09);
        hOpacity = t; hY = (1 - t) * 20;
      } else if (p <= 0.18) {
        hOpacity = 1; hY = 0;
      } else if (p <= 0.25) {
        const t = easeInCubic((p - 0.18) / 0.07);
        hOpacity = 1 - t; hY = -t * 20;
      } else {
        hOpacity = 0; hY = -20;
      }
      header.style.opacity = hOpacity;
      header.style.transform = `translateX(-50%) translateY(${hY}px)`;
    }

    // Service items: sequential stagger — each slides up from below, one after the other
    serviceItems.forEach((item, i) => {
      // Evenly spread across p 0.15 → 0.95, each item takes 0.18 of range
      const start = 0.15 + i * 0.18;
      const duration = 0.20;
      const end = start + duration;

      let iOpacity, iY;
      if (p < start) {
        iOpacity = 0; iY = 40;
      } else if (p <= end) {
        const t = easeOutCubic((p - start) / duration);
        iOpacity = t; iY = (1 - t) * 40;
      } else {
        iOpacity = 1; iY = 0;
      }
      item.style.opacity = iOpacity;
      item.style.transform = `translateY(${iY}px)`;
    });

    rafId = requestAnimationFrame(tick);
  }

  /* ── Progress calculation ── */
  /* Start animating as soon as the section enters the viewport bottom,
     so there's no blank "dead zone" before the scrub begins. */
  function updateProgress(scroll) {
    const wrapperTop = wrapper.offsetTop;
    const currentScroll = scroll || window.scrollY;
    // Animation begins when viewport bottom first touches wrapper top
    const viewStart = wrapperTop - window.innerHeight;
    const scrollRange = wrapper.offsetHeight;
    const into = currentScroll - viewStart;
    rawProgress = Math.max(0, Math.min(1, into / scrollRange));
  }

  lenis.on('scroll', (e) => {
    updateProgress(e.scroll);
  });

  /* ── Init ── */
  preloadImages();
  resizeCanvas();
  updateProgress();

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 120);
  });

  rafId = requestAnimationFrame(tick);

})();


/* ═══════════════════════════════════════════
   6. SMOOTH SCROLL — anchor links
═══════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = a.getAttribute('href');
    if (target && target !== '#') {
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0, duration: 1.5 });
    }
  });
});


/* ═══════════════════════════════════════════
   7. (Removed — scroll indicator no longer in DOM)
═══════════════════════════════════════════ */


/* ═══════════════════════════════════════════
   8. MAP CARDS — float animation
═══════════════════════════════════════════ */
document.querySelectorAll('.map-card').forEach((card, i) => {
  card.style.animation =
    `mapFloat ${3 + i * 0.8}s ease-in-out ${i * 0.5}s infinite alternate`;
});
if (!document.getElementById('mapFloatKF')) {
  const s = document.createElement('style');
  s.id = 'mapFloatKF';
  s.textContent = `
    @keyframes mapFloat {
      from { transform: translateY(0px); }
      to   { transform: translateY(-8px); }
    }
  `;
  document.head.appendChild(s);
}


/* ═══════════════════════════════════════════
    9. PROCESS PARTICLES
═══════════════════════════════════════════ */
(function initProcessParticles() {
  const container = document.getElementById('processParticles');
  if (!container) return;

  const count = 30;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';

    const size = Math.random() * 3 + 1;
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const delay = Math.random() * 5;
    const duration = 10 + Math.random() * 20;

    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${x}%`;
    p.style.top = `${y}%`;
    p.style.animation = `particleFloat ${duration}s linear ${delay}s infinite`;

    container.appendChild(p);
  }

  if (!document.getElementById('particleKF')) {
    const s = document.createElement('style');
    s.id = 'particleKF';
    s.textContent = `
      @keyframes particleFloat {
        0% { transform: translate(0, 0); opacity: 0; }
        10% { opacity: 0.3; }
        90% { opacity: 0.3; }
        100% { transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * -200 - 100}px); opacity: 0; }
      }
    `;
    document.head.appendChild(s);
  }
})();

/* ═══════════════════════════════════════════
    10. PROCESS SECTION — Scroll-Scrubbed Cargo Drop & Motion
═══════════════════════════════════════════ */
(function initProcessSection() {
  gsap.registerPlugin(ScrollTrigger);

  const section = document.querySelector('.process-section');
  const cables = document.getElementById('cargoCables');
  const container = document.getElementById('cargoContainer');
  const shadow = document.querySelector('.cargo-shadow');
  const steps = document.querySelectorAll('.workflow-step');

  if (!section || !cables || !container) return;

  // 1. Initial State: Hidden high above
  gsap.set([cables, container], { y: -900, opacity: 0 });
  gsap.set(shadow, { scale: 0.2, opacity: 0 });

  // Track ambient tweens so we can kill them when the user scrolls back
  let ambientTweens = [];
  let ambientStarted = false;

  // 2. Scroll-Scrubbed Drop — moves exactly at the user's scroll pace
  //    We widen the start/end points and increase scrub so it drops slower.
  gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top 95%",   // begins almost as soon as section appears
      end: "center center", // completes over a much longer scroll distance
      scrub: 1.5,         // higher scrub smoothing for a slower, heavier feel
      onLeave: () => {
        // Drop is fully complete — start the ambient idle motion
        if (!ambientStarted) {
          ambientStarted = true;
          startAmbient();
        }
      },
      onEnterBack: () => {
        // User scrolled back up — kill ambient so it doesn't fight scrub
        killAmbient();
        ambientStarted = false;
      },
      onLeaveBack: () => {
        killAmbient();
        ambientStarted = false;
      }
    }
  })
  .to([cables, container], {
    y: 0,
    opacity: 1,
    ease: "power1.out"   // gentler easing so it doesn't rush in at the start
  }, 0)
  .to(shadow, {
    opacity: 0.4,
    scale: 1,
    ease: "power1.out"
  }, 0);   // shadow grows in sync with the drop

  // 3. Ambient Floating & Swinging (starts after the scrubbed drop is done)
  function startAmbient() {
    ambientTweens = [];

    // Continuous Float
    ambientTweens.push(gsap.to(container, {
      y: "-=25",
      duration: 4,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true
    }));

    // Continuous Swing
    ambientTweens.push(gsap.to(container, {
      rotate: 1.5,
      duration: 5,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true
    }));

    // Shadow Sync
    ambientTweens.push(gsap.to(shadow, {
      scale: 0.8,
      opacity: 0.2,
      duration: 4,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true
    }));

    // Cables follow the container
    ambientTweens.push(gsap.to(cables, {
      y: "-=10",
      duration: 4,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true
    }));
  }

  function killAmbient() {
    ambientTweens.forEach(t => t.kill());
    ambientTweens = [];
  }

  // 4. Parallax Scroll Effect for Steps & Depth
  steps.forEach((step, i) => {
    const speed = (i + 1) * 40;
    gsap.fromTo(step,
      { y: 100 },
      {
        y: -speed,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.2
        }
      }
    );
  });

  // Parallax for the whole assembly to give depth as you scroll past it
  gsap.to([cables, container], {
    y: 50,
    ease: "none",
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom top",
      scrub: true
    }
  });

})();

/* ═══════════════════════════════════════════
    11. CTA — Cinematic Scroll-Scrubbed Canvas Engine
═══════════════════════════════════════════ */
(function ctaCanvasEngine() {

  /* ── Config ── */
  const LERP_FACTOR = 0.09;
  const frameCount = 137;
  const imageDir = 'assets/cta/';
  const imagePrefix = 'grok-video-442a59be-171a-482f-98ff-63f7652e3d95__1__';
  const imageExt = '.png';

  /* ── DOM ── */
  const canvas = document.getElementById('ctaCanvas');
  const wrapper = document.getElementById('ctaScrollWrapper');
  const eyebrow = document.getElementById('ctaEyebrow');
  const title = document.getElementById('ctaTitle');
  const sub = document.getElementById('ctaSub');
  const btns = document.getElementById('ctaBtns');

  if (!canvas || !wrapper) return;
  const ctx = canvas.getContext('2d');

  /* ── State ── */
  let rawProgress = 0;
  let lerpedProgress = 0;
  let rafId = null;
  let images = [];
  let imagesLoaded = 0;
  let resizeTimer = null;
  let dpr = window.devicePixelRatio || 1;
  let W = window.innerWidth;
  let H = window.innerHeight;

  /* ── Preloading ── */
  function preloadImages() {
    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      const frameNum = i.toString().padStart(3, '0');
      img.src = `${imageDir}${imagePrefix}${frameNum}${imageExt}`;
      img.onload = () => {
        imagesLoaded++;
        if (imagesLoaded === 1) requestAnimationFrame(drawFrame);
      };
      images.push(img);
    }
  }

  /* ── Canvas Logic ── */
  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFrame();
  }

  function drawFrame() {
    // Clamp animation to finish at 0.85 progress, so it's static during a short settle
    const animationProgress = Math.min(1, lerpedProgress / 0.85);
    const frameIndex = Math.min(frameCount - 1, Math.floor(animationProgress * frameCount));
    const img = images[frameIndex];
    if (!img || !img.complete) return;

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(W / iw, H / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const ox = (W - dw) * 0.5;
    const oy = (H - dh) * 0.5;

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, ox, oy, dw, dh);
  }

  /* ── Animation Loop ── */
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function tick() {
    lerpedProgress += (rawProgress - lerpedProgress) * LERP_FACTOR;
    if (Math.abs(rawProgress - lerpedProgress) < 0.0001) lerpedProgress = rawProgress;

    drawFrame();

    const p = lerpedProgress;

    // Content reveal timing: eyebrow(0.1), title(0.25), sub(0.45), btns(0.65)
    // Adjusted to finish by 0.85 for a balanced scroll experience
    updateEl(eyebrow, p, 0.1, 0.25);
    updateEl(title, p, 0.25, 0.45);
    updateEl(sub, p, 0.45, 0.65);
    updateEl(btns, p, 0.65, 0.8);

    rafId = requestAnimationFrame(tick);
  }

  function updateEl(el, p, start, end) {
    if (!el) return;
    let opacity = 0, y = 20;
    if (p > start) {
      const t = Math.min(1, (p - start) / (end - start));
      const ease = easeOutCubic(t);
      opacity = ease;
      y = (1 - ease) * 20;
    }
    el.style.opacity = opacity;
    el.style.transform = `translateY(${y}px)`;
  }

  /* ── Scroll handling ── */
  function updateProgress(scroll) {
    const wrapperTop = wrapper.offsetTop;
    const currentScroll = scroll || window.scrollY;
    const viewStart = wrapperTop - window.innerHeight;
    const scrollRange = wrapper.offsetHeight;
    const into = currentScroll - viewStart;
    rawProgress = Math.max(0, Math.min(1, into / scrollRange));
  }

  lenis.on('scroll', (e) => updateProgress(e.scroll));

  /* ── Init ── */
  preloadImages();
  resizeCanvas();
  updateProgress();
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 120);
  });
  rafId = requestAnimationFrame(tick);

})();

/* ── Liquid Glass Interaction ── */
document.querySelectorAll('.service-panel').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--mouse-x', `${x}%`);
    card.style.setProperty('--mouse-y', `${y}%`);
  });
});
