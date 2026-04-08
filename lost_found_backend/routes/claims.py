from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from middleware.auth_middleware import student_required
from db import get_db_connection

claims_bp = Blueprint('claims', __name__)

@claims_bp.route('', methods=['POST'])
@student_required()
def create_claim():
    data = request.json
    user_id = get_jwt_identity()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT claim_id FROM claim WHERE item_id = %s AND claimant_id = %s AND status IN ('pending', 'approved')",
            (data['item_id'], user_id)
        )
        existing_claim = cursor.fetchone()
        if existing_claim:
            return jsonify({
                "success": False,
                "error": "Claim already exists",
                "message": "Claim request submitted. Waiting admin approval."
            }), 400

        cursor.execute(
            "INSERT INTO claim (item_id, claimant_id, proof_description, lost_id) VALUES (%s, %s, %s, %s)",
            (data['item_id'], user_id, data['proof_description'], data.get('lost_id'))
        )
        claim_id = cursor.lastrowid
        
        cursor.execute("SELECT calculate_ownership_score(%s)", (claim_id,))
        score = cursor.fetchone()[0]
        score_float = float(score) if score is not None else None
        
        cursor.execute("UPDATE claim SET ownership_score = %s WHERE claim_id = %s", (score_float, claim_id))
        conn.commit()
        
        return jsonify({"success": True, "data": {"claim_id": claim_id, "ownership_score": score_float}}), 201
    finally:
        cursor.close()
        conn.close()

@claims_bp.route('/my', methods=['GET'])
@student_required()
def get_my_claims():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT c.*, i.title as item_title FROM claim c JOIN item i ON c.item_id = i.item_id WHERE c.claimant_id = %s ORDER BY c.claim_date DESC", (user_id,))
        claims = cursor.fetchall()
        for c in claims:
            c['claim_date'] = c['claim_date'].isoformat() if c['claim_date'] else None
            c['reviewed_at'] = c['reviewed_at'].isoformat() if c['reviewed_at'] else None
            c['ownership_score'] = float(c['ownership_score']) if c['ownership_score'] is not None else None
        return jsonify({"success": True, "data": claims}), 200
    finally:
        cursor.close()
        conn.close()
