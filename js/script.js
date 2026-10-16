// ============================================
// API Configuration
// ============================================
const API_BASE = 'https://backend-tcc-cronohistory.onrender.com';
const API_URL = `${API_BASE}/periodos`;

// ============================================
// Estado Global
// ============================================
let todosPeriodos = [];
let todosEventos = [];
let eventosFiltrados = [];
let currentPage = 1;
let isLoading = false;
let currentMap = null;
let itemsPerLoad = 8;
let todosEventosCarregados = false;
let totalEventosCarregados = 0;
let sessaoAtual = null; // { user, role, nome, fase_jogo }
let enriquecimentoPorNome = {}; // nome normalizado -> dados extras do periodos.json

// ============================================
// Verificar Sessão (fonte de verdade: servidor)
// ============================================
async function verificarSessao() {
    try {
        const resp = await fetch(`${API_BASE}/me`, { credentials: 'include', cache: 'no-store' });
        if (resp.ok) {
            const data = await resp.json();
            if (data.autenticado) {
                sessaoAtual = data;
                // Admin não fica na index — vai para o painel
                if (data.role === 'adm' && !window.location.pathname.includes('adm.html')) {
                    window.location.href = 'adm.html';
                    return;
                }
                // Atualiza nav com nome do usuário
                atualizarNavSessao(data);
            }
        }
    } catch (e) {
        // backend off-line — usa localStorage como fallback visual
        try {
            const local = JSON.parse(localStorage.getItem('chronohistory_user'));
            if (local) sessaoAtual = { ...local, autenticado: true };
        } catch (_) {}
    }
}



// ============================================
// Inicialização
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    await verificarSessao();
    await carregarDados();
    setupEventListeners();
});

// ============================================
// Carregar Dados da API / Local Fallback
// ============================================
async function carregarDados() {
    let data = null;
    const endpoints = [
        `${API_BASE}/eventos`,
        `${API_BASE}/periodos`,
        'periodos.json'
    ];

    // Carrega em paralelo — o enriquecimento não bloqueia a timeline
    const enriquecimentoPromise = carregarEnriquecimento();

    for (const url of endpoints) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const resData = await response.json();
                // Aceita array direto ou wrapper com .periodos / .data
                if (resData && (Array.isArray(resData) ? resData.length > 0 : resData.periodos || resData.data)) {
                    data = resData;
                    break;
                }
            }
        } catch (e) {
            console.warn(`Tentativa de carregar de ${url} em standby:`, e);
        }
    }

    // Fallback local garantido
    if (!data || (Array.isArray(data) && data.length === 0)) {
        try {
            const fallbackResp = await fetch('periodos.json');
            if (fallbackResp.ok) data = await fallbackResp.json();
        } catch (err) {
            console.error('Erro ao ler periodos.json:', err);
        }
    }

    if (Array.isArray(data)) {
        todosPeriodos = data;
    } else if (data && typeof data === 'object') {
        if (data.periodos && Array.isArray(data.periodos)) todosPeriodos = data.periodos;
        else if (data.data && Array.isArray(data.data)) todosPeriodos = data.data;
        else todosPeriodos = [data];
    }

    await enriquecimentoPromise;
    processarEventos();
    preencherFiltros();
    aplicarFiltros();
}

