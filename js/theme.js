// Alterna entre tema claro/escuro e salva a preferência do usuário.
// O estado inicial (antes deste arquivo carregar) já é aplicado por um
// script inline no <head> de cada página, para evitar flash de tema errado.
document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('themeToggle');
    if (!btn) return;

    btn.addEventListener('click', function () {
        var root = document.documentElement;
        var isLight = root.getAttribute('data-theme') === 'light';

        if (isLight) {
            root.removeAttribute('data-theme');
        } else {
            root.setAttribute('data-theme', 'light');
        }

        try {
            localStorage.setItem('chronohistory_theme', isLight ? 'dark' : 'light');
        } catch (e) {
            // localStorage indisponível (modo privado, etc.) — tema ainda funciona, só não persiste.
        }
    });
});
