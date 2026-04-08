from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
import os

from routes.auth import auth_bp
from routes.items import items_bp
from routes.lost_reports import lost_reports_bp
from routes.claims import claims_bp
from routes.admin import admin_bp
from routes.analytics import analytics_bp

def _get_cors_origins():
    raw_origins = Config.FRONTEND_ORIGINS or '*'
    if raw_origins.strip() == '*':
        return '*'
    return [origin.strip() for origin in raw_origins.split(',') if origin.strip()]

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = Config.JWT_SECRET_KEY
CORS(
    app,
    resources={r"/api/*": {"origins": _get_cors_origins()}},
    supports_credentials=True
)
jwt = JWTManager(app)

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(items_bp, url_prefix='/api/items')
app.register_blueprint(lost_reports_bp, url_prefix='/api/lost_reports')
app.register_blueprint(claims_bp, url_prefix='/api/claims')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(analytics_bp, url_prefix='/api/analytics')

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_DIR

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/health')
def health_check():
    return {"success": True, "message": "MIT Khoj backend is running"}, 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
