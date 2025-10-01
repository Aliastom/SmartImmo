// test-supabase.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  try {
    console.log('🔍 Test de connexion à Supabase...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Définie' : 'NON DÉFINIE');
    console.log('Clé service:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Définie' : 'NON DÉFINIE');

    const { data, error } = await supabase
      .from('tax_parameters')
      .select('*')
      .eq('year', 2025)
      .eq('active', true);

    console.log('\n📊 Résultat de la requête:');
    console.log('Données trouvées:', data?.length || 0);
    console.log('Erreur:', error);
    if (data && data.length > 0) {
      console.log('Première ligne:', data[0]);
    }

  } catch (err) {
    console.error('\n❌ Erreur de connexion:', err.message);
  }
}

test();
