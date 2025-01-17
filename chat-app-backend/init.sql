CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    uid  VARCHAR(6) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE msg (
    mid UUID DEFAULT uuid_generate_v4() PRIMARY KEY,   
    sender VARCHAR(6) REFERENCES users(uid),          
    receiver VARCHAR(6) REFERENCES users(uid),        
    content VARCHAR(255) NOT NULL,                   
    timestamp varchar(40), 
    is_read BOOLEAN                     
);