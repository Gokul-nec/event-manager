let currentPage = 1;
let debounceTimer = null;

function eventListCardHtml(ev) {
    const seatsPct = ev.max_participants > 0
        ? Math.min(100, Math.round((ev.registered_count / ev.max_participants) * 100))
        : 0;
    const full = ev.seats_left <= 0;
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
                    <i class="bi bi-calendar3"></i> ${formatDate(ev.date)} &middot; ${formatTime(ev.time)}<br>
                    <i class="bi bi-person-badge"></i> ${escapeHtml(ev.organizer_name || 'Unknown')}
                </p>
                <div class="mt-auto">
                    <div class="progress seats-progress mb-2">
                        <div class="progress-bar" style="width:${seatsPct}%; background-color:${full ? '#dc2626' : '#4f46e5'};"></div>
                    </div>
                    <small class="text-muted d-block mb-2">${ev.seats_left} of ${ev.max_participants} seats left ${full ? '(Full)' : ''}</small>
                    <a href="/events/${ev.id}" class="btn btn-outline-primary btn-sm w-100">View Details</a>
                </div>
            </div>
        </div>
    </div>`;
}

async function loadCategories() {
    const { ok, data } = await apiFetch('/events/categories');
    if (!ok) return;
    const select = document.getElementById('categoryFilter');
    data.categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });
}

function buildQuery(page) {
    const q = document.getElementById('searchInput').value.trim();
    const category = document.getElementById('categoryFilter').value;
    const status = document.getElementById('statusFilter').value;
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (status) params.set('status', status);
    params.set('page', page);
    params.set('per_page', 6);
    return params.toString();
}

async function loadEvents(page = 1) {
    currentPage = page;
    const listEl = document.getElementById('eventsList');
    listEl.innerHTML = `<div class="spinner-wrap w-100"><div class="spinner-border text-primary" role="status"></div></div>`;

    const { ok, data } = await apiFetch(`/events?${buildQuery(page)}`);
    if (!ok || !data) {
        listEl.innerHTML = `<div class="empty-state w-100"><i class="bi bi-exclamation-triangle fs-1"></i><p class="mt-2">Failed to load events.</p></div>`;
        return;
    }

    if (!data.events.length) {
        listEl.innerHTML = `<div class="empty-state w-100"><i class="bi bi-calendar-x fs-1"></i><p class="mt-2">No events found matching your criteria.</p></div>`;
        renderPagination(0, 1);
        return;
    }

    listEl.innerHTML = data.events.map(eventListCardHtml).join('');
    renderPagination(data.pages, data.page);
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
        a.addEventListener('click', (e) => {
            e.preventDefault();
            if (!disabled) loadEvents(targetPage);
        });
        li.appendChild(a);
        return li;
    };

    nav.appendChild(makeItem('Prev', page - 1, page <= 1));
    for (let i = 1; i <= totalPages; i++) {
        nav.appendChild(makeItem(String(i), i, false, i === page));
    }
    nav.appendChild(makeItem('Next', page + 1, page >= totalPages));
}

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadEvents(1);

    document.getElementById('searchInput').addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => loadEvents(1), 400);
    });
    document.getElementById('categoryFilter').addEventListener('change', () => loadEvents(1));
    document.getElementById('statusFilter').addEventListener('change', () => loadEvents(1));
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('statusFilter').value = '';
        loadEvents(1);
    });
});
