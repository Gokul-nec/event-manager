async function loadHomeStats() {
    const { ok, data } = await apiFetch('/events/public-stats');
    if (ok && data) {
        document.getElementById('statEvents').textContent = data.total_events;
        document.getElementById('statStudents').textContent = data.total_students;
        document.getElementById('statOrganizers').textContent = data.total_organizers;
        document.getElementById('statRegs').textContent = data.total_registrations;
    }
}

function eventCardHtml(ev) {
    const seatsPct = ev.max_participants > 0
        ? Math.min(100, Math.round((ev.registered_count / ev.max_participants) * 100))
        : 0;
    return `
    <div class="col-md-6 col-lg-4">
        <div class="card event-card">
            <div class="card-img-top-placeholder"></div>
            <div class="card-body d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="badge bg-secondary-subtle text-dark event-category-badge">${escapeHtml(ev.category)}</span>
                    <span class="badge ${statusBadgeClass(ev.status)}">${escapeHtml(ev.status)}</span>
                </div>
                <h5 class="card-title">${escapeHtml(ev.title)}</h5>
                <p class="card-text text-muted small mb-2">
                    <i class="bi bi-geo-alt"></i> ${escapeHtml(ev.venue)}<br>
                    <i class="bi bi-calendar3"></i> ${formatDate(ev.date)} &middot; ${formatTime(ev.time)}
                </p>
                <div class="mt-auto">
                    <div class="progress seats-progress mb-2">
                        <div class="progress-bar bg-brand" style="width:${seatsPct}%; background-color:#4f46e5;"></div>
                    </div>
                    <small class="text-muted d-block mb-2">${ev.seats_left} of ${ev.max_participants} seats left</small>
                    <a href="/events/${ev.id}" class="btn btn-outline-primary btn-sm w-100">View Details</a>
                </div>
            </div>
        </div>
    </div>`;
}

async function loadFeaturedEvents() {
    const container = document.getElementById('featuredEvents');
    const { ok, data } = await apiFetch('/events?status=upcoming&per_page=3&page=1');
    if (!ok || !data || !data.events.length) {
        container.innerHTML = `<div class="empty-state w-100"><i class="bi bi-calendar-x fs-1"></i><p class="mt-2">No upcoming events yet. Check back soon!</p></div>`;
        return;
    }
    container.innerHTML = data.events.map(eventCardHtml).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    loadHomeStats();
    loadFeaturedEvents();
});
