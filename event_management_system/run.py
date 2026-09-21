import os
from app import create_app
from app.models import db

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        # Creates tables if they don't already exist (safe alongside schema.sql)
        db.create_all()
    debug_mode = os.environ.get('FLASK_ENV', 'development') == 'development'
    port = int(os.environ.get('PORT', '5000'))
    app.run(debug=debug_mode, host='0.0.0.0', port=port)
