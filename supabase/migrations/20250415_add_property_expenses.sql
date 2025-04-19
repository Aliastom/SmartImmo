-- Migration pour ajouter les champs de charges récurrentes à la table properties

-- Ajout des colonnes pour les charges récurrentes
ALTER TABLE public.properties 
  ADD COLUMN IF NOT EXISTS property_tax NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS housing_tax NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS management_fee_percentage NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loan_interest NUMERIC(10, 2) DEFAULT 0;

-- Mise à jour des commentaires sur les colonnes
COMMENT ON COLUMN public.properties.property_tax IS 'Taxe foncière annuelle en euros';
COMMENT ON COLUMN public.properties.housing_tax IS 'Taxe d''habitation annuelle en euros';
COMMENT ON COLUMN public.properties.insurance IS 'Assurance habitation annuelle en euros';
COMMENT ON COLUMN public.properties.management_fee_percentage IS 'Pourcentage des frais de gestion (%)';
COMMENT ON COLUMN public.properties.loan_interest IS 'Intérêts d''emprunt annuels en euros';
