-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table with enhanced authentication
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    status VARCHAR(50) DEFAULT 'active',
    role VARCHAR(50) DEFAULT 'user',
    location_id BIGINT,
    
    -- Authentication fields
    google_id VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    email_verified BOOLEAN DEFAULT false,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    backup_codes TEXT[], -- Array of backup codes
    
    -- Location tracking
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    location_accuracy DECIMAL(8, 2),
    last_location_update TIMESTAMP WITH TIME ZONE,
    is_location_enabled BOOLEAN DEFAULT false,
    location_permission_granted BOOLEAN DEFAULT false,
    
    -- Session management
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_devices table for mobile device management
CREATE TABLE IF NOT EXISTS user_devices (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    device_id VARCHAR(255) NOT NULL, -- Unique device identifier
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) NOT NULL, -- 'mobile', 'tablet', 'desktop'
    platform VARCHAR(50), -- 'ios', 'android', 'web'
    browser VARCHAR(100),
    os_version VARCHAR(100),
    app_version VARCHAR(50),
    
    -- Device capabilities
    supports_gps BOOLEAN DEFAULT false,
    supports_push BOOLEAN DEFAULT false,
    push_token VARCHAR(500), -- FCM/APNS token
    
    -- Device status
    is_active BOOLEAN DEFAULT true,
    is_trusted BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Location permissions
    location_permission VARCHAR(50) DEFAULT 'denied', -- 'granted', 'denied', 'prompt'
    background_location_enabled BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, device_id)
);

-- Create user_sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    device_id BIGINT,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    
    -- Session details
    login_method VARCHAR(50), -- 'password', 'google', '2fa'
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES user_devices(id) ON DELETE SET NULL
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    radius DECIMAL(8, 2) DEFAULT 100, -- Geofence radius in meters
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_location_history table for detailed tracking
CREATE TABLE IF NOT EXISTS user_location_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    device_id BIGINT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    altitude DECIMAL(8, 2),
    speed DECIMAL(8, 2), -- Speed in m/s
    heading DECIMAL(5, 2), -- Direction in degrees
    
    -- Location context
    location_method VARCHAR(50), -- 'gps', 'network', 'passive'
    is_background BOOLEAN DEFAULT false,
    battery_level INTEGER, -- Battery percentage when location was recorded
    
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES user_devices(id) ON DELETE SET NULL
);

-- Create geofences table for location-based alerts
CREATE TABLE IF NOT EXISTS geofences (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location_id BIGINT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius DECIMAL(8, 2) NOT NULL, -- Radius in meters
    
    -- Geofence settings
    is_active BOOLEAN DEFAULT true,
    entry_alert BOOLEAN DEFAULT true,
    exit_alert BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- Create geofence_events table for tracking entries/exits
CREATE TABLE IF NOT EXISTS geofence_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    device_id BIGINT,
    geofence_id BIGINT NOT NULL,
    event_type VARCHAR(20) NOT NULL, -- 'enter', 'exit'
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES user_devices(id) ON DELETE SET NULL,
    FOREIGN KEY (geofence_id) REFERENCES geofences(id) ON DELETE CASCADE
);

-- Create server_logs table
CREATE TABLE IF NOT EXISTS server_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    user_id BIGINT,
    device_id BIGINT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (device_id) REFERENCES user_devices(id) ON DELETE SET NULL
);

-- Add foreign key constraints
ALTER TABLE users 
ADD CONSTRAINT fk_users_location 
FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location_id);
CREATE INDEX IF NOT EXISTS idx_users_current_location ON users(current_latitude, current_longitude);

CREATE INDEX IF NOT EXISTS idx_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_active ON user_devices(is_active);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON user_devices(last_seen);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_location_history_user ON user_location_history(user_id);
CREATE INDEX IF NOT EXISTS idx_location_history_device ON user_location_history(device_id);
CREATE INDEX IF NOT EXISTS idx_location_history_timestamp ON user_location_history(timestamp);

