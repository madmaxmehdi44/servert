-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    location_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    coordinates VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create server_logs table
CREATE TABLE IF NOT EXISTS server_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    user_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint
ALTER TABLE users 
ADD CONSTRAINT fk_users_location 
FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

-- Add foreign key constraint for logs
ALTER TABLE server_logs 
ADD CONSTRAINT fk_logs_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location_id);
CREATE INDEX IF NOT EXISTS idx_locations_city ON locations(city);
CREATE INDEX IF NOT EXISTS idx_locations_country ON locations(country);
CREATE INDEX IF NOT EXISTS idx_logs_action ON server_logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON server_logs(created_at);

-- Insert sample data
INSERT INTO locations (name, address, city, country, coordinates) VALUES
('دفتر مرکزی', 'خیابان ولیعصر، پلاک 123', 'تهران', 'ایران', '35.6892,51.3890'),
('شعبه اصفهان', 'خیابان چهارباغ، پلاک 456', 'اصفهان', 'ایران', '32.6546,51.6680'),
('شعبه شیراز', 'خیابان زند، پلاک 789', 'شیراز', 'ایران', '29.5918,52.5837')
ON CONFLICT DO NOTHING;

INSERT INTO users (name, email, status, location_id) VALUES
('علی احمدی', 'ali@example.com', 'active', 1),
('فاطمه محمدی', 'fateme@example.com', 'active', 2),
('حسن رضایی', 'hassan@example.com', 'inactive', 3),
('مریم کریمی', 'maryam@example.com', 'active', 1),
('محمد صادقی', 'mohammad@example.com', 'active', 2)
ON CONFLICT (email) DO NOTHING;

-- Insert sample activities
INSERT INTO server_logs (action, details) VALUES
('SYSTEM_START', 'سیستم راه‌اندازی شد'),
('DATABASE_INIT', 'پایگاه داده مقداردهی اولیه شد'),
('SAMPLE_DATA_INSERTED', 'داده‌های نمونه وارد شد')
ON CONFLICT DO NOTHING;
