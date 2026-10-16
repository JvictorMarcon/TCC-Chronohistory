// Alterna a visibilidade dos campos de senha (ícone de olho).
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.toggle-password').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var input = document.getElementById(btn.getAttribute('data-target'));
            if (!input) return;

            var show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            btn.classList.toggle('is-visible', show);

            var label = show ? 'Ocultar senha' : 'Mostrar senha';
            btn.setAttribute('aria-label', label);
            btn.title = label;
        });
    });
});
