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
    return 'login.html';
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

function injetarEstiloBoasVindas() {
    if (document.getElementById('boas-vindas-style')) return;
    const style = document.createElement('style');
    style.id = 'boas-vindas-style';
    style.textContent = `
        .boas-vindas-toast {
            position: fixed;
            top: 14%;
            left: 50%;
            transform: translate(-50%, -10px);
            background: rgba(20, 16, 12, 0.94);
            color: #f5e6c8;
            border: 1px solid rgba(201, 162, 39, 0.5);
            padding: 1.1rem 2.4rem;
            border-radius: 10px;
            font-family: 'Fraunces', 'Playfair Display', serif;
            font-size: 1.35rem;
            font-weight: 600;
            letter-spacing: 0.02em;
            text-align: center;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            z-index: 99999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 1s ease, transform 1s ease;
        }
        .boas-vindas-toast.visivel {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    `;
    document.head.appendChild(style);
}

function mostrarBoasVindas() {
    const user = sessionStorage.getItem('chronohistory_welcome');
    if (!user) return;
    sessionStorage.removeItem('chronohistory_welcome');

    injetarEstiloBoasVindas();

    const toast = document.createElement('div');
    toast.className = 'boas-vindas-toast';
    toast.textContent = `Olá, ${user}!`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visivel'));

    setTimeout(() => {
        toast.classList.remove('visivel');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 2800);
}

document.addEventListener('DOMContentLoaded', async () => {
    const sessao = await obterSessao();
    atualizarNavegacao(sessao);
    mostrarBoasVindas();
});
