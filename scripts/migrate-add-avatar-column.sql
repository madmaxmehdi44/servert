-- Migration script to add missing columns to existing users table
-- Run this if you already have a users table without avatar_url

-- Add avatar_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
        ALTER TABLE users ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- Add other missing columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'current_latitude') THEN
        ALTER TABLE users ADD COLUMN current_latitude DECIMAL(10, 8);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'current_longitude') THEN
        ALTER TABLE users ADD COLUMN current_longitude DECIMAL(11, 8);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_location_update') THEN
        ALTER TABLE users ADD COLUMN last_location_update TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_location_enabled') THEN
        ALTER TABLE users ADD COLUMN is_location_enabled BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'status') THEN
        ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'location_id') THEN
        ALTER TABLE users ADD COLUMN location_id BIGINT;
    END IF;
END $$;

-- Update existing users with default avatar URLs based on their names
UPDATE users SET avatar_url = '/ali-portrait.png' WHERE name LIKE '%علی%' AND avatar_url IS NULL;
UPDATE users SET avatar_url = '/portrait-Fateme.png' WHERE name LIKE '%فاطمه%' AND avatar_url IS NULL;
UPDATE users SET avatar_url = '/maryam-portrait.png' WHERE name LIKE '%مریم%' AND avatar_url IS NULL;
UPDATE users SET avatar_url = '/mohammad-calligraphy.png' WHERE name LIKE '%محمد%' AND avatar_url IS NULL;
UPDATE users SET avatar_url = '/zahra-portrait.png' WHERE name LIKE '%زهرا%' AND avatar_url IS NULL;
UPDATE users SET avatar_url = '/portrait-thoughtful-man.png' WHERE avatar_url IS NULL;
