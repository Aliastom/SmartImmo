// Script pour appliquer les migrations Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase
const supabaseUrl = 'https://ndvsnildxwrzasrpqdle.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdnNuaWxkeHdyemFzcnBxZGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODI1MjY5MDUsImV4cCI6MTk5ODEwMjkwNX0.0YkRt_Q-LBvzuGF_Syi9Xk-ZNKZYUXAUbJkU6_OkLIU';

// Créer un client Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fonction pour exécuter une migration SQL
async function executeMigration(filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Exécution de la migration: ${path.basename(filePath)}`);
    
    // Exécuter la requête SQL via l'API REST de Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error(`Erreur lors de l'exécution de ${path.basename(filePath)}:`, error);
      return false;
    }
    
    console.log(`Migration ${path.basename(filePath)} appliquée avec succès`);
    return true;
  } catch (error) {
    console.error(`Erreur lors de la lecture/exécution de ${path.basename(filePath)}:`, error);
    return false;
  }
}

// Fonction principale pour exécuter toutes les migrations
async function applyMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  try {
    // Lire tous les fichiers de migration
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Trier par ordre alphabétique
    
    console.log(`${files.length} fichiers de migration trouvés`);
    
    // Exécuter chaque migration séquentiellement
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const success = await executeMigration(filePath);
      
      if (!success) {
        console.error(`Échec de la migration ${file}. Arrêt du processus.`);
        process.exit(1);
      }
    }
    
    console.log('Toutes les migrations ont été appliquées avec succès');
  } catch (error) {
    console.error('Erreur lors de la lecture du répertoire des migrations:', error);
    process.exit(1);
  }
}

// Exécuter les migrations
applyMigrations();
