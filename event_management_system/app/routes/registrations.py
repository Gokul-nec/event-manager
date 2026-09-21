from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from app.models import db, Event, Registration
from app.utils import roles_required

registrations_bp = Blueprint('registrations', __name__)


@registrations_bp.route('', methods=['GET'])
@login_required
def list_registrations():
    """Students see their own registrations.
    Organizers see registrations for events they own (optionally filtered by event_id).
    Admin sees all registrations.
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 8, type=int)
    event_id = request.args.get('event_id', type=int)

    query = Registration.query

    if current_user.role == 'student':
        query = query.filter_by(student_id=current_user.id)
        if event_id:
            query = query.filter_by(event_id=event_id)
    elif current_user.role == 'organizer':
        owned_event_ids = [e.id for e in Event.query.filter_by(organizer_id=current_user.id).all()]
        query = query.filter(Registration.event_id.in_(owned_event_ids) if owned_event_ids else False)
        if event_id:
            if event_id not in owned_event_ids:
                return jsonify({'error': 'Not permitted to view this event\'s registrations'}), 403
            query = query.filter_by(event_id=event_id)
    elif current_user.role == 'admin':
        if event_id:
            query = query.filter_by(event_id=event_id)
    else:
        return jsonify({'error': 'Not permitted'}), 403

    query = query.order_by(Registration.registered_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    regs = [r.to_dict() for r in pagination.items]

    return jsonify({
        'registrations': regs,
        'total': pagination.total,
        'pages': pagination.pages,
        'page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev,
    }), 200


@registrations_bp.route('', methods=['POST'])
@login_required
@roles_required('student')
def register_for_event():
    data = request.get_json(silent=True) or {}
    event_id = data.get('event_id')
    if not event_id:
        return jsonify({'error': 'event_id is required'}), 400

    event = Event.query.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404

    if event.approval_status != 'approved':
        return jsonify({'error': 'This event is pending admin approval and cannot accept registrations yet'}), 400

    if event.status in ('completed', 'cancelled'):
        return jsonify({'error': f'Cannot register for a {event.status} event'}), 400

    existing = Registration.query.filter_by(event_id=event_id, student_id=current_user.id).first()
    if existing and existing.status == 'registered':
        return jsonify({'error': 'You are already registered for this event'}), 409

    if event.seats_left() <= 0:
        return jsonify({'error': 'This event is fully booked'}), 400

    if existing and existing.status == 'cancelled':
        existing.status = 'registered'
        db.session.commit()
        return jsonify({'message': 'Registration successful', 'registration': existing.to_dict()}), 200

    reg = Registration(event_id=event_id, student_id=current_user.id, status='registered')
    db.session.add(reg)
    db.session.commit()
    return jsonify({'message': 'Registration successful', 'registration': reg.to_dict()}), 201


@registrations_bp.route('/<int:registration_id>/cancel', methods=['PUT'])
@login_required
@roles_required('student')
def cancel_registration(registration_id):
    reg = Registration.query.get_or_404(registration_id)
    if reg.student_id != current_user.id:
        return jsonify({'error': 'You can only cancel your own registrations'}), 403

    reg.status = 'cancelled'
    db.session.commit()
    return jsonify({'message': 'Registration cancelled successfully', 'registration': reg.to_dict()}), 200
