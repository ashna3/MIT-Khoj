from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from middleware.auth_middleware import admin_required
from db import get_db_connection

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/claims', methods=['GET'])
@admin_required()
def get_claims():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT c.*, u.name as claimant_name, u.reg_no, i.title as item_title 
            FROM claim c 
            JOIN users u ON c.claimant_id = u.user_id 
            JOIN item i ON c.item_id = i.item_id 
            ORDER BY FIELD(c.status, 'pending', 'approved', 'rejected'), c.claim_date DESC
        """)
        claims = cursor.fetchall()
        for c in claims:
            c['claim_date'] = c['claim_date'].isoformat() if c['claim_date'] else None
            c['reviewed_at'] = c['reviewed_at'].isoformat() if c['reviewed_at'] else None
            c['ownership_score'] = float(c['ownership_score']) if c['ownership_score'] is not None else None
        return jsonify({"success": True, "data": claims}), 200
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/claims/<int:claim_id>', methods=['PATCH'])
@admin_required()
def update_claim(claim_id):
    data = request.json
    status = data.get('status')
    remarks = data.get('remarks', '')
    admin_id = get_jwt_identity()
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("UPDATE claim SET status = %s, admin_id = %s, reviewed_at = NOW() WHERE claim_id = %s", (status, admin_id, claim_id))
        
        cursor.execute("SELECT item_id, claimant_id, lost_id FROM claim WHERE claim_id = %s", (claim_id,))
        claim = cursor.fetchone()
        
        if status == 'approved':
            cursor.execute("UPDATE item SET status = 'claimed' WHERE item_id = %s", (claim['item_id'],))
            if claim['lost_id']:
                cursor.execute("UPDATE lost_report SET status = 'closed' WHERE lost_id = %s", (claim['lost_id'],))
            cursor.execute("INSERT INTO user_reputation (user_id, successful_claims) VALUES (%s, 1) ON DUPLICATE KEY UPDATE successful_claims = successful_claims + 1", (claim['claimant_id'],))
        elif status == 'rejected':
            cursor.execute("INSERT INTO user_reputation (user_id, disputed_claims) VALUES (%s, 1) ON DUPLICATE KEY UPDATE disputed_claims = disputed_claims + 1", (claim['claimant_id'],))
            
        cursor.execute("UPDATE user_reputation SET reliability_score = IFNULL((successful_claims / (successful_claims + disputed_claims + 1)), 0) * 100 WHERE user_id = %s", (claim['claimant_id'],))
        
        conn.commit()
        return jsonify({"success": True, "message": f"Claim {status}"}), 200
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/items', methods=['GET'])
@admin_required()
def get_items():
    category_id = request.args.get('category_id')
    location = request.args.get('location')
    status = request.args.get('status')
    
    query = "SELECT i.*, c.category_name, u.name as reporter_name FROM item i JOIN category c ON i.category_id = c.category_id JOIN users u ON i.reported_by = u.user_id WHERE 1=1"
    params = []
    
    if category_id:
        query += " AND i.category_id = %s"
        params.append(category_id)
    if location:
        query += " AND i.location_found LIKE %s"
        params.append(f"%{location}%")
    if status:
        query += " AND i.status = %s"
        params.append(status)
        
    query += " ORDER BY i.reported_date DESC"
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(query, params)
        items = cursor.fetchall()
        for i in items:
            i['reported_date'] = i['reported_date'].isoformat() if i['reported_date'] else None
        return jsonify({"success": True, "data": items}), 200
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/users', methods=['GET'])
@admin_required()
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                u.user_id,
                u.name,
                u.reg_no,
                u.admin_no,
                u.phone,
                u.role,
                u.created_at,
                COALESCE(ur.items_found, 0) AS items_found,
                COALESCE(ur.reliability_score, 100.0) AS reliability_score
            FROM users u
            LEFT JOIN user_reputation ur ON u.user_id = ur.user_id
            ORDER BY u.created_at DESC, u.user_id DESC
        """)
        users = cursor.fetchall()
        for u in users:
            u['reliability_score'] = float(u['reliability_score']) if u['reliability_score'] is not None else 100.0
            u['created_at'] = u['created_at'].isoformat() if u['created_at'] else None
            
        return jsonify({"success": True, "data": users}), 200
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/users/<int:user_id>', methods=['PATCH'])
@admin_required()
def update_user_role(user_id):
    role = request.json.get('role')
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET role = %s WHERE user_id = %s", (role, user_id))
        conn.commit()
        return jsonify({"success": True, "message": "User role updated"}), 200
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/lost_reports', methods=['GET'])
@admin_required()
def get_lost_reports():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                lr.*,
                u.name AS reporter_name,
                u.reg_no,
                c.category_name
            FROM lost_report lr
            JOIN users u ON lr.user_id = u.user_id
            JOIN category c ON lr.category_id = c.category_id
            ORDER BY lr.reported_at DESC, lr.lost_id DESC
        """)
        reports = cursor.fetchall()
        for report in reports:
            report['lost_date'] = report['lost_date'].isoformat() if report['lost_date'] else None
            report['reported_at'] = report['reported_at'].isoformat() if report['reported_at'] else None
        return jsonify({"success": True, "data": reports}), 200
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/run_matching', methods=['POST'])
@admin_required()
def run_matching():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT lost_id FROM lost_report WHERE status = 'unmatched'")
        reports = cursor.fetchall()
        for r in reports:
            cursor.execute("CALL smart_match(%s)", (r[0],))
        conn.commit()
        return jsonify({"success": True, "message": "Smart matching completed"}), 200
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/run_expiry', methods=['POST'])
@admin_required()
def run_expiry():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("CALL auto_expire_items()")
        conn.commit()
        return jsonify({"success": True, "message": "Auto-expiry completed"}), 200
    finally:
        cursor.close()
        conn.close()
