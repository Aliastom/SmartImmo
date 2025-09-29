'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

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
  // Créer le client Supabase avec les cookies pour l'authentification côté serveur
  const supabase = createServerComponentClient({ cookies });

  // Si pas d'année spécifiée, utiliser l'année en cours
  const targetYear = year || new Date().getFullYear();

  const startDate = `${targetYear}-01-01`;
  const endDate = `${targetYear}-12-31`;

  try {
    // Récupérer l'utilisateur actuel depuis la session côté serveur
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('Erreur d\'authentification:', authError);
      throw new Error('Erreur d\'authentification');
    }

    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    console.log('Utilisateur connecté:', user.id);
    console.log('Période:', startDate, 'à', endDate);

    // Récupérer les transactions fiscales pour l'année avec une requête plus large
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        description,
        date,
        type,
        properties!inner(name, user_id)
      `)
      .eq('properties.user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
      throw new Error(`Erreur lors de la récupération des données: ${error.message}`);
    }

    console.log('Nombre de transactions trouvées:', transactions?.length || 0);

    // Récupérer les types de transactions pour la classification
    const { data: types } = await supabase
      .from('types')
      .select('id, name, category_id, deductible')
      .in('scope', ['transaction', 'both']);

    const { data: categories } = await supabase
      .from('categories')
      .select('id, name');

    // Créer un map des types pour faciliter la recherche
    const typesMap = new Map(types?.map(t => [t.id, t]) || []);
    const categoriesMap = new Map(categories?.map(c => [c.id, c]) || []);

    let loyersPercus = 0;
    let chargesDeductibles = 0;
    const detailedTransactions: FiscalData['transactions'] = [];

    transactions?.forEach(transaction => {
      const type = typesMap.get(transaction.type);
      const category = type?.category_id ? categoriesMap.get(type.category_id) : null;

      // Classifier les transactions
      const isLoyer = category?.name?.toLowerCase().includes('loyer') ||
                     transaction.description?.toLowerCase().includes('loyer') ||
                     transaction.description?.toLowerCase().includes('mensuel');

      const isChargeDeductible = type?.deductible ||
                               category?.name?.toLowerCase().includes('charge') ||
                               category?.name?.toLowerCase().includes('travaux') ||
                               category?.name?.toLowerCase().includes('entretien') ||
                               category?.name?.toLowerCase().includes('réparation') ||
                               transaction.description?.toLowerCase().includes('charge') ||
                               transaction.description?.toLowerCase().includes('travaux') ||
                               transaction.description?.toLowerCase().includes('entretien') ||
                               transaction.description?.toLowerCase().includes('réparation');

      if (isLoyer && Number(transaction.amount) > 0) {
        loyersPercus += Number(transaction.amount);
        detailedTransactions.push({
          id: transaction.id,
          amount: Number(transaction.amount),
          description: transaction.description || '',
          date: transaction.date,
          type: 'Loyer',
          property_name: (transaction.properties as any)?.name || 'Propriété inconnue'
        });
      } else if (isChargeDeductible && Number(transaction.amount) > 0) {
        chargesDeductibles += Number(transaction.amount);
        detailedTransactions.push({
          id: transaction.id,
          amount: Number(transaction.amount),
          description: transaction.description || '',
          date: transaction.date,
          type: 'Charge déductible',
          property_name: (transaction.properties as any)?.name || 'Propriété inconnue'
        });
      }
    });

    console.log('Loyers perçus:', loyersPercus);
    console.log('Charges déductibles:', chargesDeductibles);
    console.log('Transactions détaillées:', detailedTransactions.length);

    return {
      loyersPercus,
      chargesDeductibles,
      transactions: detailedTransactions
    };

  } catch (error) {
    console.error('Erreur lors de la récupération des données fiscales:', error);
    throw error;
  }
}
