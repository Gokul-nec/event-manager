from flask import Flask, render_template
from flask_login import LoginManager
from flask_cors import CORS

from app.config import Config
from app.models import db, bcrypt, User

login_manager = LoginManager()


def create_app(config_class=Config):
    app = Flask(__name__,
                template_folder='../templates',
                static_folder='../static')
    app.config.from_object(config_class)

    db.init_app(app)
    bcrypt.init_app(app)
    login_manager.init_app(app)
    CORS(app, supports_credentials=True)

    login_manager.login_view = 'pages.login_page'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'warning'

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.events import events_bp
    from app.routes.registrations import registrations_bp
    from app.routes.admin import admin_bp
    from app.routes.pages import pages_bp

    app.register_blueprint(pages_bp)
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(events_bp, url_prefix='/api/events')
    app.register_blueprint(registrations_bp, url_prefix='/api/registrations')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    @app.errorhandler(404)
    def not_found(e):
        return render_template('404.html'), 404

    @app.errorhandler(403)
    def forbidden(e):
        return render_template('403.html'), 403

    return app
