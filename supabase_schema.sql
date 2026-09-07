-- VOXE CRM - Supabase Table Creation Script
-- Copy this script and paste it directly into the SQL Editor in your Supabase Dashboard

-- 1. Create the leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    website TEXT,
    address TEXT,
    category TEXT DEFAULT 'Clínica Veterinária',
    maps_link TEXT,
    status TEXT DEFAULT 'Novo',
    priority TEXT DEFAULT 'Média',
    channel TEXT DEFAULT 'Google Maps',
    last_contact TEXT,
    next_followup TEXT,
    notes TEXT,
    value NUMERIC DEFAULT 0,
    seller_name TEXT DEFAULT 'Ryan de Azevedo',
    contacts JSONB DEFAULT '[]'::jsonb,
    
    -- Meeting & details metadata
    decisor TEXT,
    warmup TEXT,
    meeting_date TEXT,
    meeting_time TEXT,
    meeting_notes TEXT,
    estimated_ticket NUMERIC DEFAULT 0,
    probability INTEGER DEFAULT 50,
    closed_value NUMERIC DEFAULT 0,
    quiz_answers JSONB DEFAULT '{}'::jsonb
);

-- 2. Enable Row Level Security (RLS) if you want security
-- (For a simple start, you can disable RLS or create a policy to allow anon access)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy to allow all actions for anonymous access (ideal for simple internal CRM)
CREATE POLICY "Allow anonymous read, insert, update, delete" 
ON public.leads 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);
