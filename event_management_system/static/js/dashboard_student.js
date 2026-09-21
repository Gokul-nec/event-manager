function regRowHtml(r) {
    const cancelDisabled = r.status !== 'registered';
    return `
    <tr>
        <td><a href="/events/${r.event_id}">${escapeHtml(r.event_title || 'Untitled')}</a></td>
        <td>${formatDate(r.event_date)}</td>
        <td>${escapeHtml(r.event_venue || '-')}</td>
        <td><span class="badge ${r.status === 'registered' ? 'text-bg-success' : 'text-bg-secondary'}">${escapeHtml(r.status)}</span></td>
        <td>${r.registered_at ? new Date(r.registered_at).toLocaleDateString() : '-'}</td>
        <td class="text-end">
            <button class="btn btn-sm btn-outline-danger" data-reg-id="${r.id}" data-event-title="${escapeHtml(r.event_title)}"
                ${cancelDisabled ? 'disabled' : ''}>
                <i class="bi bi-x-circle"></i> Cancel
            </button>
        </td>
    </tr>`;
}

async function loadRegistrations(page = 1) {
    const tbody = document.getElementById('regTableBody');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>`;

    const { ok, data } = await apiFetch(`/registrations?page=${page}&per_page=8`);
    if (!ok || !data.registrations.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="bi bi-ticket-perforated fs-1"></i><p class="mt-2">You haven't registered for any events yet.</p></div></td></tr>`;
        renderPagination(0, 1);
        return;
    }

    tbody.innerHTML = data.registrations.map(regRowHtml).join('');
    renderPagination(data.pages, data.page);

    tbody.querySelectorAll('button[data-reg-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const regId = btn.dataset.regId;
            const title = btn.dataset.eventTitle;
            const confirmed = await confirmAction('Cancel Registration', `Cancel your registration for "${title}"?`, 'Yes, Cancel');
            if (!confirmed) return;
            const res = await apiFetch(`/registrations/${regId}/cancel`, { method: 'PUT' });
            if (res.ok) {
                showToast('Registration cancelled.', 'success');
                loadRegistrations(page);
            } else {
                showToast(res.data?.error || 'Failed to cancel', 'danger');
            }
        });
    });
}

function renderPagination(totalPages, page) {
    const nav = document.getElementById('pagination');
    nav.innerHTML = '';
    if (totalPages <= 1) return;
    const makeItem = (label, targetPage, disabled = false, active = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = label;
        a.addEventListener('click', (e) => { e.preventDefault(); if (!disabled) loadRegistrations(targetPage); });
        li.appendChild(a);
        return li;
    };
    nav.appendChild(makeItem('Prev', page - 1, page <= 1));
    for (let i = 1; i <= totalPages; i++) nav.appendChild(makeItem(String(i), i, false, i === page));
    nav.appendChild(makeItem('Next', page + 1, page >= totalPages));
}

document.addEventListener('DOMContentLoaded', () => loadRegistrations(1));
