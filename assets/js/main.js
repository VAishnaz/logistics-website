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
  const heroFirst = document.getElementById('heroFirst');
  const heroFinal = document.getElementById('heroFinal');
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

    /* ── Cinematic hero text: scroll-driven fade in/out ── */
    const p = lerpedProgress;

    if (heroFirst) {
      let firstOpacity, firstY;
      if (p < 0.05) {
        firstOpacity = 0;
        firstY = 30;
      } else if (p <= 0.15) {
        // Fade in from 0.05 to 0.15
        const t = (p - 0.05) / 0.10;
        const ease = 1 - Math.pow(1 - t, 3);
        firstOpacity = ease;
        firstY = (1 - ease) * 30;
      } else if (p <= 0.30) {
        // Stay visible from 0.15 to 0.30
        firstOpacity = 1;
        firstY = 0;
      } else if (p <= 0.45) {
        // Fade out from 0.30 to 0.45
        const t = (p - 0.30) / 0.15;
        const ease = t * t;
        firstOpacity = 1 - ease;
        firstY = -ease * 30; // Float upwards on fade out
      } else {
        firstOpacity = 0;
        firstY = -30;
      }
      heroFirst.style.opacity = firstOpacity;
      heroFirst.style.transform = `translateY(${firstY}px)`;
    }

    if (heroFinal) {
      let finalOpacity, finalY;
      if (p < 0.70) {
        finalOpacity = 0;
        finalY = 30;
      } else if (p <= 0.85) {
        const t = (p - 0.70) / 0.15;
        const ease = 1 - Math.pow(1 - t, 3);
        finalOpacity = ease;
        finalY = (1 - ease) * 30;
      } else {
        finalOpacity = 1;
        finalY = 0;
      }
      heroFinal.style.opacity = finalOpacity;
      heroFinal.style.transform = `translateY(${finalY}px)`;
    }

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

  if (heroFirst) {
    heroFirst.style.opacity = '0';
    heroFirst.style.transform = 'translateY(30px)';
  }

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
  const panelsLeft = document.querySelectorAll('.panel-left');
  const panelsRight = document.querySelectorAll('.panel-right');
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

    // Header: fade in from 0.02–0.15, stay until 0.35, fade out 0.35–0.50
    if (header) {
      let hOpacity, hY;
      if (p < 0.02) {
        hOpacity = 0; hY = 30;
      } else if (p <= 0.15) {
        const t = easeOutCubic((p - 0.02) / 0.13);
        hOpacity = t; hY = (1 - t) * 30;
      } else if (p <= 0.35) {
        hOpacity = 1; hY = 0;
      } else if (p <= 0.50) {
        const t = easeInCubic((p - 0.35) / 0.15);
        hOpacity = 1 - t; hY = -t * 25;
      } else {
        hOpacity = 0; hY = -25;
      }
      header.style.opacity = hOpacity;
      header.style.transform = `translateX(-50%) translateY(${hY}px)`;
    }

    // Left panels: slide in gradually across 0.25–0.75 range, staggered
    panelsLeft.forEach((panel, i) => {
      const start = 0.25 + i * 0.15;
      const end = start + 0.30;
      let pOpacity, pX;
      if (p < start) {
        pOpacity = 0; pX = -120;
      } else if (p <= end) {
        const t = easeOutCubic((p - start) / (end - start));
        pOpacity = t; pX = (1 - t) * -120;
      } else {
        pOpacity = 1; pX = 0;
      }
      panel.style.opacity = pOpacity;
      panel.style.transform = `translateX(${pX}px)`;
    });

    // Right panels: slide in gradually across 0.25–0.75 range, staggered
    panelsRight.forEach((panel, i) => {
      const start = 0.25 + i * 0.15;
      const end = start + 0.30;
      let pOpacity, pX;
      if (p < start) {
        pOpacity = 0; pX = 120;
      } else if (p <= end) {
        const t = easeOutCubic((p - start) / (end - start));
        pOpacity = t; pX = (1 - t) * 120;
      } else {
        pOpacity = 1; pX = 0;
      }
      panel.style.opacity = pOpacity;
      panel.style.transform = `translateX(${pX}px)`;
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
    10. PROCESS SECTION — Cinematic Cargo Drop & Motion
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
  gsap.set([cables, container], { y: -1200, opacity: 0 });
  gsap.set(shadow, { scale: 0.2, opacity: 0 });

  // 2. The "Cool" Dropping Animation
  // Triggered whenever the user enters the section from top or bottom
  let ambientTweens = [];

  const dropTL = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top 70%",
      end: "bottom 30%",
      toggleActions: "play none none reset", // Plays on enter, resets on leave back
      onEnter: () => dropTL.play(),
      onEnterBack: () => {
        // Reset state before playing again when coming from below
        gsap.set([cables, container], { y: -1200, opacity: 0 });
        gsap.set(shadow, { scale: 0.2, opacity: 0 });
        dropTL.restart();
      },
      onLeave: () => {
        // Optionally reset when leaving downwards so it can drop again if scrolling up
        gsap.set([cables, container], { y: -1200, opacity: 0 });
        ambientTweens.forEach(t => t.kill());
        ambientTweens = [];
      },
      onLeaveBack: () => {
        ambientTweens.forEach(t => t.kill());
        ambientTweens = [];
      }
    }
  });

  dropTL.to([cables, container], {
    y: 0,
    opacity: 1,
    duration: 1.8,
    ease: "expo.out",
    onStart: () => {
      // Subtle sound effect logic could go here
    }
  })
    .to(shadow, {
      opacity: 0.4,
      scale: 1,
      duration: 1.2,
      ease: "power2.out"
    }, "-=1.2")
    .to([cables, container], {
      y: 15,
      duration: 0.8,
      ease: "power1.inOut"
    })
    .to([cables, container], {
      y: 0,
      duration: 1.2,
      ease: "back.out(2)" // Small bounce back to neutral
    }, "-=0.2");

  // 3. Ambient Floating & Swinging (starts after drop)
  dropTL.add(() => {
    // Clear any existing just in case
    ambientTweens.forEach(t => t.kill());
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
  });

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
    // Clamp animation to finish at 0.6 progress, so it's static during settle and glide
    const animationProgress = Math.min(1, lerpedProgress / 0.6);
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

    // Content reveal timing: eyebrow(0.1), title(0.2), sub(0.35), btns(0.5)
    // Adjusted to finish by 0.6 for a long settle time before glide
    updateEl(eyebrow, p, 0.1, 0.25);
    updateEl(title, p, 0.25, 0.4);
    updateEl(sub, p, 0.4, 0.55);
    updateEl(btns, p, 0.55, 0.6);

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
