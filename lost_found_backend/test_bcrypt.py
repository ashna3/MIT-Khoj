import bcrypt
hash_str = b'$2b$12$X5lXfJcHg1LzL1Oof2lW7OyR6fE3S76QoV6hH9M1I8J5ySjD8L13e'
print("Password check:", bcrypt.checkpw(b'password', hash_str))
