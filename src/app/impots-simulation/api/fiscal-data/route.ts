import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Récupérer l'année depuis les paramètres de requête
    const url = new URL(request.url);
    const year = url.searchParams.get('year');
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = `${targetYear}-01`;
    const endDate = `${targetYear}-12`;

    console.log('=== PARAMÈTRES DE RECHERCHE (API ROUTE) ===');
    console.log('Année cible:', targetYear);
    console.log('Période complète:', startDate, 'à', endDate);

    // Créer le client Supabase avec la clé de service
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Pour les API routes, on ne peut pas facilement récupérer l'utilisateur authentifié
    // On va devoir passer l'ID utilisateur différemment ou utiliser une approche différente

    return NextResponse.json({
      error: 'Méthode d\'authentification non implémentée pour les API routes Next.js 15',
      suggestion: 'Utilisez une Server Action à la place'
    }, { status: 501 });

  } catch (error) {
    console.error('Erreur lors de la récupération des données fiscales:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
