from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from app.models import db, Event, User
from app.utils import roles_required, validate_event_payload

events_bp = Blueprint('events', __name__)


@events_bp.route('', methods=['GET'])
def list_events():
    """Public listing with search + pagination.
    Query params: q (search title/venue), category, status, page, per_page, mine (organizer only)
    """
    q = (request.args.get('q') or '').strip()
    category = (request.args.get('category') or '').strip()
    status = (request.args.get('status') or '').strip()
    mine = request.args.get('mine') == 'true'
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 6, type=int)

    query = Event.query

    # By default, only show events that are approved. Organizers may see their own events
    # (including pending) when authenticated; admins see all events.
    if current_user.is_authenticated:
        if current_user.role == 'admin':
            pass
        elif current_user.role == 'organizer':
            # show approved events or those owned by the organizer
            query = query.filter(db.or_(Event.approval_status == 'approved', Event.organizer_id == current_user.id))
        else:
            query = query.filter(Event.approval_status == 'approved')
    else:
        query = query.filter(Event.approval_status == 'approved')

    if mine:
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401
        if current_user.role == 'organizer':
            query = query.filter_by(organizer_id=current_user.id)
        elif current_user.role != 'admin':
            return jsonify({'error': 'Not permitted'}), 403

    if q:
        like = f'%{q}%'
        query = query.filter(db.or_(Event.title.ilike(like), Event.venue.ilike(like)))
    if category:
        query = query.filter(Event.category == category)
    if status:
        query = query.filter(Event.status == status)

    query = query.order_by(Event.date.asc(), Event.time.asc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    events = [e.to_dict(current_user) for e in pagination.items]

    return jsonify({
        'events': events,
        'total': pagination.total,
        'pages': pagination.pages,
        'page': pagination.page,
        'per_page': per_page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    }), 200


@events_bp.route('/public-stats', methods=['GET'])
def public_stats():
    """Non-sensitive aggregate counts shown on the public home page."""
    from app.models import Registration
    total_events = Event.query.filter_by(approval_status='approved').count()
    total_students = User.query.filter_by(role='student').count()
    total_organizers = User.query.filter_by(role='organizer').count()
    total_registrations = Registration.query.filter_by(status='registered').count()
    return jsonify({
        'total_events': total_events,
        'total_students': total_students,
        'total_organizers': total_organizers,
        'total_registrations': total_registrations,
    }), 200


@events_bp.route('/categories', methods=['GET'])
def list_categories():
    rows = db.session.query(Event.category).distinct().all()
    cats = sorted({r[0] for r in rows if r[0]})
    return jsonify({'categories': cats}), 200


@events_bp.route('/<int:event_id>', methods=['GET'])
def get_event(event_id):
    event = Event.query.get_or_404(event_id)
    # Restrict access to unapproved events: only admin or the organizer may view pending/rejected events
    if event.approval_status != 'approved':
        if not current_user.is_authenticated or (current_user.role != 'admin' and event.organizer_id != getattr(current_user, 'id', None)):
            return jsonify({'error': 'Event not found'}), 404
    return jsonify({'event': event.to_dict(current_user)}), 200


@events_bp.route('', methods=['POST'])
@login_required
@roles_required('organizer')
def create_event():
    data = request.get_json(silent=True) or {}
    errors = validate_event_payload(data)
    if errors:
        return jsonify({'errors': errors}), 400

    try:
        event_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        event_time = datetime.strptime(data['time'], '%H:%M').time()
    except (ValueError, KeyError):
        return jsonify({'errors': {'date': 'Invalid date or time format'}}), 400

    event = Event(
        title=data['title'].strip(),
        description=(data.get('description') or '').strip(),
        venue=data['venue'].strip(),
        date=event_date,
        time=event_time,
        category=data['category'].strip(),
        max_participants=int(data['max_participants']),
        organizer_id=current_user.id,
        status=data.get('status', 'upcoming') or 'upcoming',
        # new events require admin approval before being publicly visible
        approval_status='pending',
    )
    db.session.add(event)
    db.session.commit()
    return jsonify({'message': 'Event created successfully', 'event': event.to_dict(current_user)}), 201


@events_bp.route('/<int:event_id>', methods=['PUT'])
@login_required
def update_event(event_id):
    event = Event.query.get_or_404(event_id)

    # Organizers may only edit their own events; Admin may edit any
    if current_user.role == 'organizer' and event.organizer_id != current_user.id:
        return jsonify({'error': 'You can only edit your own events'}), 403
    if current_user.role == 'student':
        return jsonify({'error': 'Students cannot edit events'}), 403

    data = request.get_json(silent=True) or {}
    errors = validate_event_payload(data, partial=True)
    if errors:
        return jsonify({'errors': errors}), 400

    if 'title' in data and data['title']:
        event.title = data['title'].strip()
    if 'description' in data:
        event.description = (data.get('description') or '').strip()
    if 'venue' in data and data['venue']:
        event.venue = data['venue'].strip()
    if 'date' in data and data['date']:
        try:
            event.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'errors': {'date': 'Invalid date format'}}), 400
    if 'time' in data and data['time']:
        try:
            event.time = datetime.strptime(data['time'], '%H:%M').time()
        except ValueError:
            return jsonify({'errors': {'time': 'Invalid time format'}}), 400
    if 'category' in data and data['category']:
        event.category = data['category'].strip()
    if 'max_participants' in data and data['max_participants']:
        event.max_participants = int(data['max_participants'])
    if 'status' in data and data['status']:
        event.status = data['status']
    # Only admins may update approval status
    if 'approval_status' in data and current_user.role == 'admin':
        if data['approval_status'] in ('pending', 'approved', 'rejected'):
            event.approval_status = data['approval_status']

    db.session.commit()
    return jsonify({'message': 'Event updated successfully', 'event': event.to_dict(current_user)}), 200


@events_bp.route('/<int:event_id>', methods=['DELETE'])
@login_required
def delete_event(event_id):
    event = Event.query.get_or_404(event_id)

    if current_user.role == 'organizer' and event.organizer_id != current_user.id:
        return jsonify({'error': 'You can only delete your own events'}), 403
    if current_user.role == 'student':
        return jsonify({'error': 'Students cannot delete events'}), 403

    db.session.delete(event)
    db.session.commit()
    return jsonify({'message': 'Event deleted successfully'}), 200
