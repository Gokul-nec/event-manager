from functools import wraps
from flask import jsonify
from flask_login import current_user


def roles_required(*roles):
    """Restrict a REST endpoint to users whose role is in `roles`."""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if not current_user.is_authenticated:
                return jsonify({'error': 'Authentication required'}), 401
            if current_user.role not in roles:
                return jsonify({'error': 'You do not have permission to perform this action'}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator


def login_required_api(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return wrapped


def validate_event_payload(data, partial=False):
    """Basic server-side validation for event create/update payloads.
    Returns (errors_dict, cleaned_data)."""
    errors = {}
    required_fields = ['title', 'venue', 'date', 'time', 'category', 'max_participants']

    if not partial:
        for field in required_fields:
            if field not in data or str(data.get(field, '')).strip() == '':
                errors[field] = f'{field} is required'

    if 'title' in data and data['title'] is not None and len(str(data['title']).strip()) > 200:
        errors['title'] = 'Title must be under 200 characters'

    if 'max_participants' in data and data['max_participants'] not in (None, ''):
        try:
            val = int(data['max_participants'])
            if val < 1:
                errors['max_participants'] = 'Max participants must be at least 1'
        except (ValueError, TypeError):
            errors['max_participants'] = 'Max participants must be a whole number'

    valid_categories = {'Technology', 'Cultural', 'Sports', 'Academic', 'Workshop', 'Seminar', 'Other'}
    if 'category' in data and data['category'] not in (None, '') and data['category'] not in valid_categories:
        # allow any non-empty string too, but flag unknown softly - not fatal
        pass

    valid_status = {'upcoming', 'ongoing', 'completed', 'cancelled'}
    if 'status' in data and data['status'] not in (None, '') and data['status'] not in valid_status:
        errors['status'] = 'Invalid status value'

    return errors
