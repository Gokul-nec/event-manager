let currentApprovalFilter = '';

function genericPagination(navId, totalPages, page, loadFn) {
    const nav = document.getElementById(navId);
    nav.innerHTML = '';
    if (totalPages <= 1) return;
    const makeItem = (label, targetPage, disabled = false, active = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = label;
        a.addEventListener('click', (e) => { e.preventDefault(); if (!disabled) loadFn(targetPage); });
        li.appendChild(a);
        return li;
    };
    nav.appendChild(makeItem('Prev', page - 1, page <= 1));
    for (let i = 1; i <= totalPages; i++) nav.appendChild(makeItem(String(i), i, false, i === page));
    nav.appendChild(makeItem('Next', page + 1, page >= totalPages));
}

function approvalBadgeClass(approval) {
    switch (approval) {
        case 'pending': return 'approval-pending';
        case 'approved': return 'approval-approved';
        case 'rejected': return 'approval-rejected';
        default: return 'bg-secondary';
    }
}

/* ---------------- STATS ---------------- */
async function loadStats() {
    const { ok, data } = await apiFetch('/admin/stats');
    if (!ok) return;
    document.getElementById('statTotalEvents').textContent = data.total_events;
    const pendingEl = document.getElementById('statPendingEvents');
    if (pendingEl) pendingEl.textContent = data.pending_events || 0;
    const filterPendingEl = document.getElementById('filterPendingCount');
    if (filterPendingEl) filterPendingEl.textContent = data.pending_events || 0;
    document.getElementById('statTotalStudents').textContent = data.total_students;
    document.getElementById('statTotalOrganizers').textContent = data.total_organizers;
    document.getElementById('statTotalRegs').textContent = data.total_registrations;
}

/* ---------------- EVENTS TAB ---------------- */
function eventRowHtml(ev) {
    const approval = ev.approval_status || 'approved';
    let approvalActionBtn = '';

    if (approval === 'pending') {
        approvalActionBtn = `
            <button class="btn btn-sm btn-success me-1" data-approve-id="${ev.id}" data-title="${escapeHtml(ev.title)}" title="Approve & Post Event">
                <i class="bi bi-check-circle"></i> Approve
            </button>
            <button class="btn btn-sm btn-outline-danger me-1" data-reject-id="${ev.id}" data-title="${escapeHtml(ev.title)}" title="Reject Event">
                <i class="bi bi-x-circle"></i> Reject
            </button>`;
    } else if (approval === 'approved') {
        approvalActionBtn = `
            <button class="btn btn-sm btn-outline-warning me-1" data-pending-id="${ev.id}" data-title="${escapeHtml(ev.title)}" title="Mark as Pending">
                <i class="bi bi-clock-history"></i> Pending
            </button>
            <button class="btn btn-sm btn-outline-danger me-1" data-reject-id="${ev.id}" data-title="${escapeHtml(ev.title)}" title="Reject Event">
                <i class="bi bi-x-circle"></i> Reject
            </button>`;
    } else if (approval === 'rejected') {
        approvalActionBtn = `
            <button class="btn btn-sm btn-success me-1" data-approve-id="${ev.id}" data-title="${escapeHtml(ev.title)}" title="Approve & Post Event">
                <i class="bi bi-check-circle"></i> Approve
            </button>
            <button class="btn btn-sm btn-outline-warning me-1" data-pending-id="${ev.id}" data-title="${escapeHtml(ev.title)}" title="Mark as Pending">
                <i class="bi bi-clock-history"></i> Pending
            </button>`;
    }

    return `
    <tr>
        <td><a href="/events/${ev.id}">${escapeHtml(ev.title)}</a></td>
        <td>${escapeHtml(ev.organizer_name || '-')}</td>
        <td>${formatDate(ev.date)}</td>
        <td><span class="badge bg-secondary-subtle text-dark">${escapeHtml(ev.category)}</span></td>
        <td>${ev.registered_count}/${ev.max_participants}</td>
        <td><span class="badge ${statusBadgeClass(ev.status)}">${escapeHtml(ev.status)}</span></td>
        <td><span class="badge ${approvalBadgeClass(approval)}"><i class="bi ${approval === 'approved' ? 'bi-check-circle' : approval === 'pending' ? 'bi-clock' : 'bi-x-circle'}"></i> ${escapeHtml(approval)}</span></td>
        <td class="text-end">
            ${approvalActionBtn}
            <a href="/events/${ev.id}/edit" class="btn btn-sm btn-outline-secondary" title="Edit"><i class="bi bi-pencil"></i></a>
            <button class="btn btn-sm btn-outline-danger" data-delete-id="${ev.id}" data-title="${escapeHtml(ev.title)}" title="Delete">
                <i class="bi bi-trash"></i>
            </button>
        </td>
    </tr>`;
}

