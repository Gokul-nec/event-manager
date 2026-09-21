document.addEventListener('DOMContentLoaded', async () => {
    await loadCurrentUser();

    const containerEl = document.querySelector('[data-mode]');
    const mode = containerEl.dataset.mode;
    const eventId = containerEl.dataset.eventId;
    const form = document.getElementById('eventForm');
    const alertEl = document.getElementById('formAlert');

    // Show status field only in edit mode (admin/organizer updating an existing event)
    if (mode === 'edit') {
        document.querySelector('.status-field').classList.remove('d-none');
        await prefillForm(eventId);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertEl.classList.add('d-none');

        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const payload = {
            title: document.getElementById('title').value.trim(),
            description: document.getElementById('description').value.trim(),
            venue: document.getElementById('venue').value.trim(),
            category: document.getElementById('category').value,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            max_participants: parseInt(document.getElementById('maxParticipants').value, 10),
        };
        if (mode === 'edit') {
            payload.status = document.getElementById('status').value;
        }

        const submitBtn = document.getElementById('submitBtn');
        const spinner = document.getElementById('submitSpinner');
        submitBtn.disabled = true;
        spinner.classList.remove('d-none');

        let result;
        if (mode === 'edit') {
            result = await apiFetch(`/events/${eventId}`, { method: 'PUT', body: payload });
        } else {
            result = await apiFetch('/events', { method: 'POST', body: payload });
        }

        submitBtn.disabled = false;
        spinner.classList.add('d-none');

        if (!result.ok) {
            const errors = result.data?.errors;
            const msg = errors ? Object.values(errors).join(' ') : (result.data?.error || 'Something went wrong.');
            alertEl.textContent = msg;
            alertEl.classList.remove('d-none');
            return;
        }

        showToast(mode === 'edit' ? 'Event updated successfully!' : 'Event created successfully!', 'success');
        const savedId = mode === 'edit' ? eventId : result.data.event.id;
        setTimeout(() => window.location.href = `/events/${savedId}`, 700);
    });
});

async function prefillForm(eventId) {
    const { ok, data } = await apiFetch(`/events/${eventId}`);
    if (!ok) return;
    const ev = data.event;
    document.getElementById('title').value = ev.title;
    document.getElementById('description').value = ev.description || '';
    document.getElementById('venue').value = ev.venue;
    document.getElementById('category').value = ev.category;
    document.getElementById('date').value = ev.date;
    document.getElementById('time').value = ev.time;
    document.getElementById('maxParticipants').value = ev.max_participants;
    document.getElementById('status').value = ev.status;
}
