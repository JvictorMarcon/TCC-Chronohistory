const AUTH_API_BASE = 'https://backend-tcc-cronohistory.onrender.com';

function lerUsuarioLocal() {
    try {
        const raw = localStorage.getItem('chronohistory_user');
        if (!raw) return null;
        const usuario = JSON.parse(raw);
        if (!usuario) return null;
        const username = usuario.user || usuario.nome;
        return username ? { ...usuario, user: username, autenticado: true } : null;
    } catch (_) {
        return null;
    }
}

function limparSessaoLocal() {
    localStorage.removeItem('chronohistory_token');
    localStorage.removeItem('chronohistory_user');
}

function resolverCaminhoLogin() {
    const path = window.location.pathname;
    if (path.includes('/html/')) return 'login.html';
    return 'html/login.html';
}

async function obterSessao() {
    try {
        const response = await fetch(`${AUTH_API_BASE}/me`, {
            credentials: 'include',
            cache: 'no-store'
        });
        if (response.ok) {
            const data = await response.json();
            if (data && (data.autenticado || data.user)) {
                return { ...data, autenticado: true };
            }
        }
    } catch (_) {}
    return lerUsuarioLocal();
}

async function fazerLogout(event) {
    if (event) event.preventDefault();
    if (confirm('Deseja realmente encerrar a sessão e deslogar?')) {
        try {
            await fetch(`${AUTH_API_BASE}/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (_) {}
        limparSessaoLocal();
        window.location.href = resolverCaminhoLogin();
    }
}

function atualizarNavegacao(sessao) {
    const userLocal = lerUsuarioLocal();
    const userObj = (sessao && sessao.user) ? sessao : userLocal;
    const autenticado = Boolean(userObj && (userObj.autenticado || userObj.user));

    const loginLinks = document.querySelectorAll('#navLoginBtn, #mobileLoginBtn');
    const linksRestritos = document.querySelectorAll('[data-requires-auth]');

    // Exibe / oculta links da Galeria e Jogo
    linksRestritos.forEach(link => {
        if (autenticado) {
            link.classList.remove('hidden');
            link.removeAttribute('aria-hidden');
            link.style.display = '';
        } else {
            link.classList.add('hidden');
            link.setAttribute('aria-hidden', 'true');
        }
    });

    // Configura botões de Login / Usuario / Logout
    loginLinks.forEach(link => {
        if (!autenticado) {
            link.textContent = 'Login';
            link.href = resolverCaminhoLogin();
            link.onclick = null;
            link.title = 'Entrar na sua conta';
        } else {
            link.textContent = 'Logout';
            link.href = '#';
            link.title = 'Clique para sair da conta';
            link.onclick = fazerLogout;
        }
    });

    // Redireciona de páginas restritas se não estiver logado
    const path = window.location.pathname;
    const paginaRestrita = path.includes('galeria.html') || path.includes('jogo.html') || path.includes('adm.html');
    if (!autenticado && paginaRestrita) {
        alert('Acesso restrito! Faça login para continuar.');
        window.location.href = resolverCaminhoLogin();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const sessao = await obterSessao();
    atualizarNavegacao(sessao);
});
