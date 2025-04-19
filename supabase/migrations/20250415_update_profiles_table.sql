-- Mise à jour de la table profiles pour ajouter les champs relatifs aux informations personnelles et à la situation familiale
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marital_status TEXT DEFAULT 'single';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Ajout d'une contrainte de vérification pour le statut marital
ALTER TABLE profiles ADD CONSTRAINT check_marital_status 
  CHECK (marital_status IN ('single', 'married', 'pacs', 'divorced', 'widowed'));

-- Mise à jour de la table tax_profiles pour ajouter la situation fiscale
ALTER TABLE tax_profiles ADD COLUMN IF NOT EXISTS situation TEXT DEFAULT 'single';

-- Ajout d'une contrainte de vérification pour la situation fiscale
ALTER TABLE tax_profiles ADD CONSTRAINT check_tax_situation 
  CHECK (situation IN ('single', 'couple', 'family'));

-- Création d'une politique RLS pour les profils
CREATE POLICY "Les utilisateurs peuvent voir et modifier leur propre profil"
  ON profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Création d'une politique RLS pour les profils fiscaux
CREATE POLICY "Les utilisateurs peuvent voir et modifier leurs propres profils fiscaux"
  ON tax_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
