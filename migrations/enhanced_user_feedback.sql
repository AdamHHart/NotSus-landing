-- File: migrations/02_enhanced_user_feedback.sql

-- Parent/Guardian Profile
CREATE TABLE IF NOT EXISTS guardian_profiles (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50), -- parent, teacher, education professional, etc.
    children_age_ranges TEXT[], -- Array of age ranges
    education_level VARCHAR(100),
    location_country VARCHAR(100),
    location_region VARCHAR(100),
    current_browser VARCHAR(100),
    tech_comfort_level INTEGER CHECK (tech_comfort_level BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Feedback with Categories
CREATE TABLE IF NOT EXISTS feedback_submissions (
    id SERIAL PRIMARY KEY,
    guardian_id INTEGER REFERENCES guardian_profiles(id),
    submission_type VARCHAR(50), -- initial survey, feature request, concern, etc.
    category VARCHAR(50), -- security, content, usability, etc.
    sentiment FLOAT CHECK (sentiment BETWEEN -1 AND 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Detailed Concerns Tracking
CREATE TABLE IF NOT EXISTS concern_details (
    id SERIAL PRIMARY KEY,
    feedback_id INTEGER REFERENCES feedback_submissions(id),
    concern_type VARCHAR(50),
    severity INTEGER CHECK (severity BETWEEN 1 AND 5),
    frequency VARCHAR(50), -- daily, weekly, monthly
    impact_area VARCHAR(50), -- academic, social, health, etc.
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Feature Interests and Preferences
CREATE TABLE IF NOT EXISTS feature_interests (
    id SERIAL PRIMARY KEY,
    guardian_id INTEGER REFERENCES guardian_profiles(id),
    feature_category VARCHAR(50), -- learning tools, monitoring, content filtering, etc.
    interest_level INTEGER CHECK (interest_level BETWEEN 1 AND 5),
    price_sensitivity INTEGER CHECK (price_sensitivity BETWEEN 1 AND 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email Campaign Engagement
CREATE TABLE IF NOT EXISTS email_engagement (
    id SERIAL PRIMARY KEY,
    guardian_id INTEGER REFERENCES guardian_profiles(id),
    campaign_type VARCHAR(50),
    opened BOOLEAN DEFAULT FALSE,
    clicked BOOLEAN DEFAULT FALSE,
    unsubscribed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Website Interaction Tracking
CREATE TABLE IF NOT EXISTS site_interactions (
    id SERIAL PRIMARY KEY,
    guardian_id INTEGER,  -- Nullable for anonymous users
    session_id VARCHAR(255),
    page_path VARCHAR(255),
    interaction_type VARCHAR(50), -- pageview, click, form_submit, etc.
    duration_seconds INTEGER,
    device_type VARCHAR(50),
    browser_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Product Interest Registry
CREATE TABLE IF NOT EXISTS product_interest (
    id SERIAL PRIMARY KEY,
    guardian_id INTEGER REFERENCES guardian_profiles(id),
    max_price_point DECIMAL(10,2),
    preferred_payment_model VARCHAR(50), -- subscription, one-time, freemium
    features_required TEXT[],
    deal_breakers TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Views for KPI Tracking
CREATE OR REPLACE VIEW kpi_daily_metrics AS
SELECT 
    DATE_TRUNC('day', created_at) AS date,
    COUNT(DISTINCT guardian_id) AS unique_visitors,
    COUNT(*) AS total_interactions,
    AVG(CASE WHEN interaction_type = 'form_submit' THEN 1 ELSE 0 END) AS conversion_rate,
    COUNT(DISTINCT CASE WHEN interaction_type = 'feedback' THEN guardian_id END) AS feedback_submissions
FROM site_interactions
GROUP BY DATE_TRUNC('day', created_at);

CREATE OR REPLACE VIEW concern_analysis AS
SELECT 
    concern_type,
    AVG(severity) AS avg_severity,
    COUNT(*) AS frequency,
    MODE() WITHIN GROUP (ORDER BY impact_area) AS primary_impact,
    DATE_TRUNC('week', created_at) AS week
FROM concern_details
GROUP BY concern_type, DATE_TRUNC('week', created_at);

-- Indexes for Performance
CREATE INDEX idx_guardian_profiles_email ON guardian_profiles(email);
CREATE INDEX idx_feedback_submissions_created_at ON feedback_submissions(created_at);
CREATE INDEX idx_site_interactions_guardian_session ON site_interactions(guardian_id, session_id);
CREATE INDEX idx_concern_details_type_severity ON concern_details(concern_type, severity);