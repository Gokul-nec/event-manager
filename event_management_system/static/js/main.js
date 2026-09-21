/* ==========================================================
   Shared helpers used across all pages
   ========================================================== */

const API_BASE = '/api';

/** Generic fetch wrapper that always sends/receives JSON + cookies */
async function apiFetch(url, options = {}) {
    const opts = {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        ...options,
    };
    if (opts.body && typeof opts.body !== 'string') {
        opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(API_BASE + url, opts);
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    return { ok: res.ok, status: res.status, data };
}

/** Toast notification */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) { alert(message); return; }
    const icon = type === 'success' ? 'bi-check-circle-fill'
        : type === 'danger' ? 'bi-exclamation-triangle-fill'
        : 'bi-info-circle-fill';
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-bg-${type} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body"><i class="bi ${icon} me-2"></i>${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>`;
    container.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

/** Reusable confirmation modal. Returns a Promise<boolean>. */
function confirmAction(title, body, confirmLabel = 'Confirm') {
    return new Promise((resolve) => {
        const modalEl = document.getElementById('confirmModal');
        const modal = new bootstrap.Modal(modalEl);
        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalBody').textContent = body;
        const actionBtn = document.getElementById('confirmModalActionBtn');
        actionBtn.textContent = confirmLabel;

        const cleanup = (result) => {
            actionBtn.removeEventListener('click', onConfirm);
            modalEl.removeEventListener('hidden.bs.modal', onHide);
            modal.hide();
            resolve(result);
        };
        const onConfirm = () => cleanup(true);
        const onHide = () => cleanup(false);

        actionBtn.addEventListener('click', onConfirm);
        modalEl.addEventListener('hidden.bs.modal', onHide, { once: true });
        modal.show();
    });
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(isoDate) {
    if (!isoDate) return '';
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function statusBadgeClass(status) {
    return `status-${status}`;
}

/** Global auth state, populated on every page load */
let CURRENT_USER = null;

async function loadCurrentUser() {
    const { data } = await apiFetch('/auth/me');
    CURRENT_USER = data ? data.user : null;
    renderNavbar();
    return CURRENT_USER;
}

function renderNavbar() {
    const guestEls = document.querySelectorAll('.nav-guest-only');
    const authEls = document.querySelectorAll('.nav-auth-only');
    const organizerEls = document.querySelectorAll('.nav-organizer-only');

    if (CURRENT_USER) {
        guestEls.forEach(el => el.classList.add('d-none'));
        authEls.forEach(el => el.classList.remove('d-none'));
        organizerEls.forEach(el => {
            if (CURRENT_USER.role === 'organizer') el.classList.remove('d-none');
            else el.classList.add('d-none');
        });
        const nameEl = document.getElementById('navUserName');
        const roleEl = document.getElementById('navUserRole');
        if (nameEl) nameEl.textContent = CURRENT_USER.name;
        if (roleEl) roleEl.textContent = CURRENT_USER.role;
    } else {
        guestEls.forEach(el => el.classList.remove('d-none'));
        authEls.forEach(el => el.classList.add('d-none'));
        organizerEls.forEach(el => el.classList.add('d-none'));
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadCurrentUser();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await apiFetch('/auth/logout', { method: 'POST' });
            window.location.href = '/';
        });
    }
});
