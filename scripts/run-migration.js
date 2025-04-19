// Script pour exécuter la migration SQL sur Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Remplacez ces valeurs par vos informations de connexion Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Utilisez la clé de service pour les migrations

if (!supabaseUrl || !supabaseKey) {
  console.error('Les variables d\'environnement NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_city_postal_code.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Exécution de la migration...');
    
    // Exécution de la migration SQL
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      throw error;
    }
    
    console.log('Migration exécutée avec succès!');
    console.log('Les colonnes "city" et "postal_code" ont été ajoutées à la table "properties"');
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la migration:', error);
  }
}

runMigration();