function normalizarNomeEvento(nome) {
    return String(nome || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();
}

// ============================================
// Enriquecimento — a API (Supabase) só traz os campos
// básicos de cada evento; "o que mudou", "informações
// adicionais" e o papel de cada figura histórica só existem
// no periodos.json local. Carrega esse arquivo sempre (não só
// como fallback de falha) e casa por nome do evento para
// completar o que a API deixou de fora.
// ============================================
async function carregarEnriquecimento() {
    try {
        const resp = await fetch('periodos.json');
        if (!resp.ok) return;
        const data = await resp.json();
        const periodos = Array.isArray(data) ? data : (data.periodos || data.data || []);

        enriquecimentoPorNome = {};
        periodos.forEach(periodo => {
            // legado/curiosidades/caracteristicas_principais são do período
            // inteiro (gerados uma única vez por IA), não do evento — todo
            // evento do mesmo período compartilha esses três campos.
            const legadoPeriodo = periodo.legado || '';
            const curiosidadesPeriodo = periodo.curiosidades || [];
            const caracteristicasPeriodo = periodo.caracteristicas_principais || [];

            (periodo.acontecimentos || []).forEach(evento => {
                const chave = normalizarNomeEvento(evento.nome);
                if (!chave) return;
                enriquecimentoPorNome[chave] = {
                    oque_mudou: evento.oque_mudou || '',
                    informacoes_adicionais: evento.informacoes_adicionais || '',
                    figuras_principais: evento.figuras_principais || [],
                    legado: legadoPeriodo,
                    curiosidades: curiosidadesPeriodo,
                    caracteristicas_principais: caracteristicasPeriodo
                };
            });
        });
    } catch (err) {
        console.warn('Não foi possível carregar o enriquecimento de periodos.json:', err);
    }
}

function formatarUrlImagem(urlOuNome, periodoNome) {
    if (!urlOuNome || typeof urlOuNome !== 'string' || urlOuNome.trim() === '') {
        return getImagemPeriodoFallback(periodoNome);
    }
    const limpo = urlOuNome.trim();
    if (limpo.startsWith('http://') || limpo.startsWith('https://') || limpo.startsWith('data:')) {
        return limpo;
    }
    if (limpo.startsWith('imagens/')) {
        return limpo;
    }
    return `imagens/${limpo}`;
}

function getImagemPeriodoFallback(periodoNome) {
    if (!periodoNome) return 'imagens/feudalismo_europeu.jpg';
    const lower = periodoNome.toLowerCase();
    if (lower.includes('pré') || lower.includes('pre')) return 'imagens/dominio_do_fogo.jpg';
    if (lower.includes('antiga') || lower.includes('antiguidade')) return 'imagens/democracia_ateniense.jpg';
    if (lower.includes('média') || lower.includes('media') || lower.includes('medieval')) return 'imagens/feudalismo_europeu.jpg';
    if (lower.includes('moderna') || lower.includes('renascimento')) return 'imagens/renascimento_cultural.jpg';
    if (lower.includes('contemporânea') || lower.includes('contemporanea')) return 'imagens/revolucao_francesa.jpg';
    return 'imagens/feudalismo_europeu.jpg';
}

// ============================================
// Processar Eventos — detecta Formato A (Supabase plano)
// ou Formato B (periodos.json aninhado)
// ============================================
function processarEventos() {
    todosEventos = [];

    todosPeriodos.forEach((item, periodoIndex) => {
        // ── FORMATO B: períodos com acontecimentos[] (periodos.json) ──
        if (item.acontecimentos && Array.isArray(item.acontecimentos)) {
            const periodoNome = item.nome || `Período ${periodoIndex + 1}`;
            item.acontecimentos.forEach((evento, eventoIndex) => {
                const anoOriginal = evento.ano || 'Data desconhecida';
                const anoNumerico = converterAnoParaNumero(anoOriginal);
                const anoFormatado = formatarAno(anoOriginal);
                const globalId = `periodo_${item.id || periodoIndex}_evento_${evento.id || eventoIndex}`;

                todosEventos.push({
                    id: evento.id || `${periodoIndex}_${eventoIndex}`,
                    nome: evento.nome || `Evento ${eventoIndex + 1}`,
                    ano: anoFormatado,
                    anoOriginal,
                    anoNumerico,
                    lugar: evento.lugar || 'Regiões diversas',
                    oque_aconteceu: evento.oque_aconteceu || 'Descrição disponível no "Saber Mais"',
                    oque_mudou: evento.oque_mudou || '',
                    periodoNome,
                    periodoId: item.id || periodoIndex,
                    periodoResumo: item.resumo || '',
                    caracteristicas_principais: evento.caracteristicas_principais || item.caracteristicas_principais || [],
                    legado: evento.legado || item.legado || '',
                    curiosidades: evento.curiosidades || item.curiosidades || [],
                    figuras_principais: evento.figuras_principais || [],
                    informacoes_adicionais: evento.informacoes_adicionais || '',
                    imagem: formatarUrlImagem(evento.imagem || evento.imagemUrl, periodoNome),
                    globalId,
                    periodoOriginal: item
                });
            });

        // ── FORMATO A: evento direto plano (Supabase tabela `evento`) ──
        } else if (item.nome && (item.ano_inicio || item.ano || item.acontecimento || item.oque_aconteceu)) {
            const anoOriginal = item.ano_inicio || item.ano || 'Data desconhecida';
            const anoNumerico = converterAnoParaNumero(anoOriginal);
            const anoFormatado = formatarAno(anoOriginal);
            const globalId = `supabase_ev_${item.id || periodoIndex}`;

            // figuras_historicas pode ser array de strings ou string JSON
            let figuras = [];
            try {
                figuras = Array.isArray(item.figuras_historicas)
                    ? item.figuras_historicas
                    : JSON.parse(item.figuras_historicas || '[]');
            } catch (_) {}
            figuras = figuras.map(f => typeof f === 'string' ? { nome: f } : f);

            // A API só traz os dados básicos — completa com o que existe no
            // periodos.json local pra esse mesmo evento (por nome)
            const extra = enriquecimentoPorNome[normalizarNomeEvento(item.nome)] || {};
            // Se a API não trouxe o "papel" de cada figura (só o nome), usa
            // o periodos.json pra preencher essa descrição
            const figurasComPapel = figuras.map(f => {
                if (f.papel) return f;
                const match = (extra.figuras_principais || []).find(
                    fp => normalizarNomeEvento(fp.nome) === normalizarNomeEvento(f.nome)
                );
                return match ? { ...f, papel: match.papel } : f;
            });

            todosEventos.push({
                id: item.id || `${periodoIndex}`,
                nome: item.nome,
                ano: anoFormatado,
                anoOriginal,
                anoNumerico,
                lugar: item.lugar || 'Regiões diversas',
                oque_aconteceu: item.acontecimento || item.oque_aconteceu || '',
                oque_mudou: item.oque_mudou || extra.oque_mudou || '',
                periodoNome: item.periodo || 'Período histórico',
                periodoId: item.id || periodoIndex,
                periodoResumo: '',
                caracteristicas_principais: extra.caracteristicas_principais || [],
                legado: extra.legado || '',
                curiosidades: extra.curiosidades || [],
                figuras_principais: figurasComPapel,
                informacoes_adicionais: item.informacoes_adicionais || extra.informacoes_adicionais || '',
                imagem: formatarUrlImagem(item.imagemUrl || item.imagem, item.periodo || 'História'),
                globalId,
                periodoOriginal: item
            });
        }
    });

    todosEventos.sort(ordenarPorAno);
}

function converterAnoParaNumero(ano) {
    const texto = String(ano || '').toLowerCase();
    const encontrados = texto.match(/\d+(?:[.,]\d+)?/g);
    if (!encontrados || encontrados.length === 0) return 9999;

    const valores = encontrados.map(valor => Number(valor.replace(',', '.')));
    const valor = Math.min(...valores);
    return /a\.?\s*c\.?|ac|antes de cristo/.test(texto) ? -valor : valor;
}

function formatarAno(ano) {
    return String(ano || 'Data desconhecida').trim();
}

function formatarAnoNumericoTag(anoNumerico) {
    if (!Number.isFinite(anoNumerico) || anoNumerico === 9999) return '';
    return anoNumerico < 0 ? `${Math.abs(anoNumerico)} a.C.` : `${anoNumerico} d.C.`;
}

function ordenarPorAno(a, b) {
    if (a.anoNumerico === 9999 && b.anoNumerico === 9999) return 0;
    if (a.anoNumerico === 9999) return 1;
    if (b.anoNumerico === 9999) return -1;
    return a.anoNumerico - b.anoNumerico;
}

// ============================================
// Filtros
// ============================================
function preencherFiltros() {
    const lugares = [...new Set(todosEventos.map(e => e.lugar).filter(l => l && l !== 'Regiões diversas' && l !== 'Local não especificado'))];
    const lugarOptions = document.getElementById('lugarOptions');
    lugarOptions.innerHTML = '';
    lugares.sort().forEach(lugar => {
        const option = document.createElement('option');
        option.value = lugar;
        lugarOptions.appendChild(option);
    });

    const periodos = [...new Set(todosEventos.map(e => e.periodoNome).filter(p => p))];
    const periodoSelect = document.getElementById('periodoFilter');
    periodoSelect.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Todos os períodos';
    periodoSelect.appendChild(defaultOption);

    periodos.forEach(periodo => {
        const option = document.createElement('option');
        option.value = periodo;
        option.textContent = periodo;
        periodoSelect.appendChild(option);
    });
}

function aplicarFiltros() {
    const lugar = document.getElementById('lugarFilter').value.toLowerCase();
    const ano = document.getElementById('anoFilter').value.toLowerCase();
    const periodo = document.getElementById('periodoFilter').value;

    eventosFiltrados = todosEventos.filter(evento => {
        let match = true;

        if (lugar) {
            const lugarEvento = evento.lugar ? evento.lugar.toLowerCase() : '';
            if (!lugarEvento.includes(lugar)) match = false;
        }

        if (periodo && evento.periodoNome !== periodo) match = false;

        if (ano) {
            const anoEvento = evento.ano ? evento.ano.toLowerCase() : '';
            const anoOriginal = evento.anoOriginal ? evento.anoOriginal.toLowerCase() : '';
            if (!anoEvento.includes(ano) && !anoOriginal.includes(ano)) match = false;
        }

        return match;
    });

    eventosFiltrados.sort(ordenarPorAno);

    currentPage = 1;
    totalEventosCarregados = 0;
    todosEventosCarregados = false;
    renderTimeline();
}

// ============================================
// Renderizar Timeline
// ============================================
function renderTimeline() {
    const container = document.getElementById('timelineItems');
    const loadingIndicator = document.getElementById('loadingIndicator');

    const start = totalEventosCarregados;
    const end = Math.min(start + itemsPerLoad, eventosFiltrados.length);
    const eventosToShow = eventosFiltrados.slice(start, end);

    if (currentPage === 1) {
        container.innerHTML = '';
        totalEventosCarregados = 0;
    }

    if (eventosFiltrados.length === 0) {
        // ANTES: "bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl" — glassmorphism
        // solto no meio do JS. Usa a mesma "casca" sólida já definida em
        // #timelineItems .text-center no CSS (sem blur, sem transparência de vidro).
        container.innerHTML = `
            <div class="text-center py-16">
                <p>Nenhum evento encontrado com os filtros selecionados.</p>
                <p style="margin-top: 0.75rem; opacity: 0.75;">Tente ajustar seus filtros para descobrir mais histórias.</p>
            </div>
        `;
        loadingIndicator.classList.add('hidden');
        return;
    }

    eventosToShow.forEach((evento, index) => {
        adicionarEventoTimeline(evento, container, totalEventosCarregados + index);
    });

    totalEventosCarregados += eventosToShow.length;

    const allEventsShown = totalEventosCarregados >= eventosFiltrados.length;

    if (allEventsShown) {
        loadingIndicator.classList.add('hidden');
        todosEventosCarregados = true;
    } else {
        loadingIndicator.classList.remove('hidden');
        loadingIndicator.innerHTML = `
            <div class="loading-spinner mx-auto mb-4"></div>
            <p>Carregando mais eventos históricos...</p>
            <p style="opacity: 0.65; font-size: 0.85rem; margin-top: 0.35rem;">
                ${totalEventosCarregados} de ${eventosFiltrados.length} eventos · ${Math.round((totalEventosCarregados / eventosFiltrados.length) * 100)}%
            </p>
        `;
        todosEventosCarregados = false;

        const oldObserver = loadingIndicator._observer;
        if (oldObserver) {
            oldObserver.disconnect();
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoading && !todosEventosCarregados) {
                carregarMaisEventos();
            }
        }, { threshold: 0.1 });

        loadingIndicator._observer = observer;
        observer.observe(loadingIndicator);
    }

    observeTimelineItems();
}

