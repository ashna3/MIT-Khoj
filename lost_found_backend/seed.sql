USE lost_found_db;

INSERT IGNORE INTO category (category_name) VALUES
('Electronics'), ('Bags'), ('ID Cards'), ('Clothing'),
('Keys'), ('Books'), ('Water Bottles'), ('Jewellery');

INSERT IGNORE INTO users (name, reg_no, phone, role, password_hash) VALUES
('Ashna Saldanha',  '240905446', '9876543210', 'student', '$2b$12$X5lXfJcHg1LzL1Oof2lW7OyR6fE3S76QoV6hH9M1I8J5ySjD8L13e'),
('Rohan Nair',      '240905123', '9900112233', 'student', '$2b$12$X5lXfJcHg1LzL1Oof2lW7OyR6fE3S76QoV6hH9M1I8J5ySjD8L13e'),
('Priya Menon',     '240905234', '9812345678', 'student', '$2b$12$X5lXfJcHg1LzL1Oof2lW7OyR6fE3S76QoV6hH9M1I8J5ySjD8L13e'),
('Admin User',      'ADMIN001',  '9845001234', 'admin',   '$2b$12$X5lXfJcHg1LzL1Oof2lW7OyR6fE3S76QoV6hH9M1I8J5ySjD8L13e'),
('Karan Shah',      '240905345', '9988776655', 'student', '$2b$12$X5lXfJcHg1LzL1Oof2lW7OyR6fE3S76QoV6hH9M1I8J5ySjD8L13e'),
('Divya Rao',       '240905456', '9871234560', 'student', '$2b$12$X5lXfJcHg1LzL1Oof2lW7OyR6fE3S76QoV6hH9M1I8J5ySjD8L13e'),
('Aditya Kumar',    '240905567', '9823456780', 'student', '$2b$12$X5lXfJcHg1LzL1Oof2lW7OyR6fE3S76QoV6hH9M1I8J5ySjD8L13e'),
('Sneha Pillai',    '240905678', '9734561230', 'student', '$2b$12$X5lXfJcHg1LzL1Oof2lW7OyR6fE3S76QoV6hH9M1I8J5ySjD8L13e'),
('Mihir Joshi',     '240905789', '9645672340', 'student', '$2b$12$X5lXfJcHg1LzL1Oof2lW7OyR6fE3S76QoV6hH9M1I8J5ySjD8L13e'),
('Tanvi Desai',     '240905890', '9556783450', 'student', '$2b$12$X5lXfJcHg1LzL1Oof2lW7OyR6fE3S76QoV6hH9M1I8J5ySjD8L13e'),
('Arjun Bhat',      '240905901', '9467894560', 'student', '$2b$12$X5lXfJcHg1LzL1Oof2lW7OyR6fE3S76QoV6hH9M1I8J5ySjD8L13e'),
('Admin Two',       'ADMIN002',  '9378905670', 'admin',   '$2b$12$X5lXfJcHg1LzL1Oof2lW7OyR6fE3S76QoV6hH9M1I8J5ySjD8L13e');

