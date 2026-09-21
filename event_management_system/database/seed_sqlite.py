import os
import sys
import sqlite3

# Add project root to sys.path
basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, basedir)

from app import create_app
from app.models import db, User, Event, Registration

def seed_database():
    app = create_app()
    with app.app_context():
        # Ensure all tables are created according to current SQLAlchemy models
        db.create_all()

        # Migrate existing SQLite database if approval_status column is missing
        db_path = os.path.join(basedir, 'event_management.db')
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(events)")
            cols = [col[1] for col in cursor.fetchall()]
            if 'approval_status' not in cols:
                print("Adding missing 'approval_status' column to events table...")
                cursor.execute("ALTER TABLE events ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved'")
                conn.commit()
            conn.close()

        # Seed Users if empty
        if User.query.count() == 0:
            print("Seeding users...")
            admin = User(id=1, name='System Admin', email='admin@events.com', role='admin')
            admin.set_password('admin123')

            organizer = User(id=2, name='Alice Organizer', email='organizer@events.com', role='organizer')
            organizer.set_password('organizer123')

            student = User(id=3, name='Bob Student', email='student@events.com', role='student')
            student.set_password('student123')

            db.session.add_all([admin, organizer, student])
            db.session.commit()
            print("Users seeded successfully.")
        else:
            print("Users already exist, skipping seeding users.")

        # Seed Events if empty
        if Event.query.count() == 0:
            print("Seeding events...")
            events_data = [
                Event(
                    title='Annual Tech Symposium',
                    description='A full-day symposium featuring talks on AI, cloud computing, and cybersecurity from industry experts.',
                    venue='Main Auditorium',
                    date=db.func.current_date(),
                    time=db.func.current_time(),
                    category='Technology',
                    max_participants=150,
                    organizer_id=2,
                    status='upcoming',
                    approval_status='approved'
                ),
                Event(
                    title='Inter-College Cultural Fest',
                    description='A vibrant celebration of music, dance, and drama with performances from colleges across the region.',
                    venue='Open Air Theatre',
                    date=db.func.current_date(),
                    time=db.func.current_time(),
                    category='Cultural',
                    max_participants=300,
                    organizer_id=2,
                    status='upcoming',
                    approval_status='approved'
                ),
                Event(
                    title='Web Development Workshop',
                    description='Hands-on workshop covering HTML, CSS, JavaScript and Flask fundamentals for beginners.',
                    venue='Computer Lab 3',
                    date=db.func.current_date(),
                    time=db.func.current_time(),
                    category='Workshop',
                    max_participants=40,
                    organizer_id=2,
                    status='upcoming',
                    approval_status='approved'
                ),
            ]
            db.session.add_all(events_data)
            db.session.commit()
            print("Events seeded successfully.")
        else:
            # Ensure existing events have approval_status set to 'approved' if null/pending
            existing_events = Event.query.all()
            updated = False
            for e in existing_events:
                if not e.approval_status:
                    e.approval_status = 'approved'
                    updated = True
            if updated:
                db.session.commit()
            print("Events already exist, ensured approval_status.")

        print("Database migration & seed process completed successfully.")

if __name__ == '__main__':
    seed_database()
