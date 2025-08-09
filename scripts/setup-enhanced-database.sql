-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table with enhanced fields
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    status VARCHAR(50) DEFAULT 'active',
    role VARCHAR(50) DEFAULT 'user',
    location_id BIGINT,
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_location_update TIMESTAMP WITH TIME ZONE,
    is_location_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_location_history table for tracking location changes
CREATE TABLE IF NOT EXISTS user_location_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create server_logs table
CREATE TABLE IF NOT EXISTS server_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    user_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE users 
ADD CONSTRAINT fk_users_location 
FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

ALTER TABLE server_logs 
ADD CONSTRAINT fk_logs_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location_id);
CREATE INDEX IF NOT EXISTS idx_users_current_location ON users(current_latitude, current_longitude);
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
('شعبه تبریز', 'خیابان شهریار، پلاک 654', 'تبریز', 'ایران', 38.0962, 46.2738)
ON CONFLICT DO NOTHING;

-- Insert sample users with live locations
INSERT INTO users (name, email, phone, status, role, location_id, current_latitude, current_longitude, last_location_update, is_location_enabled) VALUES
('علی احمدی', 'ali@example.com', '09121234567', 'active', 'admin', 1, 35.6892, 51.3890, NOW(), true),
('فاطمه محمدی', 'fateme@example.com', '09129876543', 'active', 'user', 2, 32.6546, 51.6680, NOW(), true),
('حسن رضایی', 'hassan@example.com', '09123456789', 'inactive', 'user', 3, 29.5918, 52.5837, NOW(), false),
('مریم کریمی', 'maryam@example.com', '09127654321', 'active', 'manager', 1, 35.6950, 51.3950, NOW(), true),
('محمد صادقی', 'mohammad@example.com', '09125555555', 'active', 'user', 2, 32.6600, 51.6700, NOW(), true),
('زهرا حسینی', 'zahra@example.com', '09124444444', 'active', 'user', 4, 36.2605, 59.6168, NOW(), true),
('رضا موسوی', 'reza@example.com', '09123333333', 'active', 'user', 5, 38.0962, 46.2738, NOW(), true)
ON CONFLICT (email) DO NOTHING;

-- Insert sample location history
INSERT INTO user_location_history (user_id, latitude, longitude, accuracy, timestamp) VALUES
(1, 35.6892, 51.3890, 10.5, NOW() - INTERVAL '1 hour'),
(1, 35.6900, 51.3900, 8.2, NOW() - INTERVAL '30 minutes'),
(2, 32.6546, 51.6680, 12.1, NOW() - INTERVAL '2 hours'),
(2, 32.6550, 51.6690, 9.8, NOW() - INTERVAL '1 hour'),
(4, 35.6950, 51.3950, 7.5, NOW() - INTERVAL '15 minutes'),
(5, 32.6600, 51.6700, 11.3, NOW() - INTERVAL '45 minutes')
ON CONFLICT DO NOTHING;

-- Insert sample activities
INSERT INTO server_logs (action, details, user_id) VALUES
('SYSTEM_START', 'سیستم راه‌اندازی شد', NULL),
('DATABASE_INIT', 'پایگاه داده مقداردهی اولیه شد', NULL),
('USER_LOCATION_UPDATE', 'موقعیت کاربر علی احمدی به‌روزرسانی شد', 1),
('USER_LOCATION_UPDATE', 'موقعیت کاربر فاطمه محمدی به‌روزرسانی شد', 2),
('SAMPLE_DATA_INSERTED', 'داده‌های نمونه وارد شد', NULL)
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

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
