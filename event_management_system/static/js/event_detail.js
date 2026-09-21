function approvalBadgeClass(approval) {
    switch (approval) {
        case 'pending': return 'approval-pending';
        case 'approved': return 'approval-approved';
        case 'rejected': return 'approval-rejected';
        default: return 'bg-secondary';
    }
}

function detailHtml(ev) {
    const seatsPct = ev.max_participants > 0
        ? Math.min(100, Math.round((ev.registered_count / ev.max_participants) * 100))
        : 0;
    const full = ev.seats_left <= 0;
    const isPast = ['completed', 'cancelled'].includes(ev.status);
    const approval = ev.approval_status || 'approved';

    const canManage = CURRENT_USER && (
        CURRENT_USER.role === 'admin' ||
        (CURRENT_USER.role === 'organizer' && CURRENT_USER.id === ev.organizer_id)
    );

    let approvalBanner = '';
    if (approval === 'pending') {
        approvalBanner = `
        <div class="alert alert-warning d-flex align-items-center mb-4" role="alert">
            <i class="bi bi-clock-history fs-4 me-3"></i>
            <div>
                <strong>Pending Admin Approval:</strong> This event has been created by the organizer and is currently awaiting admin approval before being published to the public event catalog.
            </div>
        </div>`;
    } else if (approval === 'rejected') {
        approvalBanner = `
        <div class="alert alert-danger d-flex align-items-center mb-4" role="alert">
            <i class="bi bi-x-octagon fs-4 me-3"></i>
            <div>
                <strong>Event Rejected:</strong> This event was rejected by an administrator and is not visible to public users.
            </div>
        </div>`;
    }

    let actionHtml = '';
    if (CURRENT_USER && CURRENT_USER.role === 'student') {
        if (approval !== 'approved') {
            actionHtml = `<button class="btn btn-secondary w-100" disabled><i class="bi bi-lock"></i> Pending Approval</button>`;
        } else if (ev.is_registered) {
            actionHtml = `<button class="btn btn-outline-danger w-100" id="cancelRegBtn"><i class="bi bi-x-circle"></i> Cancel Registration</button>`;
        } else if (isPast) {
            actionHtml = `<button class="btn btn-secondary w-100" disabled>Registration Closed</button>`;
        } else if (full) {
            actionHtml = `<button class="btn btn-secondary w-100" disabled>Event Full</button>`;
        } else {
            actionHtml = `<button class="btn btn-brand w-100" id="registerBtn"><i class="bi bi-ticket-perforated"></i> Register Now</button>`;
        }
    } else if (!CURRENT_USER) {
        if (approval !== 'approved') {
            actionHtml = `<button class="btn btn-secondary w-100" disabled><i class="bi bi-lock"></i> Pending Approval</button>`;
        } else {
            actionHtml = `<a href="/login" class="btn btn-brand w-100"><i class="bi bi-box-arrow-in-right"></i> Login to Register</a>`;
        }
    }

    let manageHtml = '';
    if (canManage) {
        let adminApprovalBtns = '';
        if (CURRENT_USER.role === 'admin') {
            if (approval === 'pending' || approval === 'rejected') {
                adminApprovalBtns += `<button class="btn btn-success flex-fill" id="approveEventDetailBtn"><i class="bi bi-check-circle"></i> Approve & Post Event</button>`;
            }
            if (approval === 'pending' || approval === 'approved') {
                adminApprovalBtns += `<button class="btn btn-outline-danger flex-fill" id="rejectEventDetailBtn"><i class="bi bi-x-circle"></i> Reject Event</button>`;
            }
        }
        manageHtml = `
        <div class="d-flex flex-column gap-2 mt-3">
            ${adminApprovalBtns ? `<div class="d-flex gap-2">${adminApprovalBtns}</div>` : ''}
            <div class="d-flex gap-2">
                <a href="/events/${ev.id}/edit" class="btn btn-outline-secondary flex-fill"><i class="bi bi-pencil"></i> Edit</a>
                <button class="btn btn-outline-danger flex-fill" id="deleteEventBtn"><i class="bi bi-trash"></i> Delete</button>
            </div>
        </div>`;
    }

    return `
    ${approvalBanner}
    <div class="row g-4">
        <div class="col-lg-8">
            <div class="card border-0 shadow-sm p-4">
                <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <span class="badge bg-secondary-subtle text-dark event-category-badge">${escapeHtml(ev.category)}</span>
                    <div class="d-flex gap-2">
                        <span class="badge ${statusBadgeClass(ev.status)}">${escapeHtml(ev.status)}</span>
                        <span class="badge ${approvalBadgeClass(approval)}"><i class="bi ${approval === 'approved' ? 'bi-check-circle' : approval === 'pending' ? 'bi-clock' : 'bi-x-circle'}"></i> ${escapeHtml(approval)}</span>
                    </div>
                </div>
                <h2 class="mt-3">${escapeHtml(ev.title)}</h2>
                <p class="text-muted">${escapeHtml(ev.description || 'No description provided.')}</p>
                <hr>
                <div class="row g-3">
                    <div class="col-sm-6"><i class="bi bi-calendar3 text-primary"></i> <strong>Date:</strong> ${formatDate(ev.date)}</div>
                    <div class="col-sm-6"><i class="bi bi-clock text-primary"></i> <strong>Time:</strong> ${formatTime(ev.time)}</div>
                    <div class="col-sm-6"><i class="bi bi-geo-alt text-primary"></i> <strong>Venue:</strong> ${escapeHtml(ev.venue)}</div>
                    <div class="col-sm-6"><i class="bi bi-person-badge text-primary"></i> <strong>Organizer:</strong> ${escapeHtml(ev.organizer_name || 'Unknown')}</div>
                </div>
            </div>
        </div>
        <div class="col-lg-4">
            <div class="card border-0 shadow-sm p-4">
                <h5 class="mb-3">Availability</h5>
                <div class="progress seats-progress mb-2">
                    <div class="progress-bar" style="width:${seatsPct}%; background-color:${full ? '#dc2626' : '#4f46e5'};"></div>
                </div>
                <p class="text-muted small">${ev.registered_count} registered &middot; ${ev.seats_left} of ${ev.max_participants} seats left</p>
                ${actionHtml}
                ${manageHtml}
            </div>
        </div>
    </div>`;
}

