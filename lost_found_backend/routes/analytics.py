from flask import Blueprint, jsonify
from db import get_db_connection
import decimal

analytics_bp = Blueprint('analytics', __name__)

def fetch_view(view_name):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(f"SELECT * FROM {view_name}")
        data = cursor.fetchall()
        for row in data:
            for k, v in row.items():
                if isinstance(v, decimal.Decimal):
                    row[k] = float(v)
        return jsonify({"success": True, "data": data}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@analytics_bp.route('/recovery_rate', methods=['GET'])
def recovery_rate():
    return fetch_view('vw_recovery_rate')

@analytics_bp.route('/monthly_trends', methods=['GET'])
def monthly_trends():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT m.month, COALESCE(m.items_found, 0) as items_found, COALESCE(l.items_lost, 0) as items_lost
            FROM vw_monthly_trends m
            LEFT JOIN vw_monthly_lost_trends l ON m.month = l.month
            UNION
            SELECT l.month, COALESCE(m.items_found, 0), COALESCE(l.items_lost, 0)
            FROM vw_monthly_lost_trends l
            LEFT JOIN vw_monthly_trends m ON m.month = l.month
            ORDER BY month
        """)
        return jsonify({"success": True, "data": cursor.fetchall()}), 200
    finally:
        cursor.close()
        conn.close()

@analytics_bp.route('/location_risk', methods=['GET'])
def location_risk():
    return fetch_view('vw_location_risk')

@analytics_bp.route('/item_status_breakdown', methods=['GET'])
def item_status_breakdown():
    return fetch_view('vw_status_breakdown')

@analytics_bp.route('/finder_loser_overlap', methods=['GET'])
def finder_loser_overlap():
    return fetch_view('vw_finder_loser_overlap')

@analytics_bp.route('/zero_match_alerts', methods=['GET'])
def zero_match_alerts():
    return fetch_view('vw_zero_match_alerts')

@analytics_bp.route('/top_finders', methods=['GET'])
def top_finders():
    return fetch_view('vw_top_finders')

@analytics_bp.route('/time_to_recovery', methods=['GET'])
def time_to_recovery():
    return fetch_view('vw_time_to_recovery')