INSERT IGNORE INTO item (title, description, category_id, status, reported_date, location_found, reported_by) VALUES
('Blue JanSport backpack',      'Blue backpack with laptop compartment, white zipper',       2, 'unclaimed', NOW() - INTERVAL 2  DAY,  'MIT Library - Ground Floor',         2),
('Samsung Galaxy earphones',    'Black Samsung earphones in white case',                     1, 'unclaimed', NOW() - INTERVAL 4  DAY,  'Food Court 2 near B20',              3),
('MIT Student ID Card',         'ID card for a 3rd year CSE student',                       3, 'unclaimed', NOW() - INTERVAL 5  DAY,  'Ashtanga Building Entrance',         2),
('Black hoodie',                'Black hoodie size M with MIT logo on back',                 4, 'claimed',   NOW() - INTERVAL 20 DAY,  'AB4 Seminar Hall',                   5),
('Car keys with red keychain',  'Maruti car keys with red heart keychain',                   5, 'unclaimed', NOW() - INTERVAL 6  DAY,  'Main Parking near ABS',              6),
('Data Structures textbook',    'Cormen CLRS 3rd edition, name written inside cover',        6, 'claimed',   NOW() - INTERVAL 35 DAY,  'MIT Library - Reading Room',         3),
('OnePlus smartphone',          'Black OnePlus 11, cracked bottom-left corner',              1, 'unclaimed', NOW() - INTERVAL 3  DAY,  'Student Plaza',                      5),
('Blue water bottle',           'Blue Milton bottle with flower stickers',                   7, 'unclaimed', NOW() - INTERVAL 1  DAY,  'MIT Ground Stands',                  6),
('Silver bracelet',             'Thin silver bracelet with heart charm',                     8, 'unclaimed', NOW() - INTERVAL 7  DAY,  'Girls Hostel - Abhimanyu Block',     2),
('Black Dell laptop bag',       'Black Dell laptop bag with shoulder strap and red tag',     2, 'claimed',   NOW() - INTERVAL 25 DAY,  'B1 Lecture Hall',                    3),
('Wireless mouse',              'White Logitech wireless mouse, no dongle',                  1, 'unclaimed', NOW() - INTERVAL 9  DAY,  'HP Workshop Building - Lab 2',       7),
('Yellow raincoat',             'Yellow foldable raincoat in a pouch',                       4, 'unclaimed', NOW() - INTERVAL 11 DAY,  'Main Gate - Security Booth',         8),
('House keys with fob',         'Silver house keys with blue apartment fob attached',        5, 'matched',   NOW() - INTERVAL 13 DAY,  'Boys Hostel - Ashtanga Lobby',       9),
('Python programming book',     'Python Crash Course book with sticky notes inside',         6, 'unclaimed', NOW() - INTERVAL 14 DAY,  'MIT Library - First Floor',          10),
('Rose gold watch',             'Rose gold ladies wrist watch, broken clasp',                8, 'unclaimed', NOW() - INTERVAL 16 DAY,  'Food Court 1 near Student Plaza',    11),
('Green backpack',              'Dark green Wildcraft backpack with side pockets',           2, 'unclaimed', NOW() - INTERVAL 17 DAY,  'Basketball Court near B6',           2),
('Library ID card',             'Library access card for student ID 220905123',              3, 'matched',   NOW() - INTERVAL 18 DAY,  'MIT Library - Entrance Desk',        3),
('Black umbrella',              'Black folding umbrella with wooden handle',                 4, 'expired',   NOW() - INTERVAL 45 DAY,  'AB3 Corridor Ground Floor',          5),
('Bike keys',                   'Honda Activa keys with yellow tag',                         5, 'unclaimed', NOW() - INTERVAL 8  DAY,  'Two-Wheeler Parking near Mess',      6),
('Organic Chemistry textbook',  'Clayden Organic Chemistry book, 2nd year',                  6, 'claimed',   NOW() - INTERVAL 40 DAY,  'B5 Lab Block Corridor',              7),
('Apple AirPods',               'White AirPods Gen 2 in case, left earbud scratched',       1, 'unclaimed', NOW() - INTERVAL 2  DAY,  'B2 Lecture Hall - Row C',            8),
('Steel water bottle',          'Silver steel bottle with MIT sticker',                      7, 'unclaimed', NOW() - INTERVAL 10 DAY,  'Swimming Pool Area',                 9),
('Gold chain',                  'Thin gold chain with small pendant, no clasp',              8, 'unclaimed', NOW() - INTERVAL 12 DAY,  'Girls Hostel - Abhimanyu Block',     10),
('Navy blue hoodie',            'Navy blue hoodie size L, Zara brand label',                 4, 'unclaimed', NOW() - INTERVAL 15 DAY,  'Football Ground Bleachers',          11),
('USB-C charger',               'White 65W USB-C charger with frayed cable near plug',       1, 'expired',   NOW() - INTERVAL 50 DAY,  'Abhimanyu Building - Lab 1',         2),
('Tan leather wallet',          'Tan leather bifold wallet with initials R.N. on back',      2, 'unclaimed', NOW() - INTERVAL 3  DAY,  'MIT Library - Ground Floor',         3),
('Reading glasses',             'Black frame reading glasses in blue hard case',             4, 'unclaimed', NOW() - INTERVAL 6  DAY,  'MIT Library - Reading Room',         5),
('Pendrive 32GB',               'Black SanDisk 32GB USB 3.0 pendrive',                      1, 'claimed',   NOW() - INTERVAL 30 DAY,  'HP Workshop Building - Lab 1',       6),
('Cricket batting gloves',      'White and red batting gloves, right hand only',             4, 'unclaimed', NOW() - INTERVAL 4  DAY,  'MIT Cricket Ground',                 7),
('Calculus textbook',           'Stewart Calculus 8th edition with name on first page',      6, 'unclaimed', NOW() - INTERVAL 9  DAY,  'B3 Lecture Hall',                    8);

