from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import UserMixin

db = SQLAlchemy()
bcrypt = Bcrypt()


class User(db.Model, UserMixin):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('admin', 'organizer', 'student', name='role_enum'),
                      nullable=False, default='student')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    events = db.relationship('Event', backref='organizer', lazy=True,
                              foreign_keys='Event.organizer_id',
                              cascade='all, delete-orphan')
    registrations = db.relationship('Registration', backref='student', lazy=True,
                                     cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Event(db.Model):
    __tablename__ = 'events'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    venue = db.Column(db.String(200), nullable=False)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.Time, nullable=False)
    category = db.Column(db.String(80), nullable=False, index=True)
    max_participants = db.Column(db.Integer, nullable=False, default=50)
    organizer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.Enum('upcoming', 'ongoing', 'completed', 'cancelled',
                                name='status_enum'),
                        nullable=False, default='upcoming')
    approval_status = db.Column(db.Enum('pending', 'approved', 'rejected', name='approval_enum'),
                                nullable=False, default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    registrations = db.relationship('Registration', backref='event', lazy=True,
                                     cascade='all, delete-orphan')

    def registered_count(self):
        return Registration.query.filter_by(event_id=self.id, status='registered').count()

    def seats_left(self):
        return max(self.max_participants - self.registered_count(), 0)

    def to_dict(self, current_user=None):
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'venue': self.venue,
            'date': self.date.isoformat() if self.date else None,
            'time': self.time.strftime('%H:%M') if self.time else None,
            'category': self.category,
            'max_participants': self.max_participants,
            'status': self.status,
            'approval_status': self.approval_status,
            'organizer_id': self.organizer_id,
            'organizer_name': self.organizer.name if self.organizer else None,
            'registered_count': self.registered_count(),
            'seats_left': self.seats_left(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if current_user is not None and current_user.is_authenticated:
            existing = Registration.query.filter_by(
                event_id=self.id, student_id=current_user.id, status='registered'
            ).first()
            data['is_registered'] = existing is not None
        else:
            data['is_registered'] = False
        return data


class Registration(db.Model):
    __tablename__ = 'registrations'

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('events.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.Enum('registered', 'cancelled', name='reg_status_enum'),
                        nullable=False, default='registered')
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('event_id', 'student_id', name='uq_event_student'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'event_title': self.event.title if self.event else None,
            'event_date': self.event.date.isoformat() if self.event and self.event.date else None,
            'event_venue': self.event.venue if self.event else None,
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else None,
            'student_email': self.student.email if self.student else None,
            'status': self.status,
            'registered_at': self.registered_at.isoformat() if self.registered_at else None,
        }
