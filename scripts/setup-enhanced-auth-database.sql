-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS two_factor_backup_codes CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS user_devices CASCADE;
DROP TABLE IF EXISTS user_location_history CASCADE;
DROP TABLE IF EXISTS server_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS locations CASCADE;

-- Create locations table first (referenced by users)
CREATE TABLE locations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create enhanced users table with 2FA and additional fields
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    national_id VARCHAR(10) UNIQUE NOT NULL,
    password_hash TEXT,
    avatar_url TEXT,
    status VARCHAR(50) DEFAULT 'active',
    role VARCHAR(50) DEFAULT 'user',
    auth_provider VARCHAR(50) DEFAULT 'email',
    google_id VARCHAR(255) UNIQUE,
    location_id BIGINT,
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_location_update TIMESTAMP WITH TIME ZONE,
    is_location_enabled BOOLEAN DEFAULT false,
    
    -- Two-Factor Authentication fields
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    two_factor_backup_codes TEXT[],
    
    -- Security fields
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    
    -- Email verification
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- Create password reset tokens table
CREATE TABLE password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create user sessions table
CREATE TABLE user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    session_token TEXT NOT NULL,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create user devices table
CREATE TABLE user_devices (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50),
    platform VARCHAR(50),
    browser VARCHAR(100),
    supports_gps BOOLEAN DEFAULT false,
    supports_push BOOLEAN DEFAULT false,
    location_permission VARCHAR(20) DEFAULT 'prompt',
    background_location_enabled BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, device_id)
);

-- Create user_location_history table for tracking location changes
CREATE TABLE user_location_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create server_logs table
CREATE TABLE server_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    user_id BIGINT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_national_id ON users(national_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location_id);
CREATE INDEX IF NOT EXISTS idx_users_current_location ON users(current_latitude, current_longitude);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON user_devices(device_id);

CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_location_history_user ON user_location_history(user_id);
CREATE INDEX IF NOT EXISTS idx_location_history_timestamp ON user_location_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_action ON server_logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON server_logs(created_at);

-- Insert sample locations with coordinates
INSERT INTO locations (name, address, city, country, latitude, longitude) VALUES
('دفتر مرکزی', 'خیابان ولیعصر، پلاک 123', 'تهران', 'ایران', 35.6892, 51.3890),
('شعبه اصفهان', 'خیابان چهارباغ، پلاک 456', 'اصفهان', 'ایران', 32.6546, 51.6680),
('شعبه شیراز', 'خیابان زند، پلاک 789', 'شیراز', 'ایران', 29.5918, 52.5837),
('شعبه مشهد', 'خیابان امام رضا، پلاک 321', 'مشهد', 'ایران', 36.2605, 59.6168),
('شعبه تبریز', 'خیابان شهریار، پلاک 654', 'تبریز', 'ایران', 38.0962, 46.2738);

-- Insert sample users with enhanced fields
INSERT INTO users (name, email, phone, national_id, password_hash, avatar_url, status, role, auth_provider, location_id, current_latitude, current_longitude, last_location_update, is_location_enabled, two_factor_enabled, email_verified) VALUES
('علی احمدی', 'ali@example.com', '09121234567', '0123456789', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', '/ali-portrait.png', 'active', 'admin', 'email', 1, 35.6892, 51.3890, NOW(), true, true, true),
('فاطمه محمدی', 'fateme@example.com', '09129876543', '1234567890', NULL, '/portrait-Fateme.png', 'active', 'manager', 'google', 2, 32.6546, 51.6680, NOW(), true, false, true),
('حسن رضایی', 'hassan@example.com', '09123456789', '2345678901', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', '/portrait-thoughtful-man.png', 'active', 'user', 'email', 3, 29.5918, 52.5837, NOW(), false, false, true),
('مریم کریمی', 'maryam@example.com', '09127654321', '3456789012', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', '/maryam-portrait.png', 'active', 'user', 'email', 1, 35.6950, 51.3950, NOW(), true, true, true),
('محمد صادقی', 'mohammad@example.com', '09125555555', '4567890123', NULL, '/mohammad-calligraphy.png', 'active', 'user', 'google', 2, 32.6600, 51.6700, NOW(), true, false, true),
('زهرا حسینی', 'zahra@example.com', '09124444444', '5678901234', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', '/zahra-portrait.png', 'active', 'user', 'email', 4, 36.2605, 59.6168, NOW(), true, false, true);

-- Insert sample location history
INSERT INTO user_location_history (user_id, latitude, longitude, accuracy, timestamp) VALUES
(1, 35.6892, 51.3890, 10.5, NOW() - INTERVAL '1 hour'),
(1, 35.6900, 51.3900, 8.2, NOW() - INTERVAL '30 minutes'),
(2, 32.6546, 51.6680, 12.1, NOW() - INTERVAL '2 hours'),
(2, 32.6550, 51.6690, 9.8, NOW() - INTERVAL '1 hour'),
(4, 35.6950, 51.3950, 7.5, NOW() - INTERVAL '15 minutes'),
(5, 32.6600, 51.6700, 11.3, NOW() - INTERVAL '45 minutes');

-- Insert sample activities
INSERT INTO server_logs (action, details, user_id) VALUES
('SYSTEM_START', 'سیستم راه‌اندازی شد', NULL),
('DATABASE_INIT', 'پایگاه داده مقداردهی اولیه شد', NULL),
('USER_LOGIN', 'علی احمدی وارد سیستم شد', 1),
('GOOGLE_LOGIN', 'فاطمه محمدی از طریق گوگل وارد شد', 2),
('TWO_FACTOR_ENABLED', 'احراز هویت دو مرحله‌ای برای علی احمدی فعال شد', 1),
('PASSWORD_RESET_REQUEST', 'درخواست بازیابی رمز عبور برای حسن رضایی', 3),
('SAMPLE_DATA_INSERTED', 'داده‌های نمونه وارد شد', NULL);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean expired tokens
CREATE OR REPLACE FUNCTION clean_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM password_reset_tokens WHERE expires_at < NOW();
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- Create function to generate random 6-digit code
CREATE OR REPLACE FUNCTION generate_reset_code()
RETURNS VARCHAR(6) AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ language 'plpgsql';