INSERT IGNORE INTO lost_report (user_id, category_id, title, description, lost_date, lost_location, status, reported_at) VALUES
(1,  1, 'Lost Samsung earphones',     'Black Samsung earphones lost after lunch',            NOW() - INTERVAL 5  DAY, 'Food Court 2 near B20',              'matched',   NOW() - INTERVAL 5  DAY),
(1,  2, 'Lost blue backpack',         'Blue JanSport bag with laptop inside',                NOW() - INTERVAL 3  DAY, 'MIT Library',                        'unmatched', NOW() - INTERVAL 3  DAY),
(5,  5, 'Lost car keys',              'Maruti keys with red heart keychain',                 NOW() - INTERVAL 7  DAY, 'Main Parking near ABS',              'unmatched', NOW() - INTERVAL 7  DAY),
(6,  4, 'Lost black hoodie',          'Black hoodie left after evening class',               NOW() - INTERVAL 21 DAY, 'AB4 Seminar Hall',                   'closed',    NOW() - INTERVAL 21 DAY),
(3,  3, 'Lost student ID',            'My MIT student ID card',                              NOW() - INTERVAL 6  DAY, 'Ashtanga Building',                  'matched',   NOW() - INTERVAL 6  DAY),
(7,  1, 'Lost wireless mouse',        'White Logitech mouse no dongle',                      NOW() - INTERVAL 10 DAY, 'HP Workshop Building',               'unmatched', NOW() - INTERVAL 10 DAY),
(8,  8, 'Lost gold necklace',         'Thin gold chain with small pendant',                  NOW() - INTERVAL 13 DAY, 'Girls Hostel - Abhimanyu Block',     'unmatched', NOW() - INTERVAL 13 DAY),
(9,  5, 'Lost house keys',            'Silver keys with blue apartment fob',                 NOW() - INTERVAL 14 DAY, 'Boys Hostel - Ashtanga Lobby',       'matched',   NOW() - INTERVAL 14 DAY),
(10, 6, 'Lost Python book',           'Python Crash Course with my name inside',             NOW() - INTERVAL 15 DAY, 'MIT Library - First Floor',          'unmatched', NOW() - INTERVAL 15 DAY),
(11, 1, 'Lost AirPods',               'White AirPods Gen 2, left one slightly scratched',   NOW() - INTERVAL 3  DAY, 'B2 Lecture Hall',                    'unmatched', NOW() - INTERVAL 3  DAY),
(2,  2, 'Lost green backpack',        'Dark green Wildcraft bag',                            NOW() - INTERVAL 18 DAY, 'Basketball Court near B6',           'unmatched', NOW() - INTERVAL 18 DAY),
(3,  3, 'Lost library card',          'Library access card for the main library',            NOW() - INTERVAL 19 DAY, 'MIT Library - Entrance Desk',        'matched',   NOW() - INTERVAL 19 DAY),
(5,  5, 'Lost bike keys',             'Honda Activa keys with yellow keychain tag',          NOW() - INTERVAL 9  DAY, 'Two-Wheeler Parking near Mess',      'unmatched', NOW() - INTERVAL 9  DAY),
(6,  1, 'Lost USB charger',           'White 65W USB-C charger',                             NOW() - INTERVAL 52 DAY, 'Abhimanyu Building - Lab 1',         'closed',    NOW() - INTERVAL 52 DAY),
(7,  7, 'Lost steel water bottle',    'Silver MIT bottle',                                   NOW() - INTERVAL 11 DAY, 'Swimming Pool Area',                 'unmatched', NOW() - INTERVAL 11 DAY),
(8,  4, 'Lost navy hoodie',           'Navy blue hoodie size L',                             NOW() - INTERVAL 16 DAY, 'Football Ground Bleachers',          'unmatched', NOW() - INTERVAL 16 DAY),
(9,  1, 'Lost pendrive',              'Black SanDisk 32GB pendrive',                         NOW() - INTERVAL 31 DAY, 'HP Workshop Building - Lab 1',       'closed',    NOW() - INTERVAL 31 DAY),
(10, 4, 'Lost reading glasses',       'Black frame glasses in blue case',                    NOW() - INTERVAL 7  DAY, 'MIT Library - Reading Room',         'unmatched', NOW() - INTERVAL 7  DAY),
(11, 6, 'Lost calculus book',         'Stewart Calculus 8th edition',                        NOW() - INTERVAL 10 DAY, 'B3 Lecture Hall',                    'unmatched', NOW() - INTERVAL 10 DAY),
(1,  8, 'Lost silver bracelet',       'Thin silver bracelet with heart charm',               NOW() - INTERVAL 8  DAY, 'Girls Hostel - Abhimanyu Block',     'unmatched', NOW() - INTERVAL 8  DAY);

