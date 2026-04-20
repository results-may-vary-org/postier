document.addEventListener('DOMContentLoaded', () => {

  // =========================================
  // Init Lucide icons
  // =========================================
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // =========================================
  // Nav: add .scrolled class on scroll
  // =========================================
  const nav = document.getElementById('nav');
  if (nav && !nav.classList.contains('scrolled')) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // =========================================
  // Hero entrance animations
  // =========================================
  if (document.querySelector('.hero__title')) {

    // Title slams down from above
    anime({
      targets: '.hero__title',
      opacity: [0, 1],
      translateY: [50, 0],
      duration: 900,
      easing: 'easeOutExpo',
      delay: 100,
    });

    // Sub text and CTAs stagger in
    anime({
      targets: ['.hero__sub', '.hero__actions', '.hero__desc'],
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 600,
      easing: 'easeOutCubic',
      delay: anime.stagger(80, { start: 450 }),
    });

    // Screenshot fades up
    anime({
      targets: '.hero__screenshot-section',
      opacity: [0, 1],
      translateY: [24, 0],
      duration: 700,
      easing: 'easeOutCubic',
      delay: 650,
    });
  }

  // =========================================
  // Scroll-reveal via IntersectionObserver
  // =========================================
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;

      // Feature cards — stagger by their index
      if (el.classList.contains('feature-card')) {
        const idx = parseInt(el.dataset.revealIdx || '0', 10);
        anime({
          targets: el,
          opacity: [0, 1],
          translateY: [22, 0],
          duration: 580,
          delay: idx * 70,
          easing: 'easeOutCubic',
        });

      // Format items — stagger too
      } else if (el.classList.contains('format-item')) {
        const idx = parseInt(el.dataset.revealIdx || '0', 10);
        anime({
          targets: el,
          opacity: [0, 1],
          translateY: [16, 0],
          duration: 500,
          delay: idx * 90,
          easing: 'easeOutCubic',
        });

      // Generic reveal
      } else if (el.classList.contains('anim-reveal')) {
        anime({
          targets: el,
          opacity: [0, 1],
          translateY: [24, 0],
          duration: 650,
          easing: 'easeOutCubic',
        });
      }

      revealObserver.unobserve(el);
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px',
  });

  // Assign indices and observe feature cards
  document.querySelectorAll('.feature-card').forEach((card, i) => {
    card.dataset.revealIdx = i;
    revealObserver.observe(card);
  });

  // Assign indices and observe format items
  document.querySelectorAll('.format-item').forEach((item, i) => {
    item.dataset.revealIdx = i;
    // start with hidden state for JS-enhanced experience
    item.style.opacity = '0';
    item.style.transform = 'translateY(16px)';
    revealObserver.observe(item);
  });

  // Observe generic reveal elements
  document.querySelectorAll('.anim-reveal').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    revealObserver.observe(el);
  });

  // =========================================
  // Docs sidebar — active link on scroll
  // =========================================
  const sidebar = document.getElementById('docs-sidebar');
  if (sidebar) {
    const sidebarLinks = sidebar.querySelectorAll('.docs-sidebar__link');
    const sectionIds = Array.from(sidebarLinks)
      .map(a => a.getAttribute('href'))
      .filter(h => h && h.startsWith('#'))
      .map(h => h.slice(1));

    const sectionEls = sectionIds
      .map(id => document.getElementById(id))
      .filter(Boolean);

    /** Update active link to match the topmost visible section */
    const updateActive = () => {
      let current = sectionIds[0];
      for (const el of sectionEls) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) current = el.id;
      }
      sidebarLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
      });
    };

    window.addEventListener('scroll', updateActive, { passive: true });
    updateActive();
  }

});
