from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from middleware.auth_middleware import admin_required, student_required
from db import get_db_connection
from werkzeug.utils import secure_filename
import os
import uuid

items_bp = Blueprint('items', __name__)
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

def _save_image(file_storage):
    if not file_storage or not file_storage.filename:
        return None

    filename = secure_filename(file_storage.filename)
    extension = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        return None, "Only JPG and PNG images are supported"

    file_storage.stream.seek(0, os.SEEK_END)
    file_size = file_storage.stream.tell()
    file_storage.stream.seek(0)

    if file_size > MAX_IMAGE_SIZE:
        return None, "Image size must be 5MB or less"

    stored_name = f"{uuid.uuid4().hex}.{extension}"
    save_path = os.path.join(current_app.config['UPLOAD_FOLDER'], stored_name)
    file_storage.save(save_path)
    return f"http://localhost:5000/uploads/{stored_name}", None

def _user_can_view_item(cursor, user_id, role, item_id):
    if role == 'admin':
        return True

    cursor.execute(
        """
        SELECT 1
        FROM item i
        WHERE i.item_id = %s
          AND (
            i.reported_by = %s
            OR EXISTS (
                SELECT 1
                FROM claim c
                WHERE c.item_id = i.item_id
                  AND c.claimant_id = %s
                  AND c.status IN ('pending', 'approved')
            )
          )
        LIMIT 1
        """,
        (item_id, user_id, user_id)
    )
    return cursor.fetchone() is not None

@items_bp.route('/categories', methods=['GET'])
def get_categories():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT category_id, category_name FROM category ORDER BY category_name")
        return jsonify({"success": True, "data": cursor.fetchall()}), 200
    finally:
        cursor.close()
        conn.close()

@items_bp.route('/my_trackable', methods=['GET'])
@student_required()
def get_my_trackable_items():
    user_id = get_jwt_identity()
    claims = get_jwt()

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if claims.get("role") == "admin":
            cursor.execute(
                """
                SELECT i.item_id, i.title, i.status, i.reported_date, c.category_name
                FROM item i
                JOIN category c ON i.category_id = c.category_id
                ORDER BY i.reported_date DESC
                """
            )
        else:
            cursor.execute(
                """
                SELECT DISTINCT i.item_id, i.title, i.status, i.reported_date, c.category_name
                FROM item i
                JOIN category c ON i.category_id = c.category_id
                LEFT JOIN claim cl
                  ON cl.item_id = i.item_id
                  AND cl.claimant_id = %s
                  AND cl.status IN ('pending', 'approved')
                WHERE i.reported_by = %s OR cl.claim_id IS NOT NULL
                ORDER BY i.reported_date DESC
                """,
                (user_id, user_id)
            )
        items = cursor.fetchall()
        for item in items:
            item['reported_date'] = item['reported_date'].isoformat() if item['reported_date'] else None
        return jsonify({"success": True, "data": items}), 200
    finally:
        cursor.close()
        conn.close()

@items_bp.route('', methods=['GET'])
def get_items():
    category_id = request.args.get('category_id')
    location = request.args.get('location')
    status = request.args.get('status')
    search = request.args.get('search')
    
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
    if search:
        query += " AND (i.title LIKE %s OR i.description LIKE %s)"
        params.extend([f"%{search}%", f"%{search}%"])
        
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

@items_bp.route('', methods=['POST'])
@jwt_required()
def create_item():
    data = request.form if request.form else (request.json or {})
    user_id = get_jwt_identity()
    image_url = data.get('image_url')

    if 'image' in request.files and request.files['image'].filename:
        image_url, image_error = _save_image(request.files['image'])
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
            "INSERT INTO item (title, description, category_id, location_found, reported_date, image_url, reported_by) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (
                data.get('title'),
                data.get('description'),
                category_id,
                data.get('location_found'),
                data.get('reported_date'),
                image_url,
                user_id
            )
        )
        item_id = cursor.lastrowid
        cursor.execute(
            "INSERT INTO user_reputation (user_id, items_found) VALUES (%s, 1) ON DUPLICATE KEY UPDATE items_found = items_found + 1",
            (user_id,)
        )
        conn.commit()
        return jsonify({
            "success": True,
            "message": "Item created successfully",
            "data": {"item_id": item_id, "image_url": image_url}
        }), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e), "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@items_bp.route('/<int:item_id>', methods=['GET'])
