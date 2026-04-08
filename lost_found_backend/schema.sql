CREATE DATABASE IF NOT EXISTS lost_found_db;
USE lost_found_db;

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    reg_no VARCHAR(20) UNIQUE,
    admin_no VARCHAR(20) UNIQUE,
    phone VARCHAR(15),
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS category (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS item (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(500),
    category_id INT NOT NULL,
    status ENUM('unclaimed', 'matched', 'claimed', 'expired') DEFAULT 'unclaimed',
    reported_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    location_found VARCHAR(200) NOT NULL,
    reported_by INT NOT NULL,
    image_url VARCHAR(300),
    FOREIGN KEY (category_id) REFERENCES category(category_id),
    FOREIGN KEY (reported_by) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS lost_report (
    lost_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(500),
    lost_date DATE NOT NULL,
    lost_location VARCHAR(200) NOT NULL,
    status ENUM('unmatched', 'matched', 'closed') DEFAULT 'unmatched',
    reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (category_id) REFERENCES category(category_id)
);

CREATE TABLE IF NOT EXISTS claim (
    claim_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    claimant_id INT NOT NULL,
    admin_id INT,
    claim_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    proof_description VARCHAR(500) NOT NULL,
    lost_id INT,
    ownership_score DECIMAL(5,2),
    reviewed_at DATETIME,
    FOREIGN KEY (item_id) REFERENCES item(item_id),
    FOREIGN KEY (claimant_id) REFERENCES users(user_id),
    FOREIGN KEY (admin_id) REFERENCES users(user_id),
    FOREIGN KEY (lost_id) REFERENCES lost_report(lost_id)
);

CREATE TABLE IF NOT EXISTS claim_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL,
    old_status VARCHAR(15),
    new_status VARCHAR(15) NOT NULL,
    changed_by INT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    remarks VARCHAR(300),
    FOREIGN KEY (claim_id) REFERENCES claim(claim_id),
    FOREIGN KEY (changed_by) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS item_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    old_status VARCHAR(15),
    new_status VARCHAR(15) NOT NULL,
    event_note VARCHAR(300),
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES item(item_id)
);

CREATE TABLE IF NOT EXISTS user_reputation (
    rep_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    items_found INT DEFAULT 0,
    successful_claims INT DEFAULT 0,
    disputed_claims INT DEFAULT 0,
    reliability_score DECIMAL(5,2) DEFAULT 100.00,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
