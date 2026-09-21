import re
from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user

from app.models import db, User

auth_bp = Blueprint('auth', __name__)

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    role = (data.get('role') or 'student').strip().lower()

    errors = {}
    if len(name) < 2:
        errors['name'] = 'Name must be at least 2 characters'
    if not EMAIL_RE.match(email):
        errors['email'] = 'A valid email is required'
    if len(password) < 6:
        errors['password'] = 'Password must be at least 6 characters'
    if role not in ('organizer', 'student'):
        errors['role'] = 'Role must be organizer or student'

    if errors:
        return jsonify({'errors': errors}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'errors': {'email': 'An account with this email already exists'}}), 409

    user = User(name=name, email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    login_user(user)
    return jsonify({'message': 'Registration successful', 'user': user.to_dict()}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    login_user(user)
    return jsonify({'message': 'Login successful', 'user': user.to_dict()}), 200


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/me', methods=['GET'])
def me():
    if not current_user.is_authenticated:
        return jsonify({'user': None}), 200
    return jsonify({'user': current_user.to_dict()}), 200