@student_required()
def get_item(item_id):
    user_id = get_jwt_identity()
    claims = get_jwt()
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if claims.get("role") != "admin":
            access_cursor = conn.cursor()
            try:
                if not _user_can_view_item(access_cursor, user_id, claims.get("role"), item_id):
                    return jsonify({"success": False, "error": "Item not found", "message": "You can only view timelines for your own found or claimed items."}), 404
            finally:
                access_cursor.close()
        cursor.execute("SELECT i.*, c.category_name, u.name as reporter_name FROM item i JOIN category c ON i.category_id = c.category_id JOIN users u ON i.reported_by = u.user_id WHERE i.item_id = %s", (item_id,))
        item = cursor.fetchone()
        if item:
            item['reported_date'] = item['reported_date'].isoformat() if item['reported_date'] else None
            return jsonify({"success": True, "data": item}), 200
        return jsonify({"success": False, "error": "Item not found"}), 404
    finally:
        cursor.close()
        conn.close()

@items_bp.route('/<int:item_id>', methods=['PATCH'])
@admin_required()
def update_item(item_id):
    data = request.json
    if 'status' not in data:
        return jsonify({"success": False, "error": "Status required"}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE item SET status = %s WHERE item_id = %s", (data['status'], item_id))
        conn.commit()
        return jsonify({"success": True, "message": "Item updated"}), 200
    finally:
        cursor.close()
        conn.close()

@items_bp.route('/<int:item_id>', methods=['DELETE'])
@admin_required()
def delete_item(item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT claim_id FROM claim WHERE item_id = %s", (item_id,))
        claim_ids = [row[0] for row in cursor.fetchall()]
        if claim_ids:
            placeholders = ','.join(['%s'] * len(claim_ids))
            cursor.execute(f"DELETE FROM claim_log WHERE claim_id IN ({placeholders})", claim_ids)
            cursor.execute(f"DELETE FROM claim WHERE claim_id IN ({placeholders})", claim_ids)

        cursor.execute("DELETE FROM item_history WHERE item_id = %s", (item_id,))
        cursor.execute("DELETE FROM item WHERE item_id = %s", (item_id,))
        conn.commit()
        return jsonify({"success": True, "message": "Item deleted"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e), "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@items_bp.route('/<int:item_id>/timeline', methods=['GET'])
@student_required()
def get_item_timeline(item_id):
    user_id = get_jwt_identity()
    claims = get_jwt()
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if claims.get("role") != "admin":
            access_cursor = conn.cursor()
            try:
                if not _user_can_view_item(access_cursor, user_id, claims.get("role"), item_id):
                    return jsonify({"success": False, "error": "Item not found", "message": "You can only view timelines for your own found or claimed items."}), 404
            finally:
                access_cursor.close()
        cursor.execute("SELECT * FROM item_history WHERE item_id = %s ORDER BY changed_at", (item_id,))
        history = cursor.fetchall()
        cursor.execute("SELECT item_id, title, status, reported_date FROM item WHERE item_id = %s", (item_id,))
        item = cursor.fetchone()
        if not item:
            return jsonify({"success": False, "error": "Item not found"}), 404

        current_status = item['status']
        last_status = history[-1]['new_status'] if history else None

        if current_status != last_status:
            changed_at = item['reported_date']
            event_note = 'Item reported and added to system'

            if current_status == 'claimed':
                cursor.execute(
                    "SELECT reviewed_at FROM claim WHERE item_id = %s AND status = 'approved' ORDER BY reviewed_at DESC LIMIT 1",
                    (item_id,)
                )
                approved_claim = cursor.fetchone()
                changed_at = approved_claim['reviewed_at'] if approved_claim and approved_claim['reviewed_at'] else item['reported_date']
                event_note = 'Item status changed to claimed'
            elif current_status == 'matched':
                event_note = 'Item status changed to matched'
            elif current_status == 'expired':
                event_note = 'Item status changed to expired'

            history.append({
                'item_id': item_id,
                'old_status': last_status,
                'new_status': current_status,
                'event_note': event_note,
                'changed_at': changed_at
            })

        for h in history:
            h['changed_at'] = h['changed_at'].isoformat() if h['changed_at'] else None
        return jsonify({"success": True, "data": history}), 200
    finally:
        cursor.close()
        conn.close()
