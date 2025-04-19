-- Script SQL à exécuter directement dans l'interface Supabase SQL Editor

-- Création de la table profiles si elle n'existe pas déjà
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  marital_status TEXT DEFAULT 'single',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ajout d'une contrainte de vérification pour le statut marital
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_marital_status;
ALTER TABLE public.profiles ADD CONSTRAINT check_marital_status 
  CHECK (marital_status IN ('single', 'married', 'pacs', 'divorced', 'widowed'));

-- Activation de la sécurité RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Suppression des politiques existantes pour éviter les erreurs
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir et modifier leur propre profil" ON public.profiles;

-- Création d'une politique RLS pour les profils
CREATE POLICY "Les utilisateurs peuvent voir et modifier leur propre profil"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insertion automatique d'un profil lors de la création d'un utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, phone, marital_status, created_at, updated_at)
  VALUES (new.id, '', '', '', 'single', now(), now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Suppression du trigger existant pour éviter les erreurs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Création d'un trigger pour appeler la fonction lors de la création d'un utilisateur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Création de la table tax_profiles si elle n'existe pas déjà
CREATE TABLE IF NOT EXISTS public.tax_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fiscal_year INTEGER NOT NULL,
  salary_income NUMERIC(10, 2) DEFAULT 0,
  loan_interests NUMERIC(10, 2) DEFAULT 0,
  retirement_savings NUMERIC(10, 2) DEFAULT 0,
  tax_situation TEXT DEFAULT 'single' CHECK (tax_situation IN ('single', 'couple', 'family')),
  number_of_children INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Contrainte d'unicité pour éviter les doublons
  UNIQUE(user_id, fiscal_year)
);

-- Create updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for tax_profiles
CREATE TRIGGER handle_tax_profiles_updated_at
  BEFORE UPDATE ON public.tax_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tax profiles"
  ON public.tax_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tax profiles"
  ON public.tax_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tax profiles"
  ON public.tax_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tax profiles"
  ON public.tax_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_tax_profiles_user_id ON public.tax_profiles(user_id);
CREATE INDEX idx_tax_profiles_fiscal_year ON public.tax_profiles(fiscal_year);

-- Add comments
COMMENT ON TABLE public.tax_profiles IS 'Profils fiscaux des utilisateurs par année fiscale';
COMMENT ON COLUMN public.tax_profiles.fiscal_year IS 'Année fiscale';
COMMENT ON COLUMN public.tax_profiles.salary_income IS 'Revenus salariaux annuels';
COMMENT ON COLUMN public.tax_profiles.loan_interests IS 'Intérêts d''emprunt déductibles';
COMMENT ON COLUMN public.tax_profiles.retirement_savings IS 'Épargne retraite (PER)';
COMMENT ON COLUMN public.tax_profiles.tax_situation IS 'Situation fiscale (célibataire, couple, famille)';
COMMENT ON COLUMN public.tax_profiles.number_of_children IS 'Nombre d''enfants à charge';