async function loadAllEvents(page = 1) {
    const tbody = document.getElementById('eventsTableBody');
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>`;

    let url = `/admin/events?page=${page}&per_page=8`;
    if (currentApprovalFilter) {
        url += `&approval=${encodeURIComponent(currentApprovalFilter)}`;
    }

    const { ok, data } = await apiFetch(url);
    if (!ok || !data.events.length) {
        tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="bi bi-calendar-x fs-1"></i><p class="mt-2">No events found.</p></div></td></tr>`;
        genericPagination('eventsPagination', 0, 1, loadAllEvents);
        return;
    }

    tbody.innerHTML = data.events.map(eventRowHtml).join('');
    genericPagination('eventsPagination', data.pages, data.page, loadAllEvents);

    // Bind Approve handlers
    tbody.querySelectorAll('button[data-approve-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.approveId;
            const title = btn.dataset.title;
            const confirmed = await confirmAction('Approve Event', `Approve "${title}" and post it publicly for registrations?`, 'Approve Event');
            if (!confirmed) return;

            const res = await apiFetch(`/admin/events/${id}/approval`, {
                method: 'PUT',
                body: { approval_status: 'approved' }
            });
            if (res.ok) {
                showToast(`Event "${title}" has been approved and posted!`, 'success');
                loadAllEvents(page);
                loadStats();
            } else {
                showToast(res.data?.error || 'Failed to approve event', 'danger');
            }
        });
    });

    // Bind Reject handlers
    tbody.querySelectorAll('button[data-reject-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.rejectId;
            const title = btn.dataset.title;
            const confirmed = await confirmAction('Reject Event', `Set "${title}" approval status to rejected?`, 'Reject');
            if (!confirmed) return;

            const res = await apiFetch(`/admin/events/${id}/approval`, {
                method: 'PUT',
                body: { approval_status: 'rejected' }
            });
            if (res.ok) {
                showToast(`Event "${title}" status set to rejected.`, 'warning');
                loadAllEvents(page);
                loadStats();
            } else {
                showToast(res.data?.error || 'Failed to reject event', 'danger');
            }
        });
    });

    // Bind Pending handlers
    tbody.querySelectorAll('button[data-pending-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.pendingId;
            const title = btn.dataset.title;
            const confirmed = await confirmAction('Mark Event Pending', `Change "${title}" approval status back to pending?`, 'Set Pending');
            if (!confirmed) return;

            const res = await apiFetch(`/admin/events/${id}/approval`, {
                method: 'PUT',
                body: { approval_status: 'pending' }
            });
            if (res.ok) {
                showToast(`Event "${title}" is now pending approval.`, 'info');
                loadAllEvents(page);
                loadStats();
            } else {
                showToast(res.data?.error || 'Failed to update event status', 'danger');
            }
        });
    });

    // Bind Delete handlers
    tbody.querySelectorAll('button[data-delete-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.deleteId;
            const title = btn.dataset.title;
            const confirmed = await confirmAction('Delete Event', `Delete "${title}"? This cannot be undone.`, 'Delete');
            if (!confirmed) return;
            const res = await apiFetch(`/events/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Event deleted.', 'success');
                loadAllEvents(page);
                loadStats();
            } else {
                showToast(res.data?.error || 'Failed to delete event', 'danger');
            }
        });
    });
}

/* ---------------- USERS TAB ---------------- */
function userRowHtml(u) {
    return `
    <tr>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="badge role-badge-${u.role} text-white">${escapeHtml(u.role)}</span></td>
        <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
    </tr>`;
}

async function loadUsers(page = 1) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>`;

    const { ok, data } = await apiFetch(`/admin/users?page=${page}&per_page=10`);
    if (!ok || !data.users.length) {
        tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="bi bi-people fs-1"></i><p class="mt-2">No users found.</p></div></td></tr>`;
        genericPagination('usersPagination', 0, 1, loadUsers);
        return;
    }
    tbody.innerHTML = data.users.map(userRowHtml).join('');
    genericPagination('usersPagination', data.pages, data.page, loadUsers);
}

/* ---------------- REGISTRATIONS TAB ---------------- */
function regRowHtml(r) {
    return `
    <tr>
        <td>${escapeHtml(r.student_name)}<br><small class="text-muted">${escapeHtml(r.student_email)}</small></td>
        <td><a href="/events/${r.event_id}">${escapeHtml(r.event_title || 'Untitled')}</a></td>
        <td>${escapeHtml(r.event_venue || '-')}</td>
        <td><span class="badge ${r.status === 'registered' ? 'text-bg-success' : 'text-bg-secondary'}">${escapeHtml(r.status)}</span></td>
        <td>${r.registered_at ? new Date(r.registered_at).toLocaleDateString() : '-'}</td>
    </tr>`;
}

async function loadAllRegistrations(page = 1) {
    const tbody = document.getElementById('regsTableBody');
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>`;

    const { ok, data } = await apiFetch(`/admin/registrations?page=${page}&per_page=10`);
    if (!ok || !data.registrations.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="bi bi-ticket-perforated fs-1"></i><p class="mt-2">No registrations found.</p></div></td></tr>`;
        genericPagination('regsPagination', 0, 1, loadAllRegistrations);
        return;
    }
    tbody.innerHTML = data.registrations.map(regRowHtml).join('');
    genericPagination('regsPagination', data.pages, data.page, loadAllRegistrations);
}

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadAllEvents(1);
    loadUsers(1);
    loadAllRegistrations(1);

    // Bind Approval Filters
    const filterGroup = document.getElementById('approvalFilterGroup');
    if (filterGroup) {
        filterGroup.querySelectorAll('button[data-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                filterGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentApprovalFilter = btn.dataset.filter;
                loadAllEvents(1);
            });
        });
    }
});
