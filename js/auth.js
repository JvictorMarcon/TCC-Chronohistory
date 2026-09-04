const AUTH_API_BASE = 'https://backend-tcc-cronohistory.onrender.com';

function lerUsuarioLocal() {
    try {
        const usuario = JSON.parse(localStorage.getItem('chronohistory_user'));
        return usuario && usuario.user ? { ...usuario, autenticado: true } : null;
    } catch (_) {
        return null;
    }
}

function limparSessaoLocal() {
    localStorage.removeItem('chronohistory_token');
    localStorage.removeItem('chronohistory_user');
}

// Resolve o caminho para login.html independente se estamos na raiz ou em html/
function resolverCaminhoLogin() {
    const path = window.location.pathname;
    // Se estamos dentro da pasta html/ (ex: html/galeria.html), o login está no mesmo nível
    if (path.includes('/html/')) return 'login.html';
    // Se estamos na raiz (index.html), o login está em html/
    return 'html/login.html';
}

async function obterSessao() {
    try {
        const response = await fetch(`${AUTH_API_BASE}/me`, {
            credentials: 'include',
            cache: 'no-store'
        });
        if (response.ok) return await response.json();
        return null;
    } catch (_) {
        return lerUsuarioLocal();
    }
}

function atualizarNavegacao(sessao) {
    const loginLinks = document.querySelectorAll('#navLoginBtn, #mobileLoginBtn');
    const linksRestritos = document.querySelectorAll('[data-requires-auth]');
    const autenticado = Boolean(sessao && sessao.autenticado && sessao.user);
    const paginaRestrita = window.location.pathname.endsWith('galeria.html') ||
        window.location.pathname.endsWith('jogo.html');

    linksRestritos.forEach(link => {
        link.classList.toggle('hidden', !autenticado);
        link.setAttribute('aria-hidden', String(!autenticado));
    });

    loginLinks.forEach(link => {
        if (!autenticado) return;
        link.textContent = 'Logout';
        link.href = '#';
        link.onclick = async event => {
            event.preventDefault();
            try {
                await fetch(`${AUTH_API_BASE}/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
            } finally {
                limparSessaoLocal();
                window.location.href = resolverCaminhoLogin();
            }
        };
    });

    if (!autenticado && paginaRestrita) {
        window.location.href = resolverCaminhoLogin();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const sessao = await obterSessao();
    atualizarNavegacao(sessao);
});
