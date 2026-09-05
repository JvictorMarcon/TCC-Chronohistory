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
                    window.location.href = 'html/adm.html';
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

    processarEventos();
    preencherFiltros();
    aplicarFiltros();
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

            todosEventos.push({
                id: item.id || `${periodoIndex}`,
                nome: item.nome,
                ano: anoFormatado,
                anoOriginal,
                anoNumerico,
                lugar: item.lugar || 'Regiões diversas',
                oque_aconteceu: item.acontecimento || item.oque_aconteceu || '',
                oque_mudou: item.oque_mudou || '',
                periodoNome: item.periodo || 'Período histórico',
                periodoId: item.id || periodoIndex,
                periodoResumo: '',
                caracteristicas_principais: [],
                legado: '',
                curiosidades: [],
                figuras_principais: figuras.map(f => typeof f === 'string' ? { nome: f } : f),
                informacoes_adicionais: '',
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
                ${evento.lugar ? `<p class="modal-event-location">📍 ${escapeHtml(evento.lugar)}</p>` : ''}
            </div>

            ${evento.oque_aconteceu ? `
                <div class="modal-secao">
                    <h5 class="modal-secao-titulo">📜 O que aconteceu</h5>
                    <p class="modal-secao-texto">${escapeHtml(evento.oque_aconteceu)}</p>
                </div>
            ` : ''}

            ${evento.oque_mudou ? `
                <div class="modal-secao">
                    <h5 class="modal-secao-titulo">⚡ O que mudou</h5>
                    <p class="modal-secao-texto">${escapeHtml(evento.oque_mudou)}</p>
                </div>
            ` : ''}

            ${legado ? `
                <div class="modal-secao">
                    <h5 class="modal-secao-titulo">🏛️ Legado Histórico</h5>
                    <p class="modal-secao-texto">${escapeHtml(legado)}</p>
                </div>
            ` : ''}

            ${caracteristicas && caracteristicas.length > 0 ? `
                <div class="modal-secao">
                    <h5 class="modal-secao-titulo">✨ Características principais</h5>
                    <ul class="modal-lista">
                        ${caracteristicas.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            ${evento.figuras_principais && evento.figuras_principais.length > 0 ? `
                <div class="modal-secao">
                    <h5 class="modal-secao-titulo">👑 Figuras principais</h5>
                    <ul class="modal-lista">
                        ${evento.figuras_principais.map(f => `<li><strong>${escapeHtml(f.nome || f)}</strong>${f.papel ? ` — ${escapeHtml(f.papel)}` : ''}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            ${evento.informacoes_adicionais ? `
                <div class="modal-secao">
                    <h5 class="modal-secao-titulo">📖 Informações adicionais</h5>
                    <p class="modal-secao-texto">${escapeHtml(evento.informacoes_adicionais)}</p>
                </div>
            ` : ''}

            ${curiosidades && curiosidades.length > 0 ? `
                <div class="modal-secao">
                    <h5 class="modal-secao-titulo">💡 Curiosidades históricas</h5>
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
        'constantinopla': { lat: 41.0082, lng: 28.9784 }
    };

    for (const [key, coords] of Object.entries(coordenadas)) {
        if (lugarLower === key || lugarLower.includes(key)) {
            return coords;
        }
    }

    return { lat: 0, lng: 0 };
}

function buscarCoordenadasPorNome(lugar, nomeEvento) {
    const coordsCache = obterCoordenadas(lugar);
    if (coordsCache.lat !== 0 || coordsCache.lng !== 0) {
        criarMapaComCoordenadas(coordsCache.lat, coordsCache.lng, lugar, nomeEvento);
        return;
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(lugar)}&format=json&limit=1&accept-language=pt`;

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

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                const displayName = data[0].display_name || lugar;
                criarMapaComCoordenadas(lat, lng, displayName, nomeEvento);
            } else {
                criarMapaComCoordenadas(0, 0, lugar, nomeEvento);
            }
        })
        .catch(() => {
            criarMapaComCoordenadas(0, 0, lugar, nomeEvento);
        });
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

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
                window.location.href = 'html/login.html';
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