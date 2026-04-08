import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DB_HOST = os.environ.get('DB_HOST', '127.0.0.1')
    DB_USER = os.environ.get('DB_USER', 'root')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '&q7(%P1:4')
    DB_NAME = os.environ.get('DB_NAME', 'lost_found_db')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'super-secret-lost-found-key')
