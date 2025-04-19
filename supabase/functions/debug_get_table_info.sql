-- Fonction pour récupérer les informations sur une table
CREATE OR REPLACE FUNCTION debug_get_table_info(table_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Récupérer les informations sur les colonnes de la table
  WITH columns_info AS (
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM 
      information_schema.columns
    WHERE 
      table_name = debug_get_table_info.table_name
  ),
  -- Récupérer les contraintes de la table
  constraints_info AS (
    SELECT 
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name
    FROM 
      information_schema.table_constraints tc
    JOIN 
      information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE 
      tc.table_name = debug_get_table_info.table_name
  )
  SELECT 
    jsonb_build_object(
      'table_name', debug_get_table_info.table_name,
      'columns', jsonb_agg(
        jsonb_build_object(
          'column_name', c.column_name,
          'data_type', c.data_type,
          'is_nullable', c.is_nullable,
          'column_default', c.column_default
        )
      ),
      'constraints', (
        SELECT 
          jsonb_agg(
            jsonb_build_object(
              'constraint_name', constraint_name,
              'constraint_type', constraint_type,
              'column_name', column_name
            )
          )
        FROM 
          constraints_info
      )
    ) INTO result
  FROM 
    columns_info c;

  RETURN result;
END;
$$;
