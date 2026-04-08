from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from middleware.auth_middleware import student_required
from db import get_db_connection
from werkzeug.utils import secure_filename
import os

lost_reports_bp = Blueprint('lost_reports', __name__)
ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png'}
MAX_IMAGE_SIZE = 5 * 1024 * 1024

def _guess_category_name(other_category):
    value = (other_category or '').strip().lower()
    if not value:
        return None

    keyword_map = {
        'Bags': ['bag', 'backpack', 'wallet', 'purse'],
        'ID Cards': ['id', 'card', 'badge', 'pass', 'license'],
        'Clothing': ['cloth', 'hoodie', 'jacket', 'umbrella', 'raincoat', 'glove', 'glasses', 'cap', 'shoe'],
        'Keys': ['key', 'keychain', 'fob'],
        'Books': ['book', 'textbook', 'notebook', 'journal'],
        'Water Bottles': ['bottle', 'flask', 'tumbler'],
        'Jewellery': ['jewel', 'jewellery', 'jewelry', 'watch', 'chain', 'bracelet', 'ring', 'pendant'],
        'Electronics': ['phone', 'laptop', 'charger', 'usb', 'airpod', 'earphone', 'headphone', 'mouse', 'tablet', 'electronic'],
    }

    for category_name, keywords in keyword_map.items():
        if any(keyword in value for keyword in keywords):
            return category_name
    return 'Electronics'

def _resolve_category_id(cursor, raw_category_id, other_category):
    if raw_category_id not in (None, ''):
        return raw_category_id

    guessed_name = _guess_category_name(other_category)
    if not guessed_name:
        return None

    cursor.execute(
        "SELECT category_id FROM category WHERE LOWER(category_name) = LOWER(%s) LIMIT 1",
        (guessed_name,)
    )
    match = cursor.fetchone()
    return match[0] if match else None

def _validate_image(file_storage):
    if not file_storage or not file_storage.filename:
        return None

    filename = secure_filename(file_storage.filename)
    extension = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        return "Only JPG and PNG images are supported"

    file_storage.stream.seek(0, os.SEEK_END)
    file_size = file_storage.stream.tell()
    file_storage.stream.seek(0)

    if file_size > MAX_IMAGE_SIZE:
        return "Image size must be 5MB or less"

    return None

@lost_reports_bp.route('', methods=['POST'])
@student_required()
def create_lost_report():
    data = request.form if request.form else (request.json or {})
    user_id = get_jwt_identity()

    if 'image' in request.files and request.files['image'].filename:
        image_error = _validate_image(request.files['image'])
        if image_error:
            return jsonify({"success": False, "error": image_error, "message": image_error}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        category_id = _resolve_category_id(cursor, data.get('category_id'), data.get('other_category'))
        if not category_id:
            return jsonify({
                "success": False,
                "error": "Category is required",
                "message": "Please choose a category or describe the other category."
            }), 400

        cursor.execute(
            "INSERT INTO lost_report (user_id, category_id, title, description, lost_date, lost_location) VALUES (%s, %s, %s, %s, %s, %s)",
            (user_id, category_id, data['title'], data['description'], data['lost_date'], data['lost_location'])
        )
        lost_id = cursor.lastrowid
        cursor.execute("CALL smart_match(%s)", (lost_id,))
        conn.commit()
        return jsonify({
            "success": True,
            "message": "Lost report created and matched successfully",
            "data": {"lost_id": lost_id}
        }), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e), "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@lost_reports_bp.route('/my', methods=['GET'])
@student_required()
def get_my_lost_reports():
    user_id = get_jwt_identity()
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM lost_report WHERE user_id = %s ORDER BY reported_at DESC", (user_id,))
        reports = cursor.fetchall()
        for r in reports:
            if hasattr(r['lost_date'], 'isoformat'):
                r['lost_date'] = r['lost_date'].isoformat()
            if hasattr(r['reported_at'], 'isoformat'):
                r['reported_at'] = r['reported_at'].isoformat()
        return jsonify({"success": True, "data": reports}), 200
    finally:
        cursor.close()
        conn.close()

