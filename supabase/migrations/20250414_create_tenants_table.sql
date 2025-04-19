-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can insert their own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can update their own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can delete their own tenants" ON public.tenants;

-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  lease_start DATE NOT NULL,
  lease_end DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tenants"
  ON public.tenants
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tenants"
  ON public.tenants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tenants"
  ON public.tenants
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tenants"
  ON public.tenants
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
DROP INDEX IF EXISTS idx_tenants_user_id;
DROP INDEX IF EXISTS idx_tenants_property_id;
DROP INDEX IF EXISTS idx_tenants_last_name;
CREATE INDEX idx_tenants_user_id ON public.tenants(user_id);
CREATE INDEX idx_tenants_property_id ON public.tenants(property_id);
CREATE INDEX idx_tenants_last_name ON public.tenants(last_name);

-- Update table comment
COMMENT ON TABLE public.tenants IS 'Tenants table';
