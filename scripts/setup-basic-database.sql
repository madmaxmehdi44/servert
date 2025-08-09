-- Enable UUID extension if available
DO $$ 
BEGIN
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EXCEPTION
    WHEN OTHERS THEN
        -- Extension might not be available, continue without it
        NULL;
END $$;

-- Create locations table with basic structure first
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL
);

-- Add optional columns to locations table one by one
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE locations ADD COLUMN latitude DECIMAL(10, 8);
    EXCEPTION
        WHEN duplicate_column THEN
            -- Column already exists, do nothing
            NULL;
    END;
END $$;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE locations ADD COLUMN longitude DECIMAL(11, 8);
    EXCEPTION
        WHEN duplicate_column THEN
            -- Column already exists, do nothing
            NULL;
    END;
END $$;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE locations ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN
            -- Column already exists, do nothing
            NULL;
    END;
END $$;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE locations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN
            -- Column already exists, do nothing
            NULL;
    END;
END $$;

-- Create users table with basic structure first
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL
);

-- Add optional columns to users table one by one
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
    EXCEPTION
        WHEN duplicate_column THEN
            -- Column already exists, do nothing
            NULL;
    END;
END $$;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE users ADD COLUMN avatar_url TEXT;
    EXCEPTION
        WHEN duplicate_column THEN
            -- Column already exists, do nothing
            NULL;
    END;
END $$;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    EXCEPTION
        WHEN duplicate_column THEN
            -- Column already exists, do nothing
            NULL;
    END;
END $$;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
    EXCEPTION
        WHEN duplicate_column THEN
            -- Column already exists, do nothing
            NULL;
    END;
END $$;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE users ADD COLUMN location_id BIGINT;
    EXCEPTION
        WHEN duplicate_column THEN
            -- Column already exists, do nothing
            NULL;
    END;
END $$;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE users ADD COLUMN current_latitude DECIMAL(10, 8);
    EXCEPTION
        WHEN duplicate_column THEN
            -- Column already exists, do nothing
            NULL;
    END;
END $$;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE users ADD COLUMN current_longitude DECIMAL(11, 8);
    EXCEPTION
        WHEN duplicate_column THEN
            -- Column already exists, do nothing
            NULL;
    END;
END $$;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE users ADD COLUMN last_location_update TIMESTAMP WITH TIME ZONE;
    EXCEPTION
        WHEN duplicate_column THEN
            -- Column already exists, do nothing
            NULL;
    END;
END $$;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE users ADD COLUMN is_location_enabled BOOLEAN DEFAULT false;
    EXCEPTION
        WHEN duplicate_column THEN
            -- Column already exists, do nothing
            NULL;
    END;
END $$;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN
            -- Column already exists, do nothing
            NULL;
    END;
END $$;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    EXCEPTION
        WHEN duplicate_column THEN
            -- Column already exists, do nothing
            NULL;
    END;
END $$;

-- Create server_logs table
CREATE TABLE IF NOT EXISTS server_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    user_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_location_history table
CREATE TABLE IF NOT EXISTS user_location_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints (will not error if they already exist)
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE users ADD CONSTRAINT fk_users_location 
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
    EXCEPTION
        WHEN duplicate_object THEN
            -- Constraint already exists, do nothing
            NULL;
    END;
END $$;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE server_logs ADD CONSTRAINT fk_logs_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    EXCEPTION
        WHEN duplicate_object THEN
            -- Constraint already exists, do nothing
            NULL;
    END;
END $$;

DO $$ 
BEGIN
    BEGIN
        ALTER TABLE user_location_history ADD CONSTRAINT fk_history_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN
            -- Constraint already exists, do nothing
            NULL;
    END;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (will not error if they already exist)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample locations (only if they don't exist)
DO $$
DECLARE
    location_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO location_count FROM locations;
    
    IF location_count = 0 THEN
        INSERT INTO locations (name, address, city, country, latitude, longitude) VALUES
        ('دفتر مرکزی', 'خیابان ولیعصر، پلاک 123', 'تهران', 'ایران', 35.6892, 51.3890),
        ('شعبه اصفهان', 'خیابان چهارباغ، پلاک 456', 'اصفهان', 'ایران', 32.6546, 51.6680),
        ('شعبه شیراز', 'خیابان زند، پلاک 789', 'شیراز', 'ایران', 29.5918, 52.5837),
        ('شعبه مشهد', 'خیابان امام رضا، پلاک 321', 'مشهد', 'ایران', 36.2605, 59.6168),
        ('شعبه تبریز', 'خیابان شهریار، پلاک 654', 'تبریز', 'ایران', 38.0962, 46.2738);
    END IF;
END $$;

-- Insert sample users (only if they don't exist)
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    
    IF user_count = 0 THEN
        INSERT INTO users (name, email, phone, avatar_url, status, role, location_id, current_latitude, current_longitude, last_location_update, is_location_enabled) VALUES
        ('علی احمدی', 'ali@example.com', '09121234567', '/ali-portrait.png', 'active', 'admin', 1, 35.6892, 51.3890, NOW(), true),
        ('فاطمه محمدی', 'fateme@example.com', '09129876543', '/portrait-Fateme.png', 'active', 'manager', 2, 32.6546, 51.6680, NOW(), true),
        ('حسن رضایی', 'hassan@example.com', '09123456789', '/portrait-thoughtful-man.png', 'inactive', 'user', 3, 29.5918, 52.5837, NOW(), false),
        ('مریم کریمی', 'maryam@example.com', '09127654321', '/maryam-portrait.png', 'active', 'user', 1, 35.6950, 51.3950, NOW(), true),
        ('محمد صادقی', 'mohammad@example.com', '09125555555', '/mohammad-calligraphy.png', 'active', 'user', 2, 32.6600, 51.6700, NOW(), true);
    END IF;
END $$;

-- Insert sample location history (only if users exist)
DO $$
DECLARE
    history_count INTEGER;
    user_exists INTEGER;
BEGIN
    SELECT COUNT(*) INTO history_count FROM user_location_history;
    SELECT COUNT(*) INTO user_exists FROM users WHERE id IN (1, 2);
    
    IF history_count = 0 AND user_exists > 0 THEN
        INSERT INTO user_location_history (user_id, latitude, longitude, accuracy, timestamp) VALUES
        (1, 35.6892, 51.3890, 10.5, NOW() - INTERVAL '1 hour'),
        (1, 35.6900, 51.3900, 8.2, NOW() - INTERVAL '30 minutes'),
        (2, 32.6546, 51.6680, 12.1, NOW() - INTERVAL '2 hours'),
        (2, 32.6550, 51.6690, 9.8, NOW() - INTERVAL '1 hour');
    END IF;
END $$;

-- Insert sample activities
DO $$
DECLARE
    log_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO log_count FROM server_logs;
    
    IF log_count = 0 THEN
        INSERT INTO server_logs (action, details, user_id) VALUES
        ('SYSTEM_START', 'سیستم راه‌اندازی شد', NULL),
        ('DATABASE_INIT', 'پایگاه داده مقداردهی اولیه شد', NULL),
        ('SAMPLE_DATA_INSERTED', 'داده‌های نمونه وارد شد', NULL);
    END IF;
END $$;
