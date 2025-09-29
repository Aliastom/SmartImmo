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

  const startDate = `${targetYear}-01`;
  const endDate = `${targetYear}-12`;

  console.log('=== PARAMÈTRES DE RECHERCHE (CORRIGÉ) ===');
  console.log('Année cible:', targetYear);
  console.log('Période complète:', startDate, 'à', endDate);
  console.log('Format utilisé: YYYY-MM (comme dans votre base)');
  console.log('Requête: accounting_month >=', startDate, 'AND accounting_month <=', endDate);

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

    console.log('=== REQUÊTE SQL EXACTE ===');
    console.log('Utilisateur ID:', user.id);
    console.log('Requête exécutée:');
    console.log(`
SELECT id, amount, description, date, accounting_month, type, properties.name
FROM transactions
INNER JOIN properties ON transactions.property_id = properties.id
WHERE properties.user_id = '${user.id}'
  AND accounting_month >= '${startDate}'
  AND accounting_month <= '${endDate}'
ORDER BY accounting_month DESC
    `);

    console.log('Paramètres:');
    console.log('- startDate:', startDate);
    console.log('- endDate:', endDate);
    console.log('- user.id:', user.id);

    console.log('=== VÉRIFICATION DES DONNÉES DISPONIBLES ===');
    // Vérifier quelles sont les valeurs de accounting_month disponibles pour janvier spécifiquement
    const { data: januaryData, error: januaryError } = await supabase
      .from('transactions')
      .select('accounting_month')
      .eq('properties.user_id', user.id)
      .gte('accounting_month', `${targetYear}-01`)
      .lte('accounting_month', `${targetYear}-01`)
      .order('accounting_month')
      .limit(10);

    if (januaryError) {
      console.error('Erreur lors de la récupération des données de janvier:', januaryError);
    } else {
      console.log('Exemples de accounting_month de janvier:', januaryData?.map(s => s.accounting_month));
    }

    // Vérifier aussi les autres mois pour comparaison
    const { data: allMonthsData, error: allMonthsError } = await supabase
      .from('transactions')
      .select('accounting_month')
      .eq('properties.user_id', user.id)
      .gte('accounting_month', startDate)
      .lte('accounting_month', endDate)
      .order('accounting_month')
      .limit(50);

    if (allMonthsError) {
      console.error('Erreur lors de la récupération des données par mois:', allMonthsError);
    } else {
      console.log('Tous les accounting_month trouvés:', allMonthsData?.map(s => s.accounting_month));
    }

    // Récupérer les transactions fiscales pour l'année avec une requête plus large
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        amount,
        description,
        date,
        accounting_month,
        type,
        properties!inner(name, user_id)
      `)
      .eq('properties.user_id', user.id)
      .gte('accounting_month', startDate)
      .lte('accounting_month', endDate)
      .order('accounting_month', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
      throw new Error(`Erreur lors de la récupération des données: ${error.message}`);
    }

    console.log('=== DEBUG AUTOFILL ===');
    console.log('Utilisateur connecté:', user.id);
    console.log('Période:', startDate, 'à', endDate);
    console.log('Nombre de transactions trouvées:', transactions?.length || 0);

    // Filtrer et afficher spécifiquement les transactions de janvier
    const januaryTransactions = transactions?.filter(t =>
      t.accounting_month && t.accounting_month.startsWith(`${targetYear}-01`)
    ) || [];

    console.log('=== TRANSACTIONS DE JANVIER ===');
    console.log('Nombre de transactions en janvier:', januaryTransactions.length);
    januaryTransactions.forEach((t, i) => {
      console.log(`Janvier ${i}:`, {
        id: t.id,
        amount: t.amount,
        description: t.description,
        accounting_month: t.accounting_month,
        type: t.type,
        property: (t.properties as any)?.name
      });
    });

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

      // Classifier les transactions avec des critères plus larges
      const isLoyer = category?.name?.toLowerCase().includes('loyer') ||
                     category?.name?.toLowerCase().includes('revenu') ||
                     transaction.description?.toLowerCase().includes('loyer') ||
                     transaction.description?.toLowerCase().includes('mensuel') ||
                     transaction.description?.toLowerCase().includes('loyer') ||
                     (type?.name?.toLowerCase().includes('loyer'));

      const isChargeDeductible = type?.deductible ||
                               category?.name?.toLowerCase().includes('charge') ||
                               category?.name?.toLowerCase().includes('travaux') ||
                               category?.name?.toLowerCase().includes('entretien') ||
                               category?.name?.toLowerCase().includes('réparation') ||
                               category?.name?.toLowerCase().includes('frais') ||
                               transaction.description?.toLowerCase().includes('charge') ||
                               transaction.description?.toLowerCase().includes('travaux') ||
                               transaction.description?.toLowerCase().includes('entretien') ||
                               transaction.description?.toLowerCase().includes('réparation') ||
                               transaction.description?.toLowerCase().includes('frais');

      if (isLoyer && Number(transaction.amount) > 0) {
        loyersPercus += Number(transaction.amount);
        detailedTransactions.push({
          id: transaction.id,
          amount: Number(transaction.amount),
          description: transaction.description || '',
          date: transaction.accounting_month || transaction.date,
          type: 'Loyer',
          property_name: (transaction.properties as any)?.name || 'Propriété inconnue'
        });
        console.log('Loyer détecté:', transaction.description, 'Montant:', transaction.amount);
      } else if (isChargeDeductible && Number(transaction.amount) > 0) {
        chargesDeductibles += Number(transaction.amount);
        detailedTransactions.push({
          id: transaction.id,
          amount: Number(transaction.amount),
          description: transaction.description || '',
          date: transaction.accounting_month || transaction.date,
          type: 'Charge déductible',
          property_name: (transaction.properties as any)?.name || 'Propriété inconnue'
        });
        console.log('Charge détectée:', transaction.description, 'Montant:', transaction.amount);
      }
    });

    console.log('=== RÉSULTATS FINAUX ===');
    console.log('Loyers perçus:', loyersPercus);
    console.log('Charges déductibles:', chargesDeductibles);
    console.log('Nombre de loyers classés:', detailedTransactions.filter(t => t.type === 'Loyer').length);
    console.log('Nombre de charges classées:', detailedTransactions.filter(t => t.type === 'Charge déductible').length);

    // Analyser spécifiquement les résultats de janvier
    const januaryResults = detailedTransactions.filter(t =>
      t.date && t.date.startsWith(`${targetYear}-01`)
    );

    console.log('=== RÉSULTATS POUR JANVIER ===');
    console.log('Nombre de loyers détectés en janvier:', januaryResults.filter(t => t.type === 'Loyer').length);
    console.log('Nombre de charges détectées en janvier:', januaryResults.filter(t => t.type === 'Charge déductible').length);
    console.log('Total montant janvier:', januaryResults.reduce((sum, t) => sum + t.amount, 0));

    januaryResults.forEach((t, i) => {
      console.log(`Résultat janvier ${i}:`, {
        date: t.date,
        type: t.type,
        property: t.property_name,
        amount: t.amount,
        description: t.description
      });
    });

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
