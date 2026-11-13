/* Animações de rolagem da landing (index.html): GSAP + ScrollTrigger +
   SplitText, com rolagem suave (Lenis) só em computadores com folga.
   Sem GSAP (CDN fora do ar) ou com "reduzir movimento" ligado no sistema,
   cai num fade-up simples em CSS (.reveal).

   Otimização: só opacity/transform são animados (rodam na GPU), nada de
   filtros animados, e a ampulheta 3D (js/ampulheta-3d.js) só desenha
   quando a rolagem muda — ela lê o progresso em window.chronoGaleria. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var maquinaModesta = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory || 8) <= 2;
  var lenis = null;
  var textosOriginais = [];

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ── Seta "Rolar" do hero ─────────────────────────────────── */
  function rolarAte(seletor) {
    var el = $(seletor);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.8 });
    else el.scrollIntoView({ behavior: reduzirMovimento ? "auto" : "smooth" });
  }

  var seta = $(".hero-scroll-arrow");
  if (seta) {
    seta.addEventListener("click", function () { rolarAte("#recursos"); });
    seta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); rolarAte("#recursos"); }
    });
  }

  /* ── Modo simples (sem GSAP): fade-up em CSS ──────────────── */
  function revelarSemGsap() {
    root.classList.remove("js-anim");
    textosOriginais.forEach(function (par) { par[0].textContent = par[1]; });
    var reveals = $$(".reveal");
    if (reduzirMovimento || !("IntersectionObserver" in window)) {
      reveals.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      var ordem = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.style.setProperty("--reveal-delay", Math.min(ordem, 4) * 0.12 + "s");
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
        ordem++;
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { observer.observe(el); });
  }

  if (reduzirMovimento || !window.gsap || !window.ScrollTrigger) {
    revelarSemGsap();
    return;
  }

  // Se a CDN demorou mais que o timeout do <head>, a classe já foi removida;
  // sem ela o .reveal volta a ter opacidade 0 e o GSAP animaria até 0.
  root.classList.add("js-anim");

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  var temSplit = !!window.SplitText;
  if (temSplit) gsap.registerPlugin(window.SplitText);

  if (window.Lenis && !maquinaModesta) {
    lenis = new window.Lenis({ duration: 1.4, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (tempo) { lenis.raf(tempo * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ── Utilitários ──────────────────────────────────────────── */
  function palavras(el) {
    if (!el) return [];
    if (!temSplit) return [el];
    return window.SplitText.create(el, { type: "words,lines", mask: "lines" }).words;
  }

  // O texto original fica guardado no elemento: se o matchMedia remontar a
  // animação (ao redimensionar), o contador não lê o valor já zerado.
  function lerNumero(el) {
    if (el.dataset.textoOriginal === undefined) {
      el.dataset.textoOriginal = el.textContent;
      textosOriginais.push([el, el.textContent]);
    }
    var m = el.dataset.textoOriginal.trim().match(/^(\d+)(.*)$/);
    if (!m) return null;
    return { alvo: parseInt(m[1], 10), sufixo: m[2] };
  }

  function contador(el, gatilho) {
    var n = lerNumero(el);
    if (!n) return;
    var obj = { v: 0 };
    el.textContent = "0" + n.sufixo;
    gsap.to(obj, {
      v: n.alvo,
      duration: 2.6,
      ease: "power2.out",
      scrollTrigger: { trigger: gatilho || el, start: "top 88%", once: true },
      onUpdate: function () { el.textContent = Math.round(obj.v) + n.sufixo; },
    });
  }

  function contadorNaTimeline(tl, el, posicao, duracao) {
    var n = lerNumero(el);
    if (!n) return;
    var obj = { v: 0 };
    el.textContent = "0" + n.sufixo;
    tl.to(obj, {
      v: n.alvo,
      duration: duracao,
      ease: "power1.out",
      onUpdate: function () { el.textContent = Math.round(obj.v) + n.sufixo; },
    }, posicao);
  }

  /* ── 1. Hero: entrada ao carregar ─────────────────────────── */
  function introHero() {
    gsap.set($$(".landing-hero-content > *, .landing-chip, .hero-scroll-arrow > *"), { visibility: "visible" });
    gsap.set(".landing-orb", { xPercent: -50, x: 0 });

    var letras = temSplit
      ? window.SplitText.create(".landing-hero-title", { type: "lines,words,chars", mask: "lines" }).chars
      : [$(".landing-hero-title")];

    gsap.timeline({ defaults: { ease: "power4.out" }, onComplete: saidaHeroExtras })
      .from(".landing-orb", { yPercent: 30, autoAlpha: 0, duration: 3.2, ease: "power2.out", stagger: 0.25 }, 0)
      .from(".landing-stars", { autoAlpha: 0, duration: 2.4, ease: "power1.out" }, 0)
      .from(".landing-hero-logo", { scale: 0, rotate: -160, duration: 1.8, ease: "back.out(1.4)" }, 0.15)
      .from(".landing-hero-content .hero-badge", { y: 16, autoAlpha: 0, duration: 1.2 }, 0.7)
      .from(letras, { yPercent: 115, rotate: 6, duration: 1.6, stagger: 0.028 }, 0.85)
      .from(".landing-hero-desc", { y: 24, autoAlpha: 0, duration: 1.4 }, 1.6)
      .from(".landing-hero-btns > *", { y: 18, autoAlpha: 0, duration: 1.2, stagger: 0.15 }, 1.85)
      .from(".landing-chip-left", { x: -40, autoAlpha: 0, duration: 1.4 }, 2.1)
      .from(".landing-chip-right", { x: 40, autoAlpha: 0, duration: 1.4 }, 2.25)
      .from(".hero-scroll-arrow > *", { y: -12, autoAlpha: 0, duration: 1, stagger: 0.1 }, 2.5);
  }

  /* ── 2. Hero: saída ao rolar (o "sol" sobe, o texto se afasta) ─ */
  function saidaHero() {
    gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: ".landing-hero", start: 0, end: "bottom top", scrub: 1.2 },
    })
      .to(".landing-hero-content", { yPercent: -30, scale: 0.94, autoAlpha: 0, duration: 0.75 }, 0)
      .to(".landing-stars", { yPercent: 22, duration: 1 }, 0)
      .to(".landing-orb:not(.landing-orb-blue)", { y: "-18vh", duration: 1 }, 0)
      .to(".landing-orb-blue", { y: "-9vh", duration: 1 }, 0);
  }

  // Chips e seta só ganham a saída depois da entrada terminar, para as duas
  // animações não disputarem as mesmas propriedades.
  function saidaHeroExtras() {
    gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: ".landing-hero", start: 0, end: "bottom top", scrub: 1.2 },
    })
      .to(".landing-chip-left", { x: -90, y: -70, autoAlpha: 0, duration: 0.6 }, 0)
      .to(".landing-chip-right", { x: 90, y: -50, autoAlpha: 0, duration: 0.6 }, 0)
      .to(".hero-scroll-arrow > *", { autoAlpha: 0, duration: 0.15 }, 0)
      .to({}, { duration: 0.4 });
  }

  /* ── 3. Faixa de estatísticas ─────────────────────────────── */
  function estatisticas() {
    gsap.from(".stat-item > *", {
      y: 40,
      autoAlpha: 0,
      duration: 1.5,
      ease: "power3.out",
      stagger: 0.12,
      scrollTrigger: { trigger: ".stats-band", start: "top 90%" },
    });
    $$(".stat-value").forEach(function (el) { contador(el, ".stats-band"); });
  }

  /* ── 4. Cabeçalhos de seção ───────────────────────────────── */
  function cabecalhosDeSecao() {
    $$(".landing-section:not(.game-spotlight)").forEach(function (sec) {
      var eyebrow = $(".section-eyebrow", sec);
      var titulo = $(".section-title", sec);
      var desc = $(".section-desc", sec);

      if (eyebrow) {
        gsap.from(eyebrow, {
          autoAlpha: 0,
          y: 14,
          letterSpacing: "0.45em",
          duration: 1.8,
          ease: "power3.out",
          scrollTrigger: { trigger: eyebrow, start: "top 92%" },
        });
      }
      if (titulo) {
        gsap.from(palavras(titulo), {
          yPercent: 110,
          rotate: 3,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: titulo, start: "top 95%", end: "top 50%", scrub: 1.4 },
        });
      }
      if (desc) {
        gsap.from(desc, {
          autoAlpha: 0,
          y: 24,
          duration: 1.6,
          ease: "power3.out",
          scrollTrigger: { trigger: desc, start: "top 92%" },
        });
      }
    });
  }

  /* ── 5. Cards de recursos (sobem girando em 3D) ───────────── */
  function cardsRecursos(mm) {
    var cards = $$(".feature-card");
    if (!cards.length) return;

    mm.add("(min-width: 768px)", function () {
      gsap.from(cards, {
        y: 110,
        rotateX: -28,
        autoAlpha: 0,
        transformOrigin: "50% 100%",
        stagger: 0.22,
        ease: "power2.out",
        scrollTrigger: { trigger: ".features-grid", start: "top 95%", end: "top 30%", scrub: 1.4 },
      });
      gsap.from(".feature-icon", {
        scale: 0,
        rotate: -90,
        stagger: 0.22,
        ease: "back.out(1.8)",
        scrollTrigger: { trigger: ".features-grid", start: "top 80%", end: "top 30%", scrub: 1.4 },
      });
    });

    mm.add("(max-width: 767px)", function () {
      cards.forEach(function (card) {
        gsap.from(card, {
          y: 70,
          rotateX: -20,
          autoAlpha: 0,
          transformOrigin: "50% 100%",
          ease: "power2.out",
          scrollTrigger: { trigger: card, start: "top 98%", end: "top 55%", scrub: 1.4 },
        });
      });
    });
  }

  /* ── 6. Galeria: seção fixada, a faixa de obras desliza dentro da
         coluna e a areia da ampulheta 3D escoa com a rolagem ─────── */
  function galeria(mm) {
    var sec = $(".gallery-showcase");
    if (!sec) return;
    var estado = (window.chronoGaleria = window.chronoGaleria || { progresso: 0 });
    var palco = $(".hourglass-stage", sec);
    var era = $(".hourglass-era-text", sec);
    var janela = $(".gallery-track-wrap", sec);
    var faixa = $(".gallery-track", sec);
    var cards = $$(".gallery-card", sec);
    var eras = ["Pré-História", "Idade Antiga", "Idade Média", "Idade Moderna", "Idade Contemporânea"];
    var eraAtual = 0;

    function acompanhar(self) {
      estado.progresso = self.progress;
      if (estado.aoMudar) estado.aoMudar();
      var i = Math.min(eras.length - 1, Math.floor(self.progress * eras.length));
      if (i === eraAtual || !era) return;
      eraAtual = i;
      era.textContent = eras[i];
      gsap.fromTo(era, { yPercent: 70, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out", overwrite: true });
    }

    gsap.timeline({ defaults: { ease: "power3.out" }, scrollTrigger: { trigger: sec, start: "top 75%" } })
      .from(palco, { scale: 0.6, autoAlpha: 0, duration: 1.8 }, 0)
      .from($(".gallery-eyebrow", sec), { autoAlpha: 0, y: 14, letterSpacing: "0.45em", duration: 1.6 }, 0.15)
      .from(palavras($(".gallery-title", sec)), { yPercent: 110, stagger: 0.07, duration: 1.4 }, 0.3)
      .from($(".gallery-desc", sec), { y: 24, autoAlpha: 0, duration: 1.3 }, 0.7)
      .from(cards, { x: 90, autoAlpha: 0, stagger: 0.1, duration: 1.3 }, 0.8)
      .from($(".gallery-cta", sec), { y: 16, autoAlpha: 0, duration: 1 }, 1.3);

    mm.add("(min-width: 900px)", function () {
      // Quanto a faixa anda para a última obra encostar na borda da coluna.
      // offsetWidth (e não scrollWidth): ignora o deslocamento temporário da
      // animação de entrada dos cards.
      function distancia() {
        return -Math.max(0, faixa.offsetWidth - janela.clientWidth);
      }
      gsap.to(faixa, {
        x: distancia,
        ease: "none",
        scrollTrigger: {
          trigger: sec,
          start: "top top",
          end: function () { return "+=" + Math.max(window.innerHeight * 1.6, -distancia() * 2.4); },
          pin: true,
          scrub: 1.5,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: acompanhar,
        },
      });
    });

    // No celular a faixa rola no dedo; a rolagem da página move a areia
    mm.add("(max-width: 899px)", function () {
      ScrollTrigger.create({ trigger: sec, start: "top 80%", end: "bottom 30%", onUpdate: acompanhar });
    });
  }

  /* ── 7. Destaque do jogo (seção fixada enquanto a cena monta) ─ */
  function destaqueJogo(mm) {
    var sec = $(".game-spotlight");
    if (!sec) return;
    var media = $(".game-spotlight-media", sec);
    var img = $(".game-spotlight-img", sec);
    var eyebrow = $(".game-spotlight-eyebrow", sec);
    var desc = $(".game-spotlight-desc", sec);
    var stats = $$(".game-stat", sec);
    var botao = $(".landing-btn-primary", sec);
    var valores = $$(".game-stat-value", sec);
    var tituloPalavras = palavras($(".game-spotlight-title", sec));

    function montar(tl) {
      tl.from(media, { xPercent: -45, scale: 0.55, autoAlpha: 0, duration: 1 }, 0)
        .from(img, { rotate: -16, duration: 1 }, 0)
        .from(eyebrow, { x: 40, autoAlpha: 0, duration: 0.5 }, 0.35)
        .from(tituloPalavras, { yPercent: 110, stagger: 0.03, duration: 0.6 }, 0.4)
        .from(desc, { y: 30, autoAlpha: 0, duration: 0.5 }, 0.7)
        .from(stats, { y: 40, autoAlpha: 0, stagger: 0.12, duration: 0.5 }, 0.85)
        .from(botao, { y: 20, autoAlpha: 0, duration: 0.4 }, 1.05);
      valores.forEach(function (el) { contadorNaTimeline(tl, el, 0.9, 0.7); });
      return tl;
    }

    mm.add("(min-width: 900px)", function () {
      montar(gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: { trigger: sec, start: "top top", end: "+=160%", pin: true, scrub: 1.5, anticipatePin: 1 },
      }))
        // Respiro final: o herói continua flutuando antes de soltar a seção
        .to(img, { y: -16, rotate: 2, duration: 0.6, ease: "sine.inOut" });
    });

    mm.add("(max-width: 899px)", function () {
      montar(gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: sec, start: "top 70%" },
      })).timeScale(0.6);
    });
  }

  /* ── 8. Como funciona: os passos sobem um depois do outro ─── */
  function passos(mm) {
    var grid = $(".steps-grid");
    if (!grid) return;
    var itens = $$(".step-item", grid);

    mm.add("(min-width: 768px)", function () {
      var tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: { trigger: grid, start: "top 90%", end: "bottom 45%", scrub: 1.4 },
      });
      itens.forEach(function (item, i) {
        tl.from($(".step-number", item), { scale: 0.4, autoAlpha: 0, duration: 0.5, ease: "back.out(2)" }, i * 0.6)
          .from($$(".step-title, .step-desc", item), { y: 40, autoAlpha: 0, stagger: 0.12, duration: 0.7 }, i * 0.6 + 0.15);
      });
    });

    mm.add("(max-width: 767px)", function () {
      itens.forEach(function (item) {
        gsap.from(item, {
          x: -30,
          autoAlpha: 0,
          duration: 1.4,
          ease: "power3.out",
          scrollTrigger: { trigger: item, start: "top 88%" },
        });
      });
    });
  }

  /* ── 9. Planos: os cards laterais "abrem" a partir do central ─ */
  function planos(mm) {
    var cards = $$(".pricing-card");
    if (cards.length !== 3) return;

    mm.add("(min-width: 900px)", function () {
      gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: { trigger: ".pricing-grid", start: "top 95%", end: "top 25%", scrub: 1.4 },
      })
        .from(cards[1], { y: 120, scale: 0.85, autoAlpha: 0, duration: 1 }, 0)
        .from(cards[0], { xPercent: 104, rotate: -7, scale: 0.9, duration: 1 }, 0.35)
        .from(cards[2], { xPercent: -104, rotate: 7, scale: 0.9, duration: 1 }, 0.35)
        .from([cards[0], cards[2]], { autoAlpha: 0, duration: 0.25 }, 0.35);
    });

    mm.add("(max-width: 899px)", function () {
      cards.forEach(function (card) {
        gsap.from(card, {
          y: 50,
          autoAlpha: 0,
          duration: 1.4,
          ease: "power3.out",
          scrollTrigger: { trigger: card, start: "top 90%" },
        });
      });
    });
  }

  /* ── 10. CTA final: a "janela" se abre revelando a arte ───── */
  function ctaFinal() {
    var box = $(".final-cta-box");
    if (!box) return;

    gsap.fromTo(box,
      { clipPath: "inset(14% 18% 14% 18% round 28px)" },
      {
        clipPath: "inset(0% 0% 0% 0% round 4px)",
        ease: "none",
        scrollTrigger: { trigger: ".final-cta", start: "top bottom", end: "clamp(top 35%)", scrub: 1.4 },
      });

    gsap.timeline({ defaults: { ease: "power3.out" }, scrollTrigger: { trigger: box, start: "top 72%" } })
      .from(palavras($(".final-cta-title", box)), { yPercent: 110, stagger: 0.07, duration: 1.4 })
      .from($(".final-cta-desc", box), { y: 20, autoAlpha: 0, duration: 1.2 }, "-=0.9")
      .from($(".final-cta-btns", box), { y: 20, autoAlpha: 0, duration: 1.1 }, "-=0.8");
  }

  /* ── 11. Fio do tempo: linha dourada costurando as seções ─── */
  function fioDoTempo(mm) {
    var fluxo = $(".landing-flow");
    var svg = fluxo && $(".time-thread", fluxo);
    if (!svg) return;
    var base = $(".time-thread-base", svg);
    var trilha = $(".time-thread-path", svg);
    var brilho = $(".time-thread-glow", svg);
    var cabeca = $(".time-thread-head", svg);
    var halo = $(".time-thread-halo", svg);

    mm.add("(min-width: 1100px)", function () {
      var tabela = [];
      var comprimento = 0;
      var topoFluxo = 0;

      // Desce pela margem de uma seção e, no vão até a próxima, cruza a tela
      // numa curva em S até a margem oposta.
      function desenharRota() {
        var rectFluxo = fluxo.getBoundingClientRect();
        var largura = fluxo.clientWidth;
        var altura = fluxo.scrollHeight;
        topoFluxo = rectFluxo.top + window.scrollY;
        svg.setAttribute("viewBox", "0 0 " + largura + " " + altura);
        svg.setAttribute("width", largura);
        svg.setAttribute("height", altura);

        var margem = Math.max(24, (largura - 1180) / 2);
        var xs = [margem / 2, largura - margem / 2];
        var blocos = Array.prototype.filter.call(fluxo.children, function (el) { return el !== svg; });
        var d = "";

        blocos.forEach(function (bloco, i) {
          var r = bloco.getBoundingClientRect();
          var topo = r.top - rectFluxo.top;
          var x = xs[i % 2];
          if (i === 0) {
            d = "M" + x + "," + (topo + 40);
          } else {
            var xAnterior = xs[(i - 1) % 2];
            d += " L" + xAnterior + "," + (topo - 60) +
              " C" + xAnterior + "," + topo + " " + x + "," + topo + " " + x + "," + (topo + 60);
          }
          if (i === blocos.length - 1) d += " L" + x + "," + (r.bottom - rectFluxo.top - 80);
        });

        [base, trilha, brilho].forEach(function (p) { p.setAttribute("d", d); });
        comprimento = trilha.getTotalLength();
        trilha.style.strokeDasharray = brilho.style.strokeDasharray = comprimento;

        // Tabela comprimento → posição, para achar rápido o ponto da linha
        // que está na altura do meio da tela.
        tabela = [];
        var amostras = 800;
        for (var k = 0; k <= amostras; k++) {
          var l = (comprimento * k) / amostras;
          var p = trilha.getPointAtLength(l);
          tabela.push({ l: l, x: p.x, y: p.y });
        }
        atualizar();
      }

      function atualizar() {
        if (!comprimento) return;
        var vh = window.innerHeight;
        var rolagem = window.scrollY;
        var maximo = ScrollTrigger.maxScroll(window);
        // Na última tela de rolagem a "ponta" desce até o rodapé da janela,
        // para a linha sempre terminar completa.
        var rampa = Math.min(1, Math.max(0, (rolagem - (maximo - vh)) / vh));
        var alvoY = rolagem + vh * (0.6 + 0.4 * rampa) - topoFluxo;

        var lo = 0;
        var hi = tabela.length - 1;
        if (alvoY >= tabela[hi].y) {
          lo = hi;
        } else if (alvoY > tabela[0].y) {
          while (hi - lo > 1) {
            var meio = (lo + hi) >> 1;
            if (tabela[meio].y < alvoY) lo = meio; else hi = meio;
          }
        }
        var ponto = tabela[lo];
        var offset = comprimento - ponto.l;
        trilha.style.strokeDashoffset = brilho.style.strokeDashoffset = offset;
        var visivel = ponto.l > 2 ? 1 : 0;
        [cabeca, halo].forEach(function (c) {
          c.setAttribute("cx", ponto.x);
          c.setAttribute("cy", ponto.y);
          c.style.opacity = visivel;
        });
      }

      ScrollTrigger.create({ start: 0, end: "max", onUpdate: atualizar });
      ScrollTrigger.addEventListener("refresh", desenharRota);
      desenharRota();

      return function () { ScrollTrigger.removeEventListener("refresh", desenharRota); };
    });
  }

  /* ── Montagem ─────────────────────────────────────────────── */
  function iniciar() {
    var mm = gsap.matchMedia();
    introHero();
    saidaHero();
    estatisticas();
    cabecalhosDeSecao();
    cardsRecursos(mm);
    // Os pins são criados na ordem em que aparecem na página, antes dos
    // gatilhos que ficam abaixo deles.
    galeria(mm);
    destaqueJogo(mm);
    passos(mm);
    planos(mm);
    ctaFinal();
    fioDoTempo(mm);
    ScrollTrigger.refresh();
  }

  // SplitText precisa das fontes finais para quebrar as linhas no lugar
  // certo; espera no máximo 1,5 s para não segurar o hero escondido.
  var fontes = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontes, new Promise(function (r) { setTimeout(r, 1500); })]).then(function () {
    var ctx = gsap.context(function () {});
    try {
      ctx.add(iniciar);
    } catch (erro) {
      console.error("Falha ao montar as animações de rolagem:", erro);
      ctx.revert();
      ScrollTrigger.getAll().forEach(function (st) { st.kill(); });
      revelarSemGsap();
    }
  });
})();