async function loadEventDetail() {
    const eventId = document.getElementById('eventId').dataset.eventId;
    const container = document.getElementById('eventDetailContent');

    const { ok, data } = await apiFetch(`/events/${eventId}`);
    if (!ok) {
        container.innerHTML = `<div class="empty-state"><i class="bi bi-exclamation-triangle fs-1"></i><p class="mt-2">Event not found.</p><a href="/events" class="btn btn-brand mt-2">Back to Events</a></div>`;
        return;
    }

    const ev = data.event;
    container.innerHTML = detailHtml(ev);

    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const confirmed = await confirmAction('Confirm Registration', `Register for "${ev.title}"?`, 'Register');
            if (!confirmed) return;
            const { ok, data } = await apiFetch('/registrations', { method: 'POST', body: { event_id: ev.id } });
            if (ok) {
                showToast('Registered successfully!', 'success');
                loadEventDetail();
            } else {
                showToast(data?.error || 'Registration failed', 'danger');
            }
        });
    }

    const cancelBtn = document.getElementById('cancelRegBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', async () => {
            const confirmed = await confirmAction('Cancel Registration', `Are you sure you want to cancel your registration for "${ev.title}"?`, 'Yes, Cancel');
            if (!confirmed) return;
            // Need the registration id - fetch student's registrations to find it
            const { ok, data: regsData } = await apiFetch(`/registrations?event_id=${ev.id}&per_page=1`);
            const reg = regsData?.registrations?.find(r => r.event_id === ev.id && r.status === 'registered');
            if (!reg) {
                showToast('Could not find your registration.', 'danger');
                return;
            }
            const res = await apiFetch(`/registrations/${reg.id}/cancel`, { method: 'PUT' });
            if (res.ok) {
                showToast('Registration cancelled.', 'success');
                loadEventDetail();
            } else {
                showToast(res.data?.error || 'Failed to cancel registration', 'danger');
            }
        });
    }

    const approveDetailBtn = document.getElementById('approveEventDetailBtn');
    if (approveDetailBtn) {
        approveDetailBtn.addEventListener('click', async () => {
            const confirmed = await confirmAction('Approve Event', `Approve "${ev.title}" and post it publicly for student registrations?`, 'Approve Event');
            if (!confirmed) return;
            const res = await apiFetch(`/admin/events/${ev.id}/approval`, {
                method: 'PUT',
                body: { approval_status: 'approved' }
            });
            if (res.ok) {
                showToast(`Event "${ev.title}" has been approved and posted!`, 'success');
                loadEventDetail();
            } else {
                showToast(res.data?.error || 'Failed to approve event', 'danger');
            }
        });
    }

    const rejectDetailBtn = document.getElementById('rejectEventDetailBtn');
    if (rejectDetailBtn) {
        rejectDetailBtn.addEventListener('click', async () => {
            const confirmed = await confirmAction('Reject Event', `Set "${ev.title}" status to rejected?`, 'Reject Event');
            if (!confirmed) return;
            const res = await apiFetch(`/admin/events/${ev.id}/approval`, {
                method: 'PUT',
                body: { approval_status: 'rejected' }
            });
            if (res.ok) {
                showToast(`Event "${ev.title}" has been rejected.`, 'warning');
                loadEventDetail();
            } else {
                showToast(res.data?.error || 'Failed to reject event', 'danger');
            }
        });
    }

    const deleteBtn = document.getElementById('deleteEventBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            const confirmed = await confirmAction('Delete Event', `Delete "${ev.title}"? This cannot be undone.`, 'Delete');
            if (!confirmed) return;
            const { ok, data } = await apiFetch(`/events/${ev.id}`, { method: 'DELETE' });
            if (ok) {
                showToast('Event deleted successfully.', 'success');
                setTimeout(() => window.location.href = '/events', 800);
            } else {
                showToast(data?.error || 'Failed to delete event', 'danger');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadCurrentUser();
    loadEventDetail();
});