INSERT IGNORE INTO claim (item_id, claimant_id, admin_id, claim_date, status, proof_description, ownership_score, reviewed_at) VALUES
(6,  2,  4,  NOW() - INTERVAL 33 DAY, 'approved',  'My name is written inside the cover on page 1, page 47 has my highlighted notes',         92.50, NOW() - INTERVAL 32 DAY),
(10, 1,  4,  NOW() - INTERVAL 23 DAY, 'approved',  'Black Dell bag with red tag I tied myself, has charger inside front pocket',              88.00, NOW() - INTERVAL 22 DAY),
(4,  6,  12, NOW() - INTERVAL 19 DAY, 'approved',  'Black hoodie size M, MIT logo, bought from the campus store in August',                   79.00, NOW() - INTERVAL 18 DAY),
(20, 7,  4,  NOW() - INTERVAL 38 DAY, 'approved',  'Clayden book 2nd year, my roll number 46 is written on top edge of pages',               95.00, NOW() - INTERVAL 37 DAY),
(28, 9,  12, NOW() - INTERVAL 28 DAY, 'approved',  'Black SanDisk pendrive, has a small scratch on the cap, my files are inside',             85.00, NOW() - INTERVAL 27 DAY),
(1,  1,  NULL, NOW() - INTERVAL 1 DAY, 'pending',  'Blue JanSport with laptop compartment and a scratch on the left strap',                  NULL,  NULL),
(2,  1,  NULL, NOW() - INTERVAL 2 DAY, 'pending',  'Black Samsung earphones in white case, bought last month, serial ends in 4421',          NULL,  NULL),
(7,  11, NULL, NOW() - INTERVAL 1 DAY, 'pending',  'Black OnePlus 11 cracked bottom corner, wallpaper is a mountain photo',                   NULL,  NULL),
(21, 1,  4,  NOW() - INTERVAL 1 DAY,  'rejected',  'Claiming white AirPods but could not describe the case correctly',                        22.00, NOW()),
(15, 2,  12, NOW() - INTERVAL 14 DAY, 'rejected',  'Could not identify the broken clasp or the brand of the watch',                          18.00, NOW() - INTERVAL 13 DAY),
(13, 9,  4,  NOW() - INTERVAL 11 DAY, 'approved',  'Silver house keys with blue fob, the fob has apartment number B204 on it',               91.00, NOW() - INTERVAL 10 DAY),
(17, 3,  12, NOW() - INTERVAL 16 DAY, 'approved',  'Library card for student ID 220905123 which is my registration number',                   97.00, NOW() - INTERVAL 15 DAY);

INSERT IGNORE INTO user_reputation (user_id, items_found, successful_claims, disputed_claims, reliability_score, last_updated) VALUES
(1,  0, 2, 1, 66.67, NOW()),
(2,  4, 1, 1, 50.00, NOW()),
(3,  3, 1, 0, 100.0, NOW()),
(5,  2, 0, 0, 100.0, NOW()),
(6,  2, 1, 0, 100.0, NOW()),
(7,  2, 1, 0, 100.0, NOW()),
(8,  2, 0, 1, 0.00,  NOW()),
(9,  2, 2, 0, 100.0, NOW()),
(10, 2, 0, 0, 100.0, NOW()),
(11, 2, 0, 1, 0.00,  NOW());
