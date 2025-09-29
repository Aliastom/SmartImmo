import { NextRequest, NextResponse } from 'next/server';
import type { TaxSimulationInput, TaxCalculationResult, AutofillData } from '@/types/tax-simulation';

// Fonction temporaire pour l'autofill (retourne des valeurs vides)
async function getAutofillData(userId: string): Promise<AutofillData> {
  return {
    loyers_percus_total: 0,
    charges_foncieres_total: 0
  };
}

// Fonction de calcul de l'IR selon le barème progressif
function calculateIR(netIncome: number, parts: number, taxBrackets: any[]): number {
  const partIncome = netIncome / parts;
  let totalTax = 0;

  for (const bracket of taxBrackets) {
    if (partIncome > bracket.min) {
      const taxableInBracket = Math.min(partIncome, bracket.max || Infinity) - bracket.min;
      if (taxableInBracket > 0) {
        totalTax += taxableInBracket * bracket.rate;
      }
    }
  }

  return totalTax * parts;
}

// Fonction principale de calcul de simulation
async function calculateTaxSimulation(input: TaxSimulationInput, userId: string): Promise<TaxCalculationResult> {
  // Configuration fiscale française 2024 (tranches et taux)
  const TAX_BRACKETS_2024 = [
    { min: 0, max: 11294, rate: 0 },
    { min: 11295, max: 28797, rate: 0.11 },
    { min: 28798, max: 82341, rate: 0.30 },
    { min: 82342, max: 177106, rate: 0.41 },
    { min: 177107, max: null, rate: 0.45 }
  ];

  const SOCIAL_SECURITY_RATE = 0.172; // 17,2%
  const ABATTEMENT_RATE = 0.10; // 10%

  const abattement = input.salaire_brut_annuel * ABATTEMENT_RATE;

  let loyers_percus_total = input.loyers_percus_total || 0;
  let charges_foncieres_total = input.charges_foncieres_total || 0;

  // Si autofill activé, récupérer les données depuis la DB
  if (input.autofill_from_db) {
    const autofillData = await getAutofillData(userId);
    loyers_percus_total = autofillData?.loyers_percus_total || 0;
    charges_foncieres_total = autofillData?.charges_foncieres_total || 0;
  }

  // Calcul du salaire imposable
  const salaire_imposable = Math.max(
    input.salaire_brut_annuel - abattement - (input.versement_PER_deductible || 0),
    0
  );

  // Calcul du revenu foncier net selon le régime
  let revenu_foncier_net = 0;
  if (loyers_percus_total > 0) {
    if (input.regime_foncier === 'micro') {
      // Abattement de 30% pour le micro-foncier
      revenu_foncier_net = loyers_percus_total * 0.70;
    } else {
      // Régime réel : loyers - charges - travaux
      const totalCharges = charges_foncieres_total + (input.travaux_deja_effectues || 0);
      revenu_foncier_net = Math.max(loyers_percus_total - totalCharges, 0);
    }
  }

  // Calcul des revenus imposables pour les deux scénarios
  const autres_revenus = input.autres_revenus_imposables || 0;
  const revenus_sans_foncier = salaire_imposable + autres_revenus;
  const revenus_avec_foncier = revenus_sans_foncier + revenu_foncier_net;

  // Calcul de l'IR pour les deux scénarios
  const IR_sans_foncier = calculateIR(revenus_sans_foncier, input.parts_quotient_familial, TAX_BRACKETS_2024);
  const IR_avec_foncier = calculateIR(revenus_avec_foncier, input.parts_quotient_familial, TAX_BRACKETS_2024);

  // Calcul des prélèvements sociaux sur les revenus fonciers
  const PS_foncier = revenu_foncier_net * SOCIAL_SECURITY_RATE;

  // Calcul des totaux
  const total_sans_foncier = IR_sans_foncier;
  const total_avec_foncier = IR_avec_foncier + PS_foncier;
  const delta_impot = total_avec_foncier - total_sans_foncier;

  // Calcul du bénéfice net immobilier
  const totalCharges = charges_foncieres_total + (input.travaux_deja_effectues || 0);
  const benefice_brut = loyers_percus_total - totalCharges;
  const benefice_net = benefice_brut - delta_impot;

  // Calcul des taux effectifs
  const taux_effectif_sans_foncier = revenus_sans_foncier > 0 ? (IR_sans_foncier / revenus_sans_foncier) * 100 : 0;
  const taux_effectif_avec_foncier = revenus_avec_foncier > 0 ? (IR_avec_foncier / revenus_avec_foncier) * 100 : 0;

  return {
    salaire_brut_annuel: input.salaire_brut_annuel,
    salaire_imposable,
    revenu_foncier_net,
    loyers_percus_total,
    charges_foncieres_total,
    travaux_deja_effectues: input.travaux_deja_effectues || 0,
    regime_foncier: input.regime_foncier,
    autofill_from_db: input.autofill_from_db || false,
    IR_sans_foncier,
    IR_avec_foncier,
    PS_foncier,
    total_sans_foncier,
    total_avec_foncier,
    delta_impot,
    benefice_net,
    benefice_brut,
    total_charges: totalCharges,
    taux_effectif_sans_foncier,
    taux_effectif_avec_foncier
  };
}

export async function POST(request: NextRequest) {
  try {
    // Note: L'autofill est temporairement désactivé, donc pas besoin de vérifier l'authentification utilisateur
    // const supabase = createClient();
    // const { data: { user } } = await supabase.auth.getUser();

    // if (!user) {
    //   return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    // }

    const input: TaxSimulationInput = await request.json();

    // Validation des entrées
    if (!input.salaire_brut_annuel || input.salaire_brut_annuel < 0) {
      return NextResponse.json({ error: 'Salaire brut annuel requis et positif' }, { status: 400 });
    }

    if (!input.parts_quotient_familial || input.parts_quotient_familial < 1) {
      return NextResponse.json({ error: 'Parts de quotient familial requises (>= 1)' }, { status: 400 });
    }

    // Temporairement, on utilise un userId fictif puisque l'autofill est désactivé
    const result = await calculateTaxSimulation(input, 'temp-user-id');

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur lors du calcul de simulation:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
