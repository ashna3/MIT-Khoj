USE lost_found_db;

DELIMITER //
CREATE TRIGGER trg_claim_audit
AFTER UPDATE ON claim
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO claim_log (claim_id, old_status, new_status, changed_by, changed_at, remarks)
        VALUES (NEW.claim_id, OLD.status, NEW.status, NEW.admin_id, NOW(),
                CONCAT('Status changed from ', OLD.status, ' to ', NEW.status));
    END IF;
END //
DELIMITER ;

DELIMITER //
CREATE TRIGGER trg_item_history
AFTER UPDATE ON item
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO item_history (item_id, old_status, new_status, event_note, changed_at)
        VALUES (NEW.item_id, OLD.status, NEW.status,
                CONCAT('Item status changed to ', NEW.status), NOW());
    END IF;
END //
DELIMITER ;

DELIMITER //
CREATE TRIGGER trg_item_created
AFTER INSERT ON item
FOR EACH ROW
BEGIN
    INSERT INTO item_history (item_id, old_status, new_status, event_note, changed_at)
    VALUES (NEW.item_id, NULL, 'unclaimed', 'Item reported and added to system', NOW());
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE smart_match(IN p_lost_id INT)
BEGIN
    UPDATE item i
    JOIN lost_report lr ON lr.lost_id = p_lost_id
    SET i.status = 'matched'
    WHERE i.category_id = lr.category_id
      AND i.status = 'unclaimed'
      AND (
          LOWER(i.location_found) LIKE CONCAT('%', LOWER(SUBSTRING_INDEX(lr.lost_location, ' ', 1)), '%')
          OR LOWER(i.description) LIKE CONCAT('%', LOWER(SUBSTRING_INDEX(lr.description, ' ', 1)), '%')
      );

    UPDATE lost_report lr
    SET lr.status = 'matched'
    WHERE lr.lost_id = p_lost_id
      AND EXISTS (
          SELECT 1 FROM item i
          WHERE i.category_id = lr.category_id
            AND i.status = 'matched'
      );
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE auto_expire_items()
BEGIN
    UPDATE item
    SET status = 'expired'
    WHERE status = 'unclaimed'
      AND reported_date < NOW() - INTERVAL 30 DAY;
END //
DELIMITER ;

DELIMITER //
CREATE FUNCTION calculate_ownership_score(p_claim_id INT)
RETURNS DECIMAL(5,2)
NOT DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_score DECIMAL(5,2) DEFAULT 50.0;
    DECLARE v_proof VARCHAR(500);
    DECLARE v_item_desc VARCHAR(500);
    DECLARE v_item_loc VARCHAR(200);

    SELECT c.proof_description, i.description, i.location_found
    INTO v_proof, v_item_desc, v_item_loc
    FROM claim c
    JOIN item i ON c.item_id = i.item_id
    WHERE c.claim_id = p_claim_id;

    IF v_item_desc IS NOT NULL AND LOCATE(LOWER(SUBSTRING_INDEX(v_item_desc, ' ', 2)), LOWER(v_proof)) > 0 THEN
        SET v_score = v_score + 25.0;
    END IF;

    IF v_item_loc IS NOT NULL AND LOCATE(LOWER(SUBSTRING_INDEX(v_item_loc, ' ', 1)), LOWER(v_proof)) > 0 THEN
        SET v_score = v_score + 25.0;
    END IF;

    RETURN LEAST(v_score, 100.0);
END //
DELIMITER ;

DELIMITER //
CREATE FUNCTION location_risk_score(p_location VARCHAR(200))
RETURNS DECIMAL(5,2)
NOT DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_max INT DEFAULT 1;
    DECLARE v_score DECIMAL(5,2);

    SELECT COUNT(*) INTO v_count
    FROM item
    WHERE LOWER(location_found) LIKE CONCAT('%', LOWER(p_location), '%');

    SELECT GREATEST(COUNT(*), 1) INTO v_max FROM item;

    SET v_score = LEAST((v_count / v_max) * 100, 100);
    RETURN v_score;
END //
DELIMITER ;

CREATE OR REPLACE VIEW vw_recovery_rate AS
SELECT c.category_name,
       COUNT(i.item_id) AS total_items,
       SUM(CASE WHEN i.status = 'claimed' THEN 1 ELSE 0 END) AS claimed_items,
       ROUND(SUM(CASE WHEN i.status = 'claimed' THEN 1 ELSE 0 END) * 100.0 / COUNT(i.item_id), 2) AS recovery_rate_pct
FROM item i
JOIN category c ON i.category_id = c.category_id
GROUP BY c.category_name;

CREATE OR REPLACE VIEW vw_monthly_trends AS
SELECT DATE_FORMAT(reported_date, '%Y-%m') AS month,
       COUNT(*) AS items_found
FROM item
GROUP BY DATE_FORMAT(reported_date, '%Y-%m')
ORDER BY month;

CREATE OR REPLACE VIEW vw_monthly_lost_trends AS
SELECT DATE_FORMAT(reported_at, '%Y-%m') AS month,
       COUNT(*) AS items_lost
FROM lost_report
GROUP BY DATE_FORMAT(reported_at, '%Y-%m')
ORDER BY month;

CREATE OR REPLACE VIEW vw_location_risk AS
SELECT location_found,
       COUNT(*) AS total_items_found,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM item), 2) AS risk_score
FROM item
GROUP BY location_found
ORDER BY risk_score DESC;

CREATE OR REPLACE VIEW vw_status_breakdown AS
SELECT status, COUNT(*) AS count
FROM item
GROUP BY status;

CREATE OR REPLACE VIEW vw_time_to_recovery AS
SELECT c.category_name,
       ROUND(AVG(DATEDIFF(cl.reviewed_at, i.reported_date)), 1) AS avg_days_to_recovery,
       MIN(DATEDIFF(cl.reviewed_at, i.reported_date)) AS fastest_days,
       MAX(DATEDIFF(cl.reviewed_at, i.reported_date)) AS slowest_days
FROM claim cl
JOIN item i ON cl.item_id = i.item_id
JOIN category c ON i.category_id = c.category_id
WHERE cl.status = 'approved' AND cl.reviewed_at IS NOT NULL
GROUP BY c.category_name;

CREATE OR REPLACE VIEW vw_finder_loser_overlap AS
SELECT u.user_id, u.name, u.reg_no,
       COUNT(DISTINCT i.item_id) AS items_found,
       COUNT(DISTINCT lr.lost_id) AS items_lost
FROM users u
LEFT JOIN item i ON i.reported_by = u.user_id
LEFT JOIN lost_report lr ON lr.user_id = u.user_id
GROUP BY u.user_id, u.name, u.reg_no
HAVING items_found > 0 AND items_lost > 0;

CREATE OR REPLACE VIEW vw_zero_match_alerts AS
SELECT lr.lost_id, u.name AS reporter_name, c.category_name,
       lr.title, lr.lost_location,
       DATEDIFF(NOW(), lr.reported_at) AS days_unmatched
FROM lost_report lr
JOIN users u ON lr.user_id = u.user_id
JOIN category c ON lr.category_id = c.category_id
WHERE lr.status = 'unmatched'
  AND lr.reported_at < NOW() - INTERVAL 7 DAY
ORDER BY days_unmatched DESC;

CREATE OR REPLACE VIEW vw_top_finders AS
SELECT u.name, u.reg_no,
       ur.items_found, ur.successful_claims,
       ur.reliability_score
FROM user_reputation ur
JOIN users u ON ur.user_id = u.user_id
ORDER BY ur.reliability_score DESC, ur.items_found DESC;
