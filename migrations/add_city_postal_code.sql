-- Migration pour ajouter les colonnes manquantes à la table properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS purchase_date TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_tax NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS housing_tax NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS insurance NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS management_fee_percentage NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS loan_interest NUMERIC;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS type TEXT;

-- Mise à jour du type dans le schéma de la base de données
COMMENT ON TABLE properties IS 'Table des biens immobiliers';
COMMENT ON COLUMN properties.city IS 'Ville du bien immobilier';
COMMENT ON COLUMN properties.postal_code IS 'Code postal du bien immobilier';
COMMENT ON COLUMN properties.purchase_date IS 'Date d''achat du bien immobilier';
COMMENT ON COLUMN properties.property_tax IS 'Taxe foncière du bien immobilier';
COMMENT ON COLUMN properties.housing_tax IS 'Taxe d''habitation du bien immobilier';
COMMENT ON COLUMN properties.insurance IS 'Assurance du bien immobilier';
COMMENT ON COLUMN properties.management_fee_percentage IS 'Pourcentage des frais de gestion';
COMMENT ON COLUMN properties.loan_interest IS 'Intérêts d''emprunt';
COMMENT ON COLUMN properties.category IS 'Catégorie du bien (Résidence principale, secondaire, locatif, etc.)';
COMMENT ON COLUMN properties.type IS 'Type de bien (Appartement, maison, etc.)';
