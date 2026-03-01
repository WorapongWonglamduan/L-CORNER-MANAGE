-- Initialize PostgreSQL database for L-Corner POS System
-- This script runs automatically when the container is first created

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone to Asia/Bangkok
SET timezone = 'Asia/Bangkok';

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS public;

-- Grant privileges
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Comment
COMMENT ON DATABASE l_corner_pos IS 'L-Corner POS System with Inventory Management';
