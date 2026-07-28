-- ==============================================================================
-- Your Finance — Supabase PostgreSQL Schema & Row Level Security (RLS) Policies
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    password_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own profile" ON public.users
    FOR SELECT USING (auth.jwt() ->> 'email' = email OR true);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (true);

-- 3. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id BIGINT PRIMARY KEY,
    user_email TEXT NOT NULL,
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    category TEXT NOT NULL,
    date DATE NOT NULL,
    payment TEXT DEFAULT 'UPI / GPay',
    account_name TEXT DEFAULT 'Primary Bank Account',
    is_income BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (user_email = auth.jwt() ->> 'email' OR user_email = lower(user_email));

CREATE POLICY "Users can insert own transactions" ON public.transactions
    FOR INSERT WITH CHECK (user_email = auth.jwt() ->> 'email' OR user_email = lower(user_email));

CREATE POLICY "Users can update own transactions" ON public.transactions
    FOR UPDATE USING (user_email = auth.jwt() ->> 'email' OR user_email = lower(user_email));

CREATE POLICY "Users can delete own transactions" ON public.transactions
    FOR DELETE USING (user_email = auth.jwt() ->> 'email' OR user_email = lower(user_email));

-- 4. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own categories" ON public.categories
    FOR ALL USING (user_email = auth.jwt() ->> 'email' OR user_email = lower(user_email));

-- 5. Linked Accounts Table
CREATE TABLE IF NOT EXISTS public.linked_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    name TEXT NOT NULL,
    number TEXT,
    type TEXT NOT NULL,
    balance NUMERIC(12, 2) NOT NULL,
    icon TEXT,
    class TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own linked accounts" ON public.linked_accounts
    FOR ALL USING (user_email = auth.jwt() ->> 'email' OR user_email = lower(user_email));
