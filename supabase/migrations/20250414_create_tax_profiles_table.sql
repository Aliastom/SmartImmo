-- Create tax_profiles table
CREATE TABLE IF NOT EXISTS public.tax_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fiscal_year INTEGER NOT NULL,
  salary_income NUMERIC NOT NULL DEFAULT 0,
  loan_interests NUMERIC NOT NULL DEFAULT 0,
  retirement_savings NUMERIC NOT NULL DEFAULT 0,
  tax_situation TEXT NOT NULL CHECK (tax_situation IN ('célibataire', 'marié', 'pacsé', 'veuf')),
  number_of_children INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, fiscal_year)
);

-- Create trigger to update updated_at
CREATE TRIGGER update_tax_profiles_updated_at
  BEFORE UPDATE ON public.tax_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tax profiles"
  ON public.tax_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tax profiles"
  ON public.tax_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tax profiles"
  ON public.tax_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tax profiles"
  ON public.tax_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_tax_profiles_user_id ON public.tax_profiles(user_id);
CREATE INDEX idx_tax_profiles_fiscal_year ON tax_profiles(fiscal_year);
