-- Script pour ajouter la colonne gestion_percentage à la table properties
-- Exécuter ce script dans Supabase SQL Editor ou via psql

-- Vérifier si la colonne existe déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'properties'
        AND column_name = 'gestion_percentage'
    ) THEN
        -- Ajouter la colonne avec une valeur par défaut de 6%
        ALTER TABLE properties ADD COLUMN gestion_percentage DECIMAL(5,2) DEFAULT 6.00;

        -- Ajouter un commentaire pour expliquer la colonne
        COMMENT ON COLUMN properties.gestion_percentage IS 'Pourcentage des frais de gestion pour cette propriété (par défaut 6%)';

        RAISE NOTICE 'Colonne gestion_percentage ajoutée avec succès à la table properties';
    ELSE
        RAISE NOTICE 'La colonne gestion_percentage existe déjà dans la table properties';
    END IF;
END $$;
