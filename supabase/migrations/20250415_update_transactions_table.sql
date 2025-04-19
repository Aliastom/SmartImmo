-- Vérification du type de la colonne accounting_month
DO $$
BEGIN
    -- Si la colonne existe déjà et est de type date, la convertir en VARCHAR
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'accounting_month'
        AND data_type = 'date'
    ) THEN
        ALTER TABLE transactions ALTER COLUMN accounting_month TYPE VARCHAR(7) USING TO_CHAR(accounting_month::date, 'YYYY-MM');
    -- Sinon, ajouter la colonne si elle n'existe pas
    ELSIF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'accounting_month'
    ) THEN
        ALTER TABLE transactions ADD COLUMN accounting_month VARCHAR(7);
    END IF;
END
$$;

-- Mise à jour des transactions existantes pour définir accounting_month à partir de la date
UPDATE transactions 
SET accounting_month = TO_CHAR(date, 'YYYY-MM')
WHERE accounting_month IS NULL;

-- Ajout d'un index sur accounting_month pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_transactions_accounting_month ON transactions(accounting_month);

-- Ajout d'un index sur user_id et property_id pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_transactions_user_property ON transactions(user_id, property_id);