@lost_reports_bp.route('/<int:lost_id>', methods=['DELETE'])
@student_required()
def delete_lost_report(lost_id):
    user_id = get_jwt_identity()

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT lost_id, status FROM lost_report WHERE lost_id = %s AND user_id = %s",
            (lost_id, user_id)
        )
        report = cursor.fetchone()

        if not report:
            return jsonify({
                "success": False,
                "error": "Lost report not found",
                "message": "You can only remove your own lost reports."
            }), 404

        if report['status'] == 'closed':
            return jsonify({
                "success": False,
                "error": "Lost report already resolved",
                "message": "This lost report is already closed and cannot be removed."
            }), 400

        cursor.execute(
            "SELECT claim_id FROM claim WHERE lost_id = %s AND status = 'approved'",
            (lost_id,)
        )
        if cursor.fetchone():
            return jsonify({
                "success": False,
                "error": "Approved claim exists",
                "message": "This lost report has an approved claim and cannot be removed."
            }), 400

        cursor.execute(
            """
            SELECT i.item_id
            FROM item i
            JOIN lost_report lr ON lr.lost_id = %s
            WHERE i.status = 'matched'
              AND i.category_id = lr.category_id
              AND (
                  LOWER(i.location_found) LIKE CONCAT('%%', LOWER(SUBSTRING_INDEX(lr.lost_location, ' ', 1)), '%%')
                  OR LOWER(i.description) LIKE CONCAT('%%', LOWER(SUBSTRING_INDEX(lr.description, ' ', 1)), '%%')
              )
              AND NOT EXISTS (
                  SELECT 1
                  FROM claim c
                  WHERE c.item_id = i.item_id
                    AND c.status IN ('pending', 'approved')
                    AND (c.lost_id IS NULL OR c.lost_id != %s)
              )
            """,
            (lost_id, lost_id)
        )
        matched_item_ids = [row['item_id'] for row in cursor.fetchall()]

        cursor.execute("SELECT claim_id FROM claim WHERE lost_id = %s", (lost_id,))
        claim_ids = [row['claim_id'] for row in cursor.fetchall()]
        if claim_ids:
            placeholders = ','.join(['%s'] * len(claim_ids))
            cursor.execute(f"DELETE FROM claim_log WHERE claim_id IN ({placeholders})", claim_ids)
            cursor.execute(f"DELETE FROM claim WHERE claim_id IN ({placeholders})", claim_ids)

        cursor.execute("DELETE FROM lost_report WHERE lost_id = %s", (lost_id,))

        if matched_item_ids:
            for item_id in matched_item_ids:
                cursor.execute(
                    """
                    SELECT 1
                    FROM lost_report lr
                    JOIN item i ON i.item_id = %s
                    WHERE lr.status != 'closed'
                      AND i.category_id = lr.category_id
                      AND (
                          LOWER(i.location_found) LIKE CONCAT('%%', LOWER(SUBSTRING_INDEX(lr.lost_location, ' ', 1)), '%%')
                          OR LOWER(i.description) LIKE CONCAT('%%', LOWER(SUBSTRING_INDEX(lr.description, ' ', 1)), '%%')
                      )
                    LIMIT 1
                    """,
                    (item_id,)
                )
                if not cursor.fetchone():
                    cursor.execute("UPDATE item SET status = 'unclaimed' WHERE item_id = %s", (item_id,))

        conn.commit()

        return jsonify({
            "success": True,
            "message": "Lost report removed successfully"
        }), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e), "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@lost_reports_bp.route('/<int:lost_id>/matches', methods=['GET'])
@student_required()
def get_matches(lost_id):
    user_id = get_jwt_identity()
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT category_id, status FROM lost_report WHERE lost_id = %s AND user_id = %s",
            (lost_id, user_id)
        )
        report = cursor.fetchone()
        if not report:
            return jsonify({
                "success": False,
                "error": "Lost report not found",
                "message": "You can only view matches for your own lost reports."
            }), 404

        if report['status'] == 'closed':
            return jsonify({
                "success": False,
                "error": "Lost report already resolved",
                "message": "This lost report is already closed because the item was recovered."
            }), 400
            
        cursor.execute("SELECT * FROM item WHERE category_id = %s AND status IN ('unclaimed', 'matched')", (report['category_id'],))
        matches = cursor.fetchall()
        for i in matches:
            if hasattr(i['reported_date'], 'isoformat'):
                i['reported_date'] = i['reported_date'].isoformat()
        return jsonify({"success": True, "data": matches}), 200
    finally:
        cursor.close()
        conn.close()
