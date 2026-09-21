from flask import Blueprint, render_template, redirect, url_for, abort
from flask_login import login_required, current_user

pages_bp = Blueprint('pages', __name__)


@pages_bp.route('/')
def home():
    return render_template('index.html')


@pages_bp.route('/login')
def login_page():
    if current_user.is_authenticated:
        return redirect(url_for('pages.dashboard'))
    return render_template('login.html')


@pages_bp.route('/register')
def register_page():
    if current_user.is_authenticated:
        return redirect(url_for('pages.dashboard'))
    return render_template('register.html')


@pages_bp.route('/events')
def events_page():
    return render_template('events.html')


@pages_bp.route('/events/<int:event_id>')
def event_detail_page(event_id):
    return render_template('event_detail.html', event_id=event_id)


@pages_bp.route('/dashboard')
@login_required
def dashboard():
    if current_user.role == 'admin':
        return render_template('dashboard_admin.html')
    elif current_user.role == 'organizer':
        return render_template('dashboard_organizer.html')
    else:
        return render_template('dashboard_student.html')


@pages_bp.route('/events/create')
@login_required
def create_event_page():
    if current_user.role not in ('organizer',):
        abort(403)
    return render_template('event_form.html', mode='create')


@pages_bp.route('/events/<int:event_id>/edit')
@login_required
def edit_event_page(event_id):
    if current_user.role not in ('organizer', 'admin'):
        abort(403)
    return render_template('event_form.html', mode='edit', event_id=event_id)