// ANTES: cada card misturava a classe custom (.timeline-card, .year-badge,
// .tag-text, .action-btn-saber) com uma pilha de utilitários Tailwind
// (rounded-full, rounded-xl, shadow-md, bg-gradient-to-r...) por cima —
// o que sobrescrevia o visual "papel/tinta" plano que o CSS já define e
// devolvia o efeito "cartão de app genérico". Agora o HTML usa só as
// classes do próprio design system, sem gradiente e sem pill-shape.
function adicionarEventoTimeline(evento, container, index) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'timeline-item';
    itemDiv.setAttribute('data-event-id', evento.id);
    itemDiv.setAttribute('data-ano', evento.anoNumerico);
    itemDiv.setAttribute('data-periodo', evento.periodoNome);

    const nome = evento.nome || 'Evento Histórico';
    const ano = evento.ano || 'Data desconhecida';
    const lugar = evento.lugar || 'Regiões diversas';
    const descricao = evento.oque_aconteceu || 'Descrição disponível no "Saber Mais"';
    const periodoNome = evento.periodoNome || 'Período histórico';

    const anoNumericoTag = formatarAnoNumericoTag(evento.anoNumerico);

    let figurasHtml = '';
    if (evento.figuras_principais && evento.figuras_principais.length > 0) {
        const nomesFiguras = evento.figuras_principais.map(f => f.nome || f).join(', ');
        figurasHtml = `<span class="tag-text">${escapeHtml(nomesFiguras)}</span>`;
    }

    let infoAdicionalHtml = '';
    if (evento.informacoes_adicionais) {
        infoAdicionalHtml = `<span class="tag-text">${escapeHtml(evento.informacoes_adicionais)}</span>`;
    }

    itemDiv.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-card">
            <div class="flex justify-between items-start gap-3 mb-4 flex-wrap">
                <h3>${escapeHtml(nome)}</h3>
                <span class="year-badge">${escapeHtml(ano)}</span>
            </div>

            <p class="mb-4">${escapeHtml(descricao)}</p>

            <div class="flex flex-wrap gap-2 mb-5">
                <span class="tag-text">${escapeHtml(lugar)}</span>
                <span class="tag-text">${escapeHtml(periodoNome)}</span>
                ${anoNumericoTag ? `<span class="tag-text">${anoNumericoTag}</span>` : ''}
                ${figurasHtml}
                ${infoAdicionalHtml}
            </div>

            <div class="flex gap-3 flex-wrap">
                <button onclick="abrirSaberMais('${evento.globalId}')" class="action-btn-saber">
                    Saber Mais
                </button>
                <button onclick="mostrarMapa('${escapeHtml(lugar)}', '${escapeHtml(nome)}')" class="action-btn-mapa">
                    Ver Mapa
                </button>
            </div>
        </div>
    `;

    container.appendChild(itemDiv);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Função Saber Mais
// ============================================
function abrirSaberMais(globalId) {
    const evento = todosEventos.find(e => e.globalId === globalId);
    if (!evento) {
        console.error('Evento não encontrado com globalId:', globalId);
        return;
    }

    const modal = document.getElementById('saberMaisModal');
    const modalContent = document.getElementById('modalContent');

    // Usa os dados locais do evento (já carregados do periodos.json ou da API)
    const caracteristicas = evento.caracteristicas_principais || [];
    const curiosidades = evento.curiosidades || [];
    const legado = evento.legado || '';

    modalContent.innerHTML = renderConteudoModal(evento, {
        caracteristicas, curiosidades, legado
    });

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// ANTES: cada bloco do modal usava "bg-[#F5F0E6] p-5 rounded-xl" ou
// "bg-gradient-to-r from-[#E8DCC8] to-[#F5F0E6] p-6 rounded-xl" — mais
// gradiente e bordas muito arredondadas. Trocado por ".modal-secao",
// um bloco sólido e reto, coerente com o resto do site.
function renderConteudoModal(evento, { caracteristicas, curiosidades, legado }) {
    return `
        <div class="modal-inner-container">
            <div class="modal-header-info">
                <div class="modal-event-badges">
                    <span class="modal-badge-periodo">${escapeHtml(evento.periodoNome || 'História')}</span>
                    ${evento.ano ? `<span class="modal-badge-ano">${escapeHtml(evento.ano)}</span>` : ''}
                </div>
                <h4 class="modal-event-title">${escapeHtml(evento.nome)}</h4>
                ${evento.lugar ? `<p class="modal-event-location"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:-2px;margin-right:5px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${escapeHtml(evento.lugar)}</p>` : ''}
            </div>

            ${evento.oque_aconteceu ? `
                <div class="modal-secao">
                    <h5 class="modal-secao-titulo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>O que aconteceu</h5>
                    <p class="modal-secao-texto">${escapeHtml(evento.oque_aconteceu)}</p>
                </div>
            ` : ''}

            ${evento.oque_mudou ? `
                <div class="modal-secao">
                    <h5 class="modal-secao-titulo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-3px;margin-right:6px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>O que mudou</h5>
                    <p class="modal-secao-texto">${escapeHtml(evento.oque_mudou)}</p>
                </div>
            ` : ''}

            ${legado ? `
                <div class="modal-secao">
                    <h5 class="modal-secao-titulo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-3px;margin-right:6px"><line x1="3" y1="22" x2="21" y2="22"/><rect x="2" y="2" width="20" height="5"/><path d="M4 7v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V7M10 7v3a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V7M16 7v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V7"/></svg>Legado Histórico</h5>
                    <p class="modal-secao-texto">${escapeHtml(legado)}</p>
                </div>
            ` : ''}

            ${caracteristicas && caracteristicas.length > 0 ? `
                <div class="modal-secao">
                    <h5 class="modal-secao-titulo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-3px;margin-right:6px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Características principais</h5>
                    <ul class="modal-lista">
                        ${caracteristicas.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            ${evento.figuras_principais && evento.figuras_principais.length > 0 ? `
                <div class="modal-secao">
                    <h5 class="modal-secao-titulo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Figuras principais</h5>
                    <ul class="modal-lista">
                        ${evento.figuras_principais.map(f => `<li><strong>${escapeHtml(f.nome || f)}</strong>${f.papel ? ` — ${escapeHtml(f.papel)}` : ''}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            ${evento.informacoes_adicionais ? `
                <div class="modal-secao">
                    <h5 class="modal-secao-titulo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>Informações adicionais</h5>
                    <p class="modal-secao-texto">${escapeHtml(evento.informacoes_adicionais)}</p>
                </div>
            ` : ''}

            ${curiosidades && curiosidades.length > 0 ? `
                <div class="modal-secao">
                    <h5 class="modal-secao-titulo"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-3px;margin-right:6px"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>Curiosidades históricas</h5>
                    <ul class="modal-curiosidades-lista">
                        ${curiosidades.slice(0, 4).map(c => `<li>${escapeHtml(c)}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
}

// ============================================
// FUNÇÕES DO MAPA
// ============================================
function obterCoordenadas(lugar) {
    if (!lugar) return { lat: 0, lng: 0 };

    const lugarLower = lugar.toLowerCase().trim();

    const coordenadas = {
        'brasil': { lat: -14.2350, lng: -51.9253 },
        'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
        'são paulo': { lat: -23.5505, lng: -46.6333 },
        'brasilia': { lat: -15.7975, lng: -47.8919 },
        'salvador': { lat: -12.9777, lng: -38.5016 },
        'recife': { lat: -8.0476, lng: -34.8770 },
        'fortaleza': { lat: -3.7327, lng: -38.5270 },
        'belo horizonte': { lat: -19.9191, lng: -43.9386 },
        'porto alegre': { lat: -30.0346, lng: -51.2177 },
        'curitiba': { lat: -25.4296, lng: -49.2713 },
        'manaus': { lat: -3.1190, lng: -60.0217 },
        'paris': { lat: 48.8566, lng: 2.3522 },
        'roma': { lat: 41.9028, lng: 12.4964 },
        'londres': { lat: 51.5074, lng: -0.1278 },
        'lisboa': { lat: 38.7223, lng: -9.1393 },
        'madrid': { lat: 40.4168, lng: -3.7038 },
        'berlim': { lat: 52.5200, lng: 13.4050 },
        'atenas': { lat: 37.9838, lng: 23.7275 },
        'nova york': { lat: 40.7128, lng: -74.0060 },
        'los angeles': { lat: 34.0522, lng: -118.2437 },
        'miami': { lat: 25.7617, lng: -80.1918 },
        'buenos aires': { lat: -34.6037, lng: -58.3816 },
        'santiago': { lat: -33.4489, lng: -70.6693 },
        'lima': { lat: -12.0464, lng: -77.0428 },
        'bogotá': { lat: 4.7110, lng: -74.0721 },
        'pequim': { lat: 39.9042, lng: 116.4074 },
        'toquio': { lat: 35.6762, lng: 139.6503 },
        'cairo': { lat: 30.0444, lng: 31.2357 },
        'alexandria': { lat: 31.2001, lng: 29.9187 },
        'sydney': { lat: -33.8688, lng: 151.2093 },
        'mesopotâmia': { lat: 33.2232, lng: 43.6793 },
        'egito antigo': { lat: 26.8206, lng: 30.8025 },
        'grécia antiga': { lat: 39.0742, lng: 21.8243 },
        'roma antiga': { lat: 41.9028, lng: 12.4964 },
        'constantinopla': { lat: 41.0082, lng: 28.9784 },
        // Nomes históricos/regionais recorrentes nos eventos cadastrados —
        // o geocoder gratuito (Nominatim) não reconhece bem esses nomes
        // antigos, então valem a pena ter um ponto fixo aqui.
        'alemanha': { lat: 51.1657, lng: 10.4515 },
        'frança': { lat: 46.2276, lng: 2.2137 },
        'itália': { lat: 41.8719, lng: 12.5674 },
        'inglaterra': { lat: 52.3555, lng: -1.1743 },
        'escócia': { lat: 56.4907, lng: -4.2026 },
        'rússia': { lat: 61.5240, lng: 105.3188 },
        'urss': { lat: 61.5240, lng: 105.3188 },
        'méxico': { lat: 23.6345, lng: -102.5528 },
        'índia': { lat: 20.5937, lng: 78.9629 },
        'china': { lat: 35.8617, lng: 104.1954 },
        'japão': { lat: 36.2048, lng: 138.2529 },
        'jerusalém': { lat: 31.7683, lng: 35.2137 },
        'judéia': { lat: 31.5, lng: 35.1 },
        'meca': { lat: 21.3891, lng: 39.8579 },
        'medina': { lat: 24.5247, lng: 39.5692 },
        'filadélfia': { lat: 39.9526, lng: -75.1652 },
        'trento': { lat: 46.0748, lng: 11.1217 },
        'mainz': { lat: 50.0, lng: 8.2711 },
        'olímpia': { lat: 37.6381, lng: 21.6300 },
        'bolonha': { lat: 44.4949, lng: 11.3426 },
        'oxford': { lat: 51.7520, lng: -1.2577 },
        'istambul': { lat: 41.0082, lng: 28.9784 },
        'macedônia': { lat: 41.6086, lng: 21.7453 },
        'pérsia': { lat: 32.4279, lng: 53.6880 },
        'levante': { lat: 34.8, lng: 36.0 },
        'eurásia': { lat: 55.0, lng: 60.0 },
        'vale do nilo': { lat: 26.8206, lng: 30.8025 },
        'vale do rio indo': { lat: 27.7, lng: 68.3 },
        'crescente fértil': { lat: 33.0, lng: 44.0 },
        'babilônia': { lat: 32.5422, lng: 44.4209 },
        'anatólia': { lat: 38.9637, lng: 35.2433 },
        'turquia': { lat: 38.9637, lng: 35.2433 },
        'iraque': { lat: 33.2232, lng: 43.6793 },
        'irã': { lat: 32.4279, lng: 53.6880 },
        'península ibérica': { lat: 40.4637, lng: -3.7492 },
        'caribe': { lat: 18.7357, lng: -70.1627 },
        'andes': { lat: -13.0, lng: -75.0 },
        'áfrica oriental': { lat: -1.2921, lng: 36.8219 },
        'tordesilhas': { lat: 41.5026, lng: -5.0 },
        'vila rica': { lat: -20.3855, lng: -43.5035 },
        'minas gerais': { lat: -18.5122, lng: -44.5550 },
        'pernambuco': { lat: -8.8137, lng: -36.9541 },
        'bahia': { lat: -12.5797, lng: -41.7007 },
        'paquistão': { lat: 30.3753, lng: 69.3451 },
        'indonésia': { lat: -0.7893, lng: 113.9213 },
        'austrália': { lat: -25.2744, lng: 133.7751 },
        // Continentes por último de propósito: como a checagem é por
        // substring, essas entradas genéricas só devem "ganhar" quando
        // nenhuma região/país mais específico (acima) bateu antes.
        'europa': { lat: 54.5260, lng: 15.2551 },
        'ásia': { lat: 34.0479, lng: 100.6197 },
        'áfrica': { lat: -8.7832, lng: 34.5085 },
        'américas': { lat: 10.0, lng: -80.0 },
        'américa': { lat: 10.0, lng: -80.0 },
        'oceania': { lat: -22.7359, lng: 140.0188 }
    };

    for (const [key, coords] of Object.entries(coordenadas)) {
        if (lugarLower === key || lugarLower.includes(key)) {
            return coords;
        }
    }

    return { lat: 0, lng: 0 };
}

// Muitos "lugares" dos eventos são textos descritivos, não um endereço
// único — ex: "Anatólia (atual Turquia)", "Crescente Fértil (Oriente
// Médio)" ou até "Bagdá, Córdoba, Cairo e outros centros islâmicos".
// Nenhum geocoder (pago ou gratuito) resolve isso direto, então aqui a
// gente quebra o texto em termos candidatos — do mais específico pro
// mais genérico — e tenta cada um até achar alguma coisa.
// Termos genéricos demais pra virar um ponto no mapa — tentar geocodificar
// "Mundial" só devolve lixo (tipo uma rua chamada "Mundial" em algum lugar).
const LUGARES_SEM_PONTO_UNICO = ['mundial', 'lua'];

function obterTermosBusca(lugar) {
    if (!lugar) return [];

    const lowerCompleto = lugar.toLowerCase().trim();
    if (LUGARES_SEM_PONTO_UNICO.some(termo => lowerCompleto === termo || lowerCompleto.startsWith(termo + ','))) {
        return [];
    }

    const termos = [];

    // conteúdo entre parênteses costuma ser o nome moderno e mais
    // preciso, ex: "(atual Turquia)" -> "Turquia"
    const matchParen = lugar.match(/\(([^)]+)\)/);
    if (matchParen) {
        const dentro = matchParen[1].replace(/^atual\s+/i, '').trim();
        if (dentro) termos.push(dentro);
    }

    const semParenteses = lugar.replace(/\([^)]*\)/g, '').trim();
    const primeiroSegmento = semParenteses.split(/,| e /i)[0].trim();
    if (primeiroSegmento) termos.push(primeiroSegmento);

    if (semParenteses && !termos.includes(semParenteses)) {
        termos.push(semParenteses);
    }
    if (!termos.includes(lugar)) termos.push(lugar);

    return termos.filter(Boolean);
}

function buscarCoordenadasPorNome(lugar, nomeEvento) {
    const termos = obterTermosBusca(lugar);

    for (const termo of termos) {
        const coords = obterCoordenadas(termo);
        if (coords.lat !== 0 || coords.lng !== 0) {
            criarMapaComCoordenadas(coords.lat, coords.lng, lugar, nomeEvento);
            return;
        }
    }

    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="text-center">
                    <div class="loading-spinner mx-auto mb-4"></div>
                    <p>Buscando localização...</p>
                </div>
            </div>
        `;
    }

    tentarGeocodificacao(termos, 0, lugar, nomeEvento);
}

function tentarGeocodificacao(termos, indice, lugarOriginal, nomeEvento) {
    if (indice >= termos.length) {
        criarMapaComCoordenadas(0, 0, lugarOriginal, nomeEvento);
        return;
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(termos[indice])}&format=json&limit=1&accept-language=pt`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                criarMapaComCoordenadas(lat, lng, lugarOriginal, nomeEvento);
            } else {
                tentarGeocodificacao(termos, indice + 1, lugarOriginal, nomeEvento);
            }
        })
        .catch(() => tentarGeocodificacao(termos, indice + 1, lugarOriginal, nomeEvento));
}

function criarMapaComCoordenadas(lat, lng, lugar, nomeEvento) {
    try {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        if (currentMap) {
            currentMap.remove();
            currentMap = null;
        }

        mapContainer.innerHTML = '';

        const zoom = (lat === 0 && lng === 0) ? 2 : 6;
        const viewLat = (lat === 0 && lng === 0) ? 20 : lat;
        const viewLng = (lat === 0 && lng === 0) ? 0 : lng;

        currentMap = L.map('map', {
            center: [viewLat, viewLng],
            zoom: zoom,
            zoomControl: true
        });

        // A CartoDB (basemaps.cartocdn.com) passou a exigir chave de API e
        // só devolve um selo "API KEY REQUIRED" no lugar do mapa — trocado
        // pelo basemapa cinza-claro gratuito da Esri (sem chave, sem
        // cadastro), com uma camada extra só de rótulos por cima.
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
            maxZoom: 16
        }).addTo(currentMap);

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 16
        }).addTo(currentMap);

        // ANTES: marcador em círculo perfeito com sombra difusa (visual
        // "pin de app de mapa genérico"). Trocado por um selo quadrado com
        // cantos levemente cortados, coerente com a estética de selo de
        // cera / documento do restante do site.
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background: #8B2E2E; width: 22px; height: 22px; border: 2px solid #F7F3EA; transform: rotate(45deg); box-shadow: 0 2px 4px rgba(0,0,0,0.35);"></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });

        if (lat !== 0 || lng !== 0) {
            L.marker([lat, lng], { icon: customIcon })
                .bindPopup(`
                    <div style="font-family: 'Inter', sans-serif; text-align: center; min-width: 180px;">
                        <strong style="color: #1C1712; font-size: 1rem; display: block; margin-bottom: 4px;">${escapeHtml(nomeEvento)}</strong>
                        <span style="color: #3A3229; font-size: 0.9rem;">${escapeHtml(lugar)}</span>
                    </div>
                `)
                .openPopup();

            L.circle([lat, lng], {
                color: '#8B2E2E',
                fillColor: '#B99A5B',
                fillOpacity: 0.15,
                radius: 50000
            }).addTo(currentMap);
        } else {
            L.popup()
                .setLatLng([20, 0])
                .setContent(`
                    <div style="text-align: center; padding: 10px;">
                        <p style="color: #1C1712; font-weight: bold; margin-top: 6px;">Localização não encontrada</p>
                        <p style="color: #3A3229; font-size: 0.9rem;">${escapeHtml(lugar)}</p>
                    </div>
                `)
                .openOn(currentMap);
        }

        setTimeout(() => {
            if (currentMap) {
                currentMap.invalidateSize();
            }
        }, 300);

    } catch (error) {
        console.error('Erro ao criar mapa:', error);
    }
}

function mostrarMapa(lugar, nomeEvento) {
    const modal = document.getElementById('mapModal');
    const mapContainer = document.getElementById('map');

    if (!modal || !mapContainer) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    mapContainer.innerHTML = `
        <div class="flex items-center justify-center h-full">
            <div class="text-center">
                <div class="loading-spinner mx-auto mb-4"></div>
                <p>Carregando mapa...</p>
            </div>
        </div>
    `;

    setTimeout(() => {
        buscarCoordenadasPorNome(lugar, nomeEvento);
    }, 300);
}

// ============================================
// Scroll Infinito
// ============================================
function carregarMaisEventos() {
    if (isLoading || todosEventosCarregados) return;
    isLoading = true;

    setTimeout(() => {
        currentPage++;
        renderTimeline();
        isLoading = false;
    }, 500);
}

function observeTimelineItems() {
    const items = document.querySelectorAll('.timeline-item');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    items.forEach(item => observer.observe(item));
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    document.getElementById('aplicarFiltros').addEventListener('click', () => {
        aplicarFiltros();
    });

    document.getElementById('limparFiltros').addEventListener('click', () => {
        document.getElementById('lugarFilter').value = '';
        document.getElementById('anoFilter').value = '';
        document.getElementById('periodoFilter').value = '';
        aplicarFiltros();
    });

    document.getElementById('fecharModal').addEventListener('click', () => {
        document.getElementById('saberMaisModal').classList.add('hidden');
        document.getElementById('saberMaisModal').classList.remove('flex');
    });

    document.getElementById('fecharMapModal').addEventListener('click', () => {
        document.getElementById('mapModal').classList.add('hidden');
        document.getElementById('mapModal').classList.remove('flex');
        if (currentMap) {
            currentMap.remove();
            currentMap = null;
        }
    });

    window.addEventListener('click', (e) => {
        const modal = document.getElementById('saberMaisModal');
        const mapModal = document.getElementById('mapModal');
        if (e.target === modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        if (e.target === mapModal) {
            mapModal.classList.add('hidden');
            mapModal.classList.remove('flex');
            if (currentMap) {
                currentMap.remove();
                currentMap = null;
            }
        }
    });

    // Bloqueio de navegação para Galeria e Jogo quando não estiver logado
    const linksRestritos = document.querySelectorAll('[data-requires-auth]');
    linksRestritos.forEach(link => {
        link.addEventListener('click', (e) => {
            const token = localStorage.getItem('chronohistory_token');
            const user = localStorage.getItem('chronohistory_user');
            if (!token && !user) {
                e.preventDefault();
                const destino = link.getAttribute('href') && link.getAttribute('href').includes('galeria') ? 'a Galeria Histórica de Imagens' : 'o Jogo Interativo';
                alert(`Acesso restrito! Você precisa estar logado para acessar ${destino}.`);
                window.location.href = 'login.html';
            }
        });
    });
}

// ============================================


// ============================================
// Mostrar Erro
// ============================================
function mostrarErro(mensagem) {
    const container = document.getElementById('timelineItems');
    container.innerHTML = `
        <div class="text-center py-16">
            <p style="color: var(--seal-light);">${escapeHtml(mensagem)}</p>
            <button onclick="location.reload()" class="action-btn-saber" style="margin-top: 1.25rem;">
                Tentar Novamente
            </button>
        </div>
    `;
}