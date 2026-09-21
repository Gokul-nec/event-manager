function approvalBadgeClass(approval) {
    switch (approval) {
        case 'pending': return 'approval-pending';
        case 'approved': return 'approval-approved';
        case 'rejected': return 'approval-rejected';
        default: return 'bg-secondary';
    }
}

function eventRowHtml(ev) {
    const approval = ev.approval_status || 'approved';
    let approvalLabel = '';
    if (approval === 'pending') {
        approvalLabel = `<span class="badge approval-pending" title="Awaiting Admin Approval"><i class="bi bi-clock"></i> Pending Approval</span>`;
    } else if (approval === 'approved') {
        approvalLabel = `<span class="badge approval-approved" title="Approved & Published"><i class="bi bi-check-circle"></i> Approved & Posted</span>`;
    } else if (approval === 'rejected') {
        approvalLabel = `<span class="badge approval-rejected" title="Rejected by Admin"><i class="bi bi-x-circle"></i> Rejected</span>`;
    }

    return `
    <tr>
        <td><a href="/events/${ev.id}">${escapeHtml(ev.title)}</a></td>
        <td>${formatDate(ev.date)}</td>
        <td><span class="badge bg-secondary-subtle text-dark">${escapeHtml(ev.category)}</span></td>
        <td>${ev.registered_count}/${ev.max_participants}</td>
        <td><span class="badge ${statusBadgeClass(ev.status)}">${escapeHtml(ev.status)}</span></td>
        <td>${approvalLabel}</td>
        <td class="text-end">
            <button class="btn btn-sm btn-outline-primary" data-view-regs="${ev.id}" data-title="${escapeHtml(ev.title)}" title="View Registrations">
                <i class="bi bi-people"></i>
            </button>
            <a href="/events/${ev.id}/edit" class="btn btn-sm btn-outline-secondary" title="Edit"><i class="bi bi-pencil"></i></a>
            <button class="btn btn-sm btn-outline-danger" data-delete-id="${ev.id}" data-title="${escapeHtml(ev.title)}" title="Delete">
                <i class="bi bi-trash"></i>
            </button>
        </td>
    </tr>`;
}

async function loadMyEvents(page = 1) {
    const tbody = document.getElementById('eventsTableBody');
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>`;

    const { ok, data } = await apiFetch(`/events?mine=true&page=${page}&per_page=8`);
    if (!ok || !data.events.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="bi bi-calendar-plus fs-1"></i><p class="mt-2">You haven't created any events yet.</p></div></td></tr>`;
        renderPagination(0, 1);
        return;
    }

    tbody.innerHTML = data.events.map(eventRowHtml).join('');
    renderPagination(data.pages, data.page);

    tbody.querySelectorAll('button[data-delete-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.deleteId;
            const title = btn.dataset.title;
            const confirmed = await confirmAction('Delete Event', `Delete "${title}"? This cannot be undone.`, 'Delete');
            if (!confirmed) return;
            const res = await apiFetch(`/events/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Event deleted.', 'success');
                loadMyEvents(page);
            } else {
                showToast(res.data?.error || 'Failed to delete event', 'danger');
            }
        });
    });

    tbody.querySelectorAll('button[data-view-regs]').forEach(btn => {
        btn.addEventListener('click', () => showRegistrations(btn.dataset.viewRegs, btn.dataset.title));
    });
}

async function showRegistrations(eventId, title) {
    document.getElementById('registrationsModalTitle').textContent = `Registrations - ${title}`;
    const body = document.getElementById('registrationsModalBody');
    body.innerHTML = `<div class="spinner-wrap"><div class="spinner-border text-primary"></div></div>`;
    const modal = new bootstrap.Modal(document.getElementById('registrationsModal'));
    modal.show();

    const { ok, data } = await apiFetch(`/registrations?event_id=${eventId}&per_page=100`);
    if (!ok || !data.registrations.length) {
        body.innerHTML = `<div class="empty-state"><i class="bi bi-people fs-1"></i><p class="mt-2">No registrations yet for this event.</p></div>`;
        return;
    }

    const rows = data.registrations.map(r => `
        <tr>
            <td>${escapeHtml(r.student_name)}</td>
            <td>${escapeHtml(r.student_email)}</td>
            <td><span class="badge ${r.status === 'registered' ? 'text-bg-success' : 'text-bg-secondary'}">${escapeHtml(r.status)}</span></td>
            <td>${r.registered_at ? new Date(r.registered_at).toLocaleDateString() : '-'}</td>
        </tr>`).join('');

    body.innerHTML = `
        <table class="table table-striped">
            <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Registered On</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
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
        a.addEventListener('click', (e) => { e.preventDefault(); if (!disabled) loadMyEvents(targetPage); });
        li.appendChild(a);
        return li;
    };
    nav.appendChild(makeItem('Prev', page - 1, page <= 1));
    for (let i = 1; i <= totalPages; i++) nav.appendChild(makeItem(String(i), i, false, i === page));
    nav.appendChild(makeItem('Next', page + 1, page >= totalPages));
}

document.addEventListener('DOMContentLoaded', () => loadMyEvents(1));
