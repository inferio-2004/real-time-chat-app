CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    uid  VARCHAR(6) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- Table to store user public keys for E2E encryption (deterministic keys)
CREATE TABLE user_keys (
    uid VARCHAR(6) REFERENCES users(uid) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    salt VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (uid)
);

CREATE TABLE msg (
    mid UUID DEFAULT uuid_generate_v4() PRIMARY KEY,   
    sender VARCHAR(6) REFERENCES users(uid),          
    receiver VARCHAR(6) REFERENCES users(uid),        
    content TEXT NOT NULL,  -- Changed to TEXT to handle encrypted content                   
    timestamp varchar(40), 
    is_read BOOLEAN                     
);