-- SmartPath Database Schema for Local PostgreSQL
-- Run this SQL in your local PostgreSQL database
-- Usage: psql -U postgres -d smartpath -f local_postgres_schema.sql

-- Create database if it doesn't exist (run this separately if needed)
-- CREATE DATABASE smartpath;

-- Connect to the database
-- \c smartpath;

-- Enable UUID extension (optional, for future use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) NOT NULL DEFAULT 'student',
    grade_level INTEGER CHECK (grade_level >= 3 AND grade_level <= 12),
    curriculum_type VARCHAR(20) DEFAULT 'CBE',
    phone_number VARCHAR(20),
    school_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Academic Reports table
CREATE TABLE IF NOT EXISTS academic_reports (
    report_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    report_date TIMESTAMP WITH TIME ZONE NOT NULL,
    term VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    grades_json JSONB NOT NULL,
    overall_gpa DECIMAL(3,2),
    file_path VARCHAR(500),
    file_type VARCHAR(50),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE
);

-- Subject Performance table
CREATE TABLE IF NOT EXISTS subject_performance (
    performance_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    current_grade VARCHAR(10),
    grade_numeric DECIMAL(4,2),
    trend VARCHAR(20),
    strength_score DECIMAL(5,2) DEFAULT 0.0,
    weakness_areas JSONB,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
    card_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(200),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'medium',
    times_reviewed INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    last_reviewed TIMESTAMP WITH TIME ZONE,
    next_review_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Flashcard Reviews table
CREATE TABLE IF NOT EXISTS flashcard_reviews (
    review_id SERIAL PRIMARY KEY,
    card_id INTEGER NOT NULL REFERENCES flashcards(card_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    correct BOOLEAN NOT NULL,
    user_answer TEXT,
    feedback TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Career Recommendations table
CREATE TABLE IF NOT EXISTS career_recommendations (
    recommendation_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    career_path VARCHAR(200) NOT NULL,
    career_description TEXT,
    suitable_universities JSONB,
    course_requirements JSONB,
    match_score DECIMAL(5,2) NOT NULL,
    reasoning TEXT,
    job_market_outlook TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_favorite BOOLEAN DEFAULT FALSE
);

-- Study Plans table
CREATE TABLE IF NOT EXISTS study_plans (
    plan_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    focus_area VARCHAR(200),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    daily_duration_minutes INTEGER NOT NULL,
    priority INTEGER DEFAULT 5,
    status VARCHAR(20) DEFAULT 'active',
    study_strategy TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study Sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES study_plans(plan_id) ON DELETE SET NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    topics_covered JSONB
);

-- Learning Insights table
CREATE TABLE IF NOT EXISTS learning_insights (
    insight_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL,
    title VARCHAR(200),
    content TEXT NOT NULL,
    metadata JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON academic_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_date ON academic_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_performance_user_subject ON subject_performance(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_flashcards_user ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_subject ON flashcards(subject);
CREATE INDEX IF NOT EXISTS idx_career_user ON career_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_user ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_user ON learning_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON learning_insights(insight_type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_plans_updated_at BEFORE UPDATE ON study_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
-- Uncomment the following lines if you want sample data

/*
-- Sample user
INSERT INTO users (email, password_hash, full_name, user_type, grade_level, curriculum_type)
VALUES ('student@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPjYfY8G6J6G', 'John Doe', 'student', 10, 'CBE')
ON CONFLICT (email) DO NOTHING;

-- Sample academic report
INSERT INTO academic_reports (user_id, report_date, term, year, grades_json, overall_gpa)
SELECT user_id, '2024-01-15'::timestamp, 'Term 1', 2024, '{"Math": "A", "English": "B+", "Science": "A-"}'::jsonb, 3.8
FROM users WHERE email = 'student@example.com'
ON CONFLICT DO NOTHING;

-- Sample subject performance
INSERT INTO subject_performance (user_id, subject, current_grade, grade_numeric, trend, strength_score)
SELECT user_id, 'Mathematics', 'A', 4.0, 'improving', 85.5
FROM users WHERE email = 'student@example.com'
ON CONFLICT DO NOTHING;
*/

COMMENT ON TABLE users IS 'User accounts and profiles';
COMMENT ON TABLE academic_reports IS 'Uploaded academic reports with grades';
COMMENT ON TABLE subject_performance IS 'Subject-wise performance tracking';
COMMENT ON TABLE flashcards IS 'AI-generated study flashcards';
COMMENT ON TABLE flashcard_reviews IS 'Flashcard review history';
COMMENT ON TABLE career_recommendations IS 'AI-generated career recommendations';
COMMENT ON TABLE study_plans IS 'Personalized study plans';
COMMENT ON TABLE study_sessions IS 'Study session logs';
COMMENT ON TABLE learning_insights IS 'AI-generated learning insights and feedback';
