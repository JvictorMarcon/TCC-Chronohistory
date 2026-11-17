/* Toasts de mensagem do Chronohistory — substituem os alert() do navegador.

   Uso:
     toast("Mensagem");                       // informativo
     toast.erro("Algo deu errado");           // vermelho
     toast.aviso("Preencha os campos");       // dourado (atenção)
     toast.sucesso("Salvo!");                 // verde
     toast.depois("Faça login", "aviso");     // guarda a mensagem para aparecer
                                              // na PRÓXIMA página (use antes de
                                              // um redirecionamento)

   Não depende de nada: injeta o próprio CSS (acompanha o tema claro/escuro). */
(function () {
  "use strict";

  var CHAVE = "chronohistory_toast";
  var DURACAO = { info: 4500, sucesso: 4000, aviso: 5500, erro: 7000 };
  var ICONES = {
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    sucesso: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
    aviso: '<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
    erro: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  };

  var pilha = null;

  function injetarEstilo() {
    if (document.getElementById("ch-toast-style")) return;
    var s = document.createElement("style");
    s.id = "ch-toast-style";
    s.textContent = [
      ".ch-toast-pilha{position:fixed;z-index:100001;right:1.5rem;bottom:1.5rem;display:flex;flex-direction:column;gap:.6rem;width:min(380px,calc(100vw - 2rem));pointer-events:none}",
      ".ch-toast{--ch-cor:#C9A227;position:relative;overflow:hidden;display:flex;align-items:flex-start;gap:.75rem;padding:.9rem 1rem .95rem .95rem;border-radius:10px;",
      "background:rgba(20,16,12,.96);color:#F5E6C8;border:1px solid var(--ch-cor);box-shadow:0 14px 36px rgba(0,0,0,.5),0 0 0 1px rgba(0,0,0,.25);",
      "font-family:'Inter',system-ui,sans-serif;font-size:.9rem;line-height:1.45;pointer-events:auto;cursor:pointer;",
      "opacity:0;transform:translate3d(24px,0,0);transition:opacity .35s ease,transform .35s cubic-bezier(.22,1,.36,1)}",
      ".ch-toast.is-in{opacity:1;transform:none}",
      ".ch-toast.is-out{opacity:0;transform:translate3d(24px,0,0)}",
      ".ch-toast-erro{--ch-cor:#D9534F;background:rgba(32,14,12,.97)}",
      ".ch-toast-aviso{--ch-cor:#E8C84A}",
      ".ch-toast-sucesso{--ch-cor:#5FAE6B;background:rgba(14,26,16,.97)}",
      ".ch-toast-info{--ch-cor:#C9A227}",
      ".ch-toast-icone{flex:none;width:22px;height:22px;margin-top:1px;fill:none;stroke:var(--ch-cor);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}",
      ".ch-toast-msg{flex:1;min-width:0;overflow-wrap:anywhere}",
      ".ch-toast-fechar{flex:none;background:none;border:0;color:inherit;opacity:.55;cursor:pointer;font-size:1.15rem;line-height:1;padding:0 .1rem}",
      ".ch-toast-fechar:hover{opacity:1}",
      ".ch-toast-barra{position:absolute;left:0;bottom:0;height:2px;width:100%;background:var(--ch-cor);transform-origin:left;animation:ch-toast-barra linear forwards}",
      ".ch-toast:hover .ch-toast-barra{animation-play-state:paused}",
      "@keyframes ch-toast-barra{from{transform:scaleX(1)}to{transform:scaleX(0)}}",
      ":root[data-theme=\"light\"] .ch-toast{background:rgba(255,250,238,.98);color:#2a1f10;box-shadow:0 14px 32px rgba(80,60,20,.25)}",
      ":root[data-theme=\"light\"] .ch-toast-erro{background:rgba(255,241,238,.98);--ch-cor:#B83A35}",
      ":root[data-theme=\"light\"] .ch-toast-sucesso{background:rgba(240,252,240,.98);--ch-cor:#3E8A4B}",
      ":root[data-theme=\"light\"] .ch-toast-aviso,:root[data-theme=\"light\"] .ch-toast-info{--ch-cor:#8B6914}",
      "@media (max-width:600px){.ch-toast-pilha{right:1rem;left:1rem;bottom:auto;top:1rem;width:auto}.ch-toast{transform:translate3d(0,-16px,0)}.ch-toast.is-out{transform:translate3d(0,-16px,0)}}",
      "@media (prefers-reduced-motion:reduce){.ch-toast{transition:opacity .2s;transform:none}.ch-toast.is-out{transform:none}.ch-toast-barra{animation:none;display:none}}",
    ].join("");
    document.head.appendChild(s);
  }

  function garantirPilha() {
    if (pilha && pilha.isConnected) return pilha;
    injetarEstilo();
    pilha = document.createElement("div");
    pilha.className = "ch-toast-pilha";
    pilha.setAttribute("aria-live", "polite");
    pilha.setAttribute("aria-atomic", "false");
    document.body.appendChild(pilha);
    return pilha;
  }

  function mostrar(mensagem, tipo, opcoes) {
    if (mensagem == null || mensagem === "") return null;
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", function () { mostrar(mensagem, tipo, opcoes); });
      return null;
    }
    tipo = ICONES[tipo] ? tipo : "info";
    opcoes = opcoes || {};
    var duracao = opcoes.duracao != null ? opcoes.duracao : DURACAO[tipo];

    var container = garantirPilha();
    // Evita empilhar a mesma mensagem várias vezes (ex.: cliques repetidos)
    var existentes = container.querySelectorAll(".ch-toast-msg");
    for (var i = 0; i < existentes.length; i++) {
      if (existentes[i].textContent === String(mensagem)) return null;
    }
    while (container.children.length >= 4) container.removeChild(container.firstChild);

    var el = document.createElement("div");
    el.className = "ch-toast ch-toast-" + tipo;
    el.setAttribute("role", tipo === "erro" || tipo === "aviso" ? "alert" : "status");
    el.innerHTML =
      '<svg class="ch-toast-icone" viewBox="0 0 24 24" aria-hidden="true">' + ICONES[tipo] + "</svg>" +
      '<span class="ch-toast-msg"></span>' +
      '<button type="button" class="ch-toast-fechar" aria-label="Fechar">&times;</button>' +
      (duracao > 0 ? '<span class="ch-toast-barra" style="animation-duration:' + duracao + 'ms"></span>' : "");
    el.querySelector(".ch-toast-msg").textContent = String(mensagem);
    container.appendChild(el);
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add("is-in"); }); });

    var timer = null;
    var restante = duracao;
    var inicio = 0;
    function fechar() {
      clearTimeout(timer);
      if (!el.parentNode || el.classList.contains("is-out")) return;
      el.classList.remove("is-in");
      el.classList.add("is-out");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
    }
    function agendar() {
      if (!(duracao > 0)) return;
      inicio = Date.now();
      timer = setTimeout(fechar, restante);
    }
    el.addEventListener("mouseenter", function () {
      if (!(duracao > 0)) return;
      clearTimeout(timer);
      restante -= Date.now() - inicio;
    });
    el.addEventListener("mouseleave", function () { if (restante > 0) agendar(); });
    el.addEventListener("click", fechar);
    agendar();
    return { fechar: fechar };
  }

  function toast(mensagem, tipo, opcoes) { return mostrar(mensagem, tipo || "info", opcoes); }
  toast.info = function (m, o) { return mostrar(m, "info", o); };
  toast.sucesso = function (m, o) { return mostrar(m, "sucesso", o); };
  toast.aviso = function (m, o) { return mostrar(m, "aviso", o); };
  toast.erro = function (m, o) { return mostrar(m, "erro", o); };
  toast.depois = function (mensagem, tipo) {
    try { sessionStorage.setItem(CHAVE, JSON.stringify({ m: mensagem, t: tipo || "info" })); } catch (_) { /* sem storage */ }
  };
  window.toast = toast;

  // Mensagem deixada pela página anterior (antes de um redirecionamento)
  function mostrarPendente() {
    var bruto = null;
    try {
      bruto = sessionStorage.getItem(CHAVE);
      sessionStorage.removeItem(CHAVE);
    } catch (_) { return; }
    if (!bruto) return;
    try {
      var d = JSON.parse(bruto);
      mostrar(d.m, d.t);
    } catch (_) { /* ignora */ }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mostrarPendente);
  else mostrarPendente();
})();