CREATE INDEX IF NOT EXISTS idx_geofences_location ON geofences(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_geofence_events_user ON geofence_events(user_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_geofence ON geofence_events(geofence_id);

CREATE INDEX IF NOT EXISTS idx_logs_action ON server_logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_user ON server_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON server_logs(created_at);

-- Insert sample locations with geofences
INSERT INTO locations (name, address, city, country, latitude, longitude, radius) VALUES
('دفتر مرکزی', 'خیابان ولیعصر، پلاک 123', 'تهران', 'ایران', 35.6892, 51.3890, 50),
('شعبه اصفهان', 'خیابان چهارباغ، پلاک 456', 'اصفهان', 'ایران', 32.6546, 51.6680, 75),
('شعبه شیراز', 'خیابان زند، پلاک 789', 'شیراز', 'ایران', 29.5918, 52.5837, 60),
('شعبه مشهد', 'خیابان امام رضا، پلاک 321', 'مشهد', 'ایران', 36.2605, 59.6168, 80),
('شعبه تبریز', 'خیابان شهریار، پلاک 654', 'تبریز', 'ایران', 38.0962, 46.2738, 65)
ON CONFLICT DO NOTHING;

-- Insert sample geofences
INSERT INTO geofences (name, location_id, latitude, longitude, radius, entry_alert, exit_alert) VALUES
('محدوده دفتر مرکزی', 1, 35.6892, 51.3890, 100, true, true),
('محدوده شعبه اصفهان', 2, 32.6546, 51.6680, 150, true, true),
('محدوده شعبه شیراز', 3, 29.5918, 52.5837, 120, true, false),
('محدوده شعبه مشهد', 4, 36.2605, 59.6168, 200, true, true),
('محدوده شعبه تبریز', 5, 38.0962, 46.2738, 130, true, true)
ON CONFLICT DO NOTHING;

-- Insert sample users with enhanced authentication
INSERT INTO users (name, email, phone, status, role, location_id, current_latitude, current_longitude, last_location_update, is_location_enabled, location_permission_granted, email_verified, two_factor_enabled) VALUES
('علی احمدی', 'ali@example.com', '09121234567', 'active', 'admin', 1, 35.6892, 51.3890, NOW(), true, true, true, true),
('فاطمه محمدی', 'fateme@example.com', '09129876543', 'active', 'manager', 2, 32.6546, 51.6680, NOW(), true, true, true, false),
('حسن رضایی', 'hassan@example.com', '09123456789', 'active', 'user', 3, 29.5918, 52.5837, NOW(), false, false, true, false),
('مریم کریمی', 'maryam@example.com', '09127654321', 'active', 'user', 1, 35.6950, 51.3950, NOW(), true, true, true, true),
('محمد صادقی', 'mohammad@example.com', '09125555555', 'active', 'user', 2, 32.6600, 51.6700, NOW(), true, true, false, false)
ON CONFLICT (email) DO NOTHING;

-- Insert sample devices
INSERT INTO user_devices (user_id, device_id, device_name, device_type, platform, supports_gps, supports_push, location_permission, background_location_enabled, is_trusted) VALUES
(1, 'device_ali_iphone', 'iPhone 15 Pro علی', 'mobile', 'ios', true, true, 'granted', true, true),
(2, 'device_fateme_android', 'Samsung Galaxy فاطمه', 'mobile', 'android', true, true, 'granted', true, true),
(3, 'device_hassan_web', 'Chrome Browser حسن', 'desktop', 'web', false, false, 'denied', false, false),
(4, 'device_maryam_ipad', 'iPad Air مریم', 'tablet', 'ios', true, true, 'granted', false, true),
(5, 'device_mohammad_android', 'Pixel 8 محمد', 'mobile', 'android', true, true, 'granted', true, false)
ON CONFLICT (user_id, device_id) DO NOTHING;

-- Insert sample location history
INSERT INTO user_location_history (user_id, device_id, latitude, longitude, accuracy, location_method, battery_level, timestamp) VALUES
(1, 1, 35.6892, 51.3890, 5.2, 'gps', 85, NOW() - INTERVAL '5 minutes'),
(1, 1, 35.6895, 51.3892, 4.8, 'gps', 84, NOW() - INTERVAL '3 minutes'),
(2, 2, 32.6546, 51.6680, 8.1, 'gps', 92, NOW() - INTERVAL '10 minutes'),
(2, 2, 32.6548, 51.6682, 7.5, 'gps', 91, NOW() - INTERVAL '7 minutes'),
(4, 4, 35.6950, 51.3950, 12.3, 'network', 67, NOW() - INTERVAL '15 minutes'),
(5, 5, 32.6600, 51.6700, 6.7, 'gps', 78, NOW() - INTERVAL '8 minutes')
ON CONFLICT DO NOTHING;

-- Insert sample activities
INSERT INTO server_logs (action, details, user_id, device_id) VALUES
('SYSTEM_START', 'سیستم راه‌اندازی شد', NULL, NULL),
('USER_LOGIN', 'کاربر علی احمدی وارد سیستم شد', 1, 1),
('DEVICE_REGISTERED', 'دستگاه جدید iPhone 15 Pro ثبت شد', 1, 1),
('LOCATION_PERMISSION_GRANTED', 'مجوز موقعیت مکانی اعطا شد', 1, 1),
('GEOFENCE_ENTER', 'کاربر علی احمدی وارد محدوده دفتر مرکزی شد', 1, 1),
('2FA_ENABLED', 'احراز هویت دو مرحله‌ای فعال شد', 1, 1),
('LOCATION_UPDATE', 'موقعیت کاربر فاطمه محمدی به‌روزرسانی شد', 2, 2)
ON CONFLICT DO NOTHING;

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

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON user_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_geofences_updated_at BEFORE UPDATE ON geofences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
