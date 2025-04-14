CREATE TABLE user_feedback (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    screen_time_addiction BOOLEAN DEFAULT FALSE,
    consumptive_habits BOOLEAN DEFAULT FALSE,
    inappropriate_content BOOLEAN DEFAULT FALSE,
    bad_influences BOOLEAN DEFAULT FALSE,
    safety BOOLEAN DEFAULT FALSE,
    false_information BOOLEAN DEFAULT FALSE,
    social_distortion BOOLEAN DEFAULT FALSE,
    other_concern BOOLEAN DEFAULT FALSE,
    other_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE app_downloads (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    download_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address VARCHAR(50)
);

-- Add user_id foreign key to user_feedback
ALTER TABLE user_feedback 
ADD COLUMN user_id INTEGER REFERENCES users(id);
