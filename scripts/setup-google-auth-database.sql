-- Enhanced database schema with Google authentication support
-- This script creates all necessary tables for the Simple Dart Server project

-- Create users table with Google auth support
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255), -- For email auth users
    google_id VARCHAR(255) UNIQUE, -- Google OAuth ID
    google_picture TEXT, -- Google profile picture URL
    google_verified_email BOOLEAN DEFAULT FALSE,
    auth_provider VARCHAR(50) DEFAULT 'email', -- 'email' or 'google'
    avatar_url TEXT,
    status VARCHAR(50) DEFAULT 'active',
    role VARCHAR(50) DEFAULT 'user',
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    backup_codes JSONB,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    last_login TIMESTAMP,
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_location_update TIMESTAMP,
    is_location_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_sessions table for managing login sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_devices table for device tracking
CREATE TABLE IF NOT EXISTS user_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50), -- mobile, tablet, desktop
    platform VARCHAR(50), -- ios, android, web
    browser VARCHAR(100),
    supports_gps BOOLEAN DEFAULT FALSE,
    supports_push BOOLEAN DEFAULT FALSE,
    location_permission VARCHAR(20) DEFAULT 'prompt', -- prompt, granted, denied
    background_location_enabled BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_id)
);

-- Create user_location_history table for tracking location updates
CREATE TABLE IF NOT EXISTS user_location_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    battery_level INTEGER,
    is_background BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create geofences table for location-based alerts
CREATE TABLE IF NOT EXISTS geofences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    center_latitude DECIMAL(10, 8) NOT NULL,
    center_longitude DECIMAL(11, 8) NOT NULL,
    radius DECIMAL(10, 2) NOT NULL, -- in meters
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create server_logs table for comprehensive logging
CREATE TABLE IF NOT EXISTS server_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_location_history_user_id ON user_location_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_location_history_timestamp ON user_location_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_geofences_user_id ON geofences(user_id);
CREATE INDEX IF NOT EXISTS idx_server_logs_user_id ON server_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_server_logs_action ON server_logs(action);
CREATE INDEX IF NOT EXISTS idx_server_logs_created_at ON server_logs(created_at);

-- Insert sample locations
INSERT INTO locations (name, address, city, country, latitude, longitude) VALUES
('دفتر مرکزی', 'خیابان ولیعصر، پلاک 123', 'تهران', 'ایران', 35.6892, 51.3890),
('شعبه اصفهان', 'خیابان چهارباغ، پلاک 456', 'اصفهان', 'ایران', 32.6546, 51.6680),
('شعبه شیراز', 'خیابان زند، پلاک 789', 'شیراز', 'ایران', 29.5918, 52.5837),
('شعبه مشهد', 'خیابان امام رضا، پلاک 321', 'مشهد', 'ایران', 36.2605, 59.6168),
('شعبه تبریز', 'خیابان شهریار، پلاک 654', 'تبریز', 'ایران', 38.0962, 46.2738)
ON CONFLICT DO NOTHING;

-- Insert a sample admin user for testing
INSERT INTO users (name, email, password_hash, auth_provider, role, status, avatar_url) VALUES
('مدیر سیستم', 'admin@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewmyOFrYR7Y8.vPu', 'email', 'admin', 'active', '/placeholder.svg?height=100&width=100&text=م')
ON CONFLICT (email) DO NOTHING;

-- Create a trigger to update the updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Log the database setup
INSERT INTO server_logs (action, details) VALUES
('DATABASE_SETUP', 'Google authentication database schema created and initialized successfully');
