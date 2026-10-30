/* =========================================================
   DBM Desentupidora — interações e animações
   ========================================================= */
(() => {
  const DATA = window.SITE || {};
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const mm = (q) => matchMedia(q).matches;
  const reduced = mm("(prefers-reduced-motion: reduce)");
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  /* ---------- WhatsApp, telefone e ano ---------- */
  const wa = (msg) => `https://wa.me/${DATA.whatsapp}?text=${encodeURIComponent(msg)}`;
  $$("[data-wa]").forEach((a) => {
    const m = a.dataset.msg;
    a.href = wa(m ? `Olá, DBM! Vim pelo site e preciso de orçamento para ${m}.` : DATA.whatsappMessage);
    a.target = "_blank"; a.rel = "noopener";
  });
  $$("[data-tel]").forEach((a) => (a.href = `tel:${DATA.telefone}`));
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Relógio do HUD do hero ---------- */
  const hud = $("#hudTime"), t0 = Date.now();
  setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    hud.textContent = [s / 3600, (s / 60) % 60, s % 60].map((v) => String(Math.floor(v)).padStart(2, "0")).join(":");
  }, 1000);

  /* ---------- Chip de status nas ilustrações dos serviços ---------- */
  $$(".svc__visual").forEach((v) => {
    const chip = document.createElement("span");
    chip.className = "svc__chip";
    chip.innerHTML = "<i></i><b>Entupido</b>";
    v.appendChild(chip);
  });
  // sincroniza o texto do chip com o relógio SMIL de cada SVG (ciclo de 8 s)
  const chipStates = [[0, "Entupido", "#ec3235"], [0.15, "Desentupindo", "#f5a524"], [0.62, "Liberado", "#25d366"], [0.95, "Entupido", "#ec3235"]];
  function syncChips() {
    $$(".svc.is-in").forEach((s) => {
      const svg = $("svg.scene", s), chip = $(".svc__chip", s);
      if (!svg || !svg.getCurrentTime) return;
      const f = (svg.getCurrentTime() % 8) / 8;
      let st = chipStates[0];
      for (const c of chipStates) if (f >= c[0]) st = c;
      if (chip.dataset.st !== st[1]) { chip.dataset.st = st[1]; $("b", chip).textContent = st[1]; chip.style.setProperty("--c", st[2]); }
    });
    requestAnimationFrame(syncChips);
  }
  requestAnimationFrame(syncChips);

  // pausa as animações SVG fora da tela
  const svcIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    const svg = $("svg.scene", e.target);
    e.target.classList.toggle("is-in", e.isIntersecting);
    try { e.isIntersecting ? svg.unpauseAnimations() : svg.pauseAnimations(); } catch (_) {}
  }), { threshold: 0.15 });
  $$(".svc").forEach((s) => { try { $("svg.scene", s).pauseAnimations(); } catch (_) {} svcIO.observe(s); });

  // brilho que segue o mouse nos cartões
  $$(".svc").forEach((c) => c.addEventListener("pointermove", (e) => {
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", `${e.clientX - r.left}px`);
    c.style.setProperty("--my", `${e.clientY - r.top}px`);
  }));

  /* ---------- FAQ: só uma aberta por vez, com animação ---------- */
  $$(".qa").forEach((d) => {
    const sum = $("summary", d), body = $(".qa__a", d);
    sum.addEventListener("click", (e) => {
      e.preventDefault();
      const opening = !d.open;
      $$(".qa[open]").forEach((o) => { if (o !== d) close(o); });
      opening ? open(d) : close(d);
    });
    function open(el) {
      el.open = true;
      const b = $(".qa__a", el);
      if (window.gsap && !reduced) gsap.fromTo(b, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: .55, ease: "expo.out", onComplete: () => window.ScrollTrigger?.refresh() });
    }
    function close(el) {
      const b = $(".qa__a", el);
      if (window.gsap && !reduced) gsap.to(b, { height: 0, opacity: 0, duration: .4, ease: "power2.inOut", onComplete: () => { el.open = false; b.style.height = ""; b.style.opacity = ""; window.ScrollTrigger?.refresh(); } });
      else el.open = false;
    }
  });

  /* ---------- Menu mobile ---------- */
  let lenis = null;
  const burger = $(".nav__burger"), menu = $(".mobile-menu");
  const setMenu = (open) => {
    burger.setAttribute("aria-expanded", open);
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", !open);
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* ---------- Água animada no CTA final ---------- */
  (() => {
    const cv = $("#ctaWater"); if (!cv) return;
    const ctx = cv.getContext("2d");
    let vis = false, t = 0;
    new IntersectionObserver(([e]) => (vis = e.isIntersecting)).observe(cv);
    const loop = () => {
      requestAnimationFrame(loop);
      if (!vis) return;
      const w = (cv.width = cv.clientWidth), h = (cv.height = cv.clientHeight);
      t += 0.016;
      const layers = [["rgba(36,164,218,.08)", 0.62, 1, 18], ["rgba(36,164,218,.12)", 0.76, 1.4, 14], ["rgba(127,214,255,.08)", 0.88, 1.9, 10]];
      layers.forEach(([c, base, sp, amp]) => {
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 12) ctx.lineTo(x, h * base + Math.sin(x * 0.006 + t * sp) * amp + Math.sin(x * 0.013 - t * sp * 1.3) * amp * 0.5);
        ctx.lineTo(w, h); ctx.fill();
      });
    };
    if (!reduced) loop();
  })();

  /* ---------- Sem GSAP ou movimento reduzido: conteúdo estático ---------- */
  const loader = $(".loader");
  if (!hasGsap || reduced) {
    document.documentElement.classList.add("reduced");
    loader.remove();
    $(".wa-float").classList.add("is-visible");
    window.__howto = { p: 1 };
    $$(".hstep").forEach((s) => { s.classList.add("is-active"); s.style.position = "relative"; s.style.marginBottom = "24px"; });
    $(".howto__steps").style.minHeight = "0";
    $$(".st").forEach((s, i) => s.classList.toggle("is-on", i === 3));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Scroll suave ---------- */
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    window.__lenis = lenis;
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    const target = id.length > 1 && $(id);
    if (!target) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(target, { offset: id === "#inicio" ? 0 : -70, duration: 1.6 }) : target.scrollIntoView({ behavior: "smooth" });
  }));

  /* ---------- Títulos divididos em palavras ---------- */
  $$(".split").forEach((el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span"); w.className = "w";
            const i = document.createElement("span"); i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
  });

  /* ---------- Loader + entrada do hero ---------- */
  document.body.classList.add("is-loading");
  const num = $("#loaderNum");
  const counter = { v: 0 };
  gsap.set(".hero__title .line > span", { yPercent: 115, rotate: 3 });
  gsap.set(".water-word", { "--uw": 0 });
  const intro = gsap.timeline({ paused: true });
  intro
    .to(".loader__fill", { attr: { y: 0 }, duration: .5, ease: "power2.out" })
    .to(".loader", { clipPath: "circle(0% at 50% 50%)", duration: 1.1, ease: "expo.inOut" }, "+=.1")
    .from("#tubo-3d", { scale: 1.25, opacity: 0, duration: 2, ease: "expo.out" }, "-=.7")
    .to(".hero__title .line > span", { yPercent: 0, rotate: 0, duration: 1.3, stagger: .1, ease: "expo.out" }, "-=1.7")
    .to(".water-word", { "--uw": 1, duration: 1.2, ease: "expo.inOut" }, "-=.8")
    .to(".hero .reveal-up", { opacity: 1, y: 0, duration: 1, stagger: .08, ease: "expo.out" }, "-=1.3")
    .from(".nav", { yPercent: -100, opacity: 0, duration: 1, ease: "expo.out" }, "-=1.1")
    .from(".hero__hud", { opacity: 0, duration: 1 }, "-=1")
    .add(() => {
      document.body.classList.remove("is-loading");
      loader.remove();
      lenis && lenis.start();
    }, "-=.8");
  gsap.set(".loader", { clipPath: "circle(75% at 50% 50%)" });
  gsap.to(counter, {
    v: 100, duration: 1.6, ease: "power2.inOut",
    onUpdate: () => {
      num.textContent = Math.round(counter.v);
      gsap.set(".loader__fill", { attr: { y: 110 - counter.v * 0.9 } });
    },
    onComplete: () => intro.play(),
  });

  /* ---------- Nav, barra de progresso, WhatsApp flutuante ---------- */
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (self) => {
      $(".nav").classList.toggle("is-scrolled", self.scroll() > 40);
      $(".wa-float").classList.toggle("is-visible", self.scroll() > innerHeight * 0.6);
      gsap.set(".progress span", { scaleX: self.progress });
    },
  });

  /* ---------- Hero: parallax e aceleração da câmera ---------- */
  gsap.to(".hero__content", { yPercent: -18, opacity: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  ScrollTrigger.create({ trigger: ".hero", start: "top top", end: "bottom top", onUpdate: (s) => (window.__heroBoost = s.progress) });

  /* ---------- Revelações genéricas ---------- */
  $$(".reveal-up").forEach((el) => {
    if (el.closest(".hero")) return;
    gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });
  $$(".split").forEach((el) => {
    gsap.from($$(".w > span", el), { yPercent: 110, duration: 1.1, stagger: .05, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%" } });
  });

  // clientes
  gsap.from(".client", { y: 60, opacity: 0, rotateX: -40, duration: 1.2, stagger: .1, ease: "expo.out", scrollTrigger: { trigger: ".clients__row", start: "top 90%" } });

  // serviços: cortina revelando o visual
  $$(".svc").forEach((s) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: s, start: "top 85%" } });
    tl.from(s, { y: 80, opacity: 0, duration: 1.1, ease: "expo.out" })
      .fromTo($(".svc__visual", s), { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", duration: 1.3, ease: "expo.inOut" }, "-=.9")
      .from($$(".svc__body > *", s), { y: 24, opacity: 0, duration: .8, stagger: .06, ease: "expo.out" }, "-=1.1");
  });

  // diferenciais
  gsap.fromTo(".reveal-card", { opacity: 0, y: 70, rotate: (i) => (i % 2 ? 3 : -3) }, { opacity: 1, y: 0, rotate: 0, duration: 1.2, stagger: .12, ease: "expo.out", scrollTrigger: { trigger: ".why__grid", start: "top 85%" } });

  // mapa
  gsap.fromTo(".reveal-map", { opacity: 0, scale: .9, clipPath: "circle(10% at 50% 50%)" }, { opacity: 1, scale: 1, clipPath: "circle(75% at 50% 50%)", duration: 1.6, ease: "expo.inOut", scrollTrigger: { trigger: ".area__map", start: "top 80%" } });

  // rodapé
  gsap.from(".footer__giant", { yPercent: 40, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".footer", start: "top 85%" } });

  /* ---------- Como funciona: seção pinada controlando o canvas ---------- */
  const steps = $$(".hstep"), sts = $$(".st");
  const howto = (window.__howto ||= { p: 0 });
  let curStep = 0;
  ScrollTrigger.create({
    trigger: ".howto",
    start: "top top",
    end: () => "+=" + innerHeight * 3.2,
    pin: ".howto__pin",
    scrub: true,
    anticipatePin: 1,
    onUpdate: (self) => {
      howto.p = self.progress;
      gsap.set(".howto__bar span", { scaleX: self.progress });
      const i = Math.min(3, Math.floor(self.progress * 4 + 0.0001));
      if (i !== curStep) {
        curStep = i;
        steps.forEach((s, k) => s.classList.toggle("is-active", k === i));
        sts.forEach((s, k) => s.classList.toggle("is-on", k === i));
      }
    },
  });

  /* ---------- Botões magnéticos ---------- */
  if (mm("(hover: hover)")) {
    $$(".magnetic").forEach((b) => {
      const qx = gsap.quickTo(b, "x", { duration: .5, ease: "power3" }), qy = gsap.quickTo(b, "y", { duration: .5, ease: "power3" });
      b.addEventListener("pointermove", (e) => { const r = b.getBoundingClientRect(); qx((e.clientX - r.left - r.width / 2) * .25); qy((e.clientY - r.top - r.height / 2) * .35); });
      b.addEventListener("pointerleave", () => { qx(0); qy(0); });
    });
  }

  addEventListener("load", () => ScrollTrigger.refresh());
})();
