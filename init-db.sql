-- Initialize database with default data
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create translations table
CREATE TABLE IF NOT EXISTS translations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    source_text TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    translation_engine VARCHAR(50) DEFAULT 'google',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supported_languages table
CREATE TABLE IF NOT EXISTS supported_languages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    supports_offline BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_translations_user_id ON translations(user_id);
CREATE INDEX IF NOT EXISTS idx_translations_created_at ON translations(created_at);
CREATE INDEX IF NOT EXISTS idx_translations_source_lang ON translations(source_language);
CREATE INDEX IF NOT EXISTS idx_translations_target_lang ON translations(target_language);

-- Insert default admin user (password: admin123)
-- Note: In production, change this password!
INSERT INTO users (email, username, hashed_password, is_active) 
VALUES (
    'admin@translator.com', 
    'admin', 
    '$2y$10$9/nbHwAOCP5PdwDD5jjD8eQPu/cUa0adT6s8sMXP9jCI/uuI1Hd3O', 
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert some sample supported languages
INSERT INTO supported_languages (code, name, native_name, supports_offline) VALUES
('en', 'English', 'English', true),
('vi', 'Vietnamese', 'Tiếng Việt', true),
('fr', 'French', 'Français', true),
('de', 'German', 'Deutsch', true),
('es', 'Spanish', 'Español', true),
('ja', 'Japanese', '日本語', true),
('ko', 'Korean', '한국어', true),
('zh', 'Chinese', '中文', true),
('th', 'Thai', 'ไทย', false),
('ar', 'Arabic', 'العربية', false),
('ru', 'Russian', 'Русский', false),
('pt', 'Portuguese', 'Português', false),
('it', 'Italian', 'Italiano', false),
('nl', 'Dutch', 'Nederlands', false),
('sv', 'Swedish', 'Svenska', false)
ON CONFLICT (code) DO NOTHING;
