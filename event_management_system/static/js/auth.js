function showFormAlert(message) {
    const alertEl = document.getElementById('formAlert');
    if (!alertEl) return;
    alertEl.textContent = message;
    alertEl.classList.remove('d-none');
}

function hideFormAlert() {
    const alertEl = document.getElementById('formAlert');
    if (alertEl) alertEl.classList.add('d-none');
}

function toggleBtnLoading(btnId, spinnerId, loading) {
    const btn = document.getElementById(btnId);
    const spinner = document.getElementById(spinnerId);
    if (!btn) return;
    btn.disabled = loading;
    spinner.classList.toggle('d-none', !loading);
}

/* ---------------- LOGIN ---------------- */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideFormAlert();

        if (!loginForm.checkValidity()) {
            loginForm.classList.add('was-validated');
            return;
        }

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        toggleBtnLoading('loginBtn', 'loginSpinner', true);
        const { ok, data } = await apiFetch('/auth/login', {
            method: 'POST',
            body: { email, password },
        });
        toggleBtnLoading('loginBtn', 'loginSpinner', false);

        if (!ok) {
            showFormAlert(data?.error || 'Login failed. Please try again.');
            return;
        }
        window.location.href = '/dashboard';
    });
}

/* ---------------- REGISTER ---------------- */
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideFormAlert();

        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const confirmInput = document.getElementById('confirmPassword');

        if (password !== confirmPassword) {
            confirmInput.setCustomValidity('mismatch');
        } else {
            confirmInput.setCustomValidity('');
        }

        if (!registerForm.checkValidity()) {
            registerForm.classList.add('was-validated');
            return;
        }

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const role = document.querySelector('input[name="role"]:checked').value;

        toggleBtnLoading('registerBtn', 'registerSpinner', true);
        const { ok, data } = await apiFetch('/auth/register', {
            method: 'POST',
            body: { name, email, password, role },
        });
        toggleBtnLoading('registerBtn', 'registerSpinner', false);

        if (!ok) {
            const errors = data?.errors;
            const msg = errors ? Object.values(errors).join(' ') : (data?.error || 'Registration failed.');
            showFormAlert(msg);
            return;
        }
        window.location.href = '/dashboard';
    });
}
