-- Création de la table profiles si elle n'existe pas déjà
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  marital_status TEXT DEFAULT 'single',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ajout d'une contrainte de vérification pour le statut marital
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_marital_status;
ALTER TABLE profiles ADD CONSTRAINT check_marital_status 
  CHECK (marital_status IN ('single', 'married', 'pacs', 'divorced', 'widowed'));

-- Activation de la sécurité RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Suppression des politiques existantes pour éviter les erreurs
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir et modifier leur propre profil" ON profiles;

-- Création d'une politique RLS pour les profils
CREATE POLICY "Les utilisateurs peuvent voir et modifier leur propre profil"
  ON profiles FOR ALL
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
