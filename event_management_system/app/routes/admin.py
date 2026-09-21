from flask import Blueprint, request, jsonify
from flask_login import login_required

from app.models import db, User, Event, Registration
from app.utils import roles_required

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/stats', methods=['GET'])
@login_required
@roles_required('admin')
def stats():
    return jsonify({
        'total_users': User.query.count(),
        'total_organizers': User.query.filter_by(role='organizer').count(),
        'total_students': User.query.filter_by(role='student').count(),
        'total_events': Event.query.count(),
        'pending_events': Event.query.filter_by(approval_status='pending').count(),
        'approved_events': Event.query.filter_by(approval_status='approved').count(),
        'total_registrations': Registration.query.filter_by(status='registered').count(),
    }), 200


@admin_bp.route('/users', methods=['GET'])
@login_required
@roles_required('admin')
def list_users():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    role = request.args.get('role')

    query = User.query
    if role:
        query = query.filter_by(role=role)
    query = query.order_by(User.created_at.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'users': [u.to_dict() for u in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'page': pagination.page,
    }), 200


@admin_bp.route('/registrations', methods=['GET'])
@login_required
@roles_required('admin')
def all_registrations():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    query = Registration.query.order_by(Registration.registered_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'registrations': [r.to_dict() for r in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'page': pagination.page,
    }), 200


@admin_bp.route('/events', methods=['GET'])
@login_required
@roles_required('admin')
def list_events_admin():
    """List all events for admin with optional approval_status filter."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    approval = request.args.get('approval')

    query = Event.query.order_by(Event.created_at.desc())
    if approval:
        query = query.filter_by(approval_status=approval)

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'events': [e.to_dict() for e in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'page': pagination.page,
    }), 200


@admin_bp.route('/events/<int:event_id>/approval', methods=['PUT'])
@login_required
@roles_required('admin')
def set_event_approval(event_id):
    data = request.get_json(silent=True) or {}
    approval = data.get('approval_status')
    if approval not in ('pending', 'approved', 'rejected'):
        return jsonify({'error': 'Invalid approval_status'}), 400

    event = Event.query.get_or_404(event_id)
    event.approval_status = approval
    db.session.commit()
    return jsonify({'message': 'Event approval updated', 'event': event.to_dict()}), 200
