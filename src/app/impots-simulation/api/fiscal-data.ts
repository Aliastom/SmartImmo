'use server';

import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

export interface FiscalData {
  loyersPercus: number;
  chargesDeductibles: number;
  transactions: Array<{
    id: string;
    amount: number;
    description: string;
    date: string;
    type: string;
    property_name: string;
  }>;
}

export async function getFiscalDataForYear(year?: number): Promise<FiscalData> {
  try {
    // Récupérer les variables d'environnement
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Variables d\'environnement Supabase manquantes');
    }

    // Si pas d'année spécifiée, utiliser l'année en cours
    const targetYear = year || new Date().getFullYear();
    const startDate = `${targetYear}-01`;
    const endDate = `${targetYear}-12`;

    console.log('=== PARAMÈTRES DE RECHERCHE ===');
    console.log('Année cible:', targetYear);
    console.log('Période complète:', startDate, 'à', endDate);
    console.log('Format utilisé: YYYY-MM');

    // Créer le client Supabase avec la clé anonyme
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // TODO: Implémenter l'authentification utilisateur côté serveur
    // Pour l'instant, cette approche ne fonctionne pas sans authentification

    console.log('=== APPROCHE NON AUTHENTIFIÉE ===');
    console.log('Cette méthode ne peut pas accéder aux données utilisateur');

    // Retourner des données vides pour éviter les erreurs
    return {
      loyersPercus: 0,
      chargesDeductibles: 0,
      transactions: []
    };

  } catch (error) {
    console.error('Erreur lors de la récupération des données fiscales:', error);
    throw error;
  }
}
