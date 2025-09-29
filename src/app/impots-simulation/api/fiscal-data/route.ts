import { NextRequest, NextResponse } from 'next/server';
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

async function getFiscalDataForYearInternal(year?: number, userId?: string): Promise<FiscalData> {
  const supabase = createServerComponentClient({ cookies });

  // Si pas d'année spécifiée, utiliser l'année en cours
  const targetYear = year || new Date().getFullYear();

  const startDate = `${targetYear}-01`;
  const endDate = `${targetYear}-12`;

  console.log('=== PARAMÈTRES DE RECHERCHE (API ROUTE) ===');
  console.log('Année cible:', targetYear);
  console.log('Période complète:', startDate, 'à', endDate);
  console.log('Format utilisé: YYYY-MM');

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
    .eq('properties.user_id', userId)
    .gte('accounting_month', startDate)
    .lte('accounting_month', endDate)
    .order('accounting_month', { ascending: false });

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
    }
  });

  console.log('Loyers perçus:', loyersPercus);
  console.log('Charges déductibles:', chargesDeductibles);

  return {
    loyersPercus,
    chargesDeductibles,
    transactions: detailedTransactions
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });

    // Récupérer l'utilisateur actuel depuis la session côté serveur
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('Erreur d\'authentification:', authError);
      return NextResponse.json({ error: 'Erreur d\'authentification' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    // Récupérer l'année depuis les paramètres de requête
    const url = new URL(request.url);
    const year = url.searchParams.get('year');
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const fiscalData = await getFiscalDataForYearInternal(targetYear, user.id);

    return NextResponse.json(fiscalData);
  } catch (error) {
    console.error('Erreur lors de la récupération des données fiscales:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}
