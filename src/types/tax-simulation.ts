export interface TaxSimulationInput {
  salaire_brut_annuel: number;
  parts_quotient_familial: number;
  versement_PER_deductible?: number;
  loyers_percus_total?: number;
  charges_foncieres_total?: number;
  travaux_deja_effectues?: number;
  regime_foncier: 'reel' | 'micro';
  autres_revenus_imposables?: number;
  autofill_from_db?: boolean;
}

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

export interface TaxConfig {
  tax_brackets: TaxBracket[];
  social_security_rate: number;
  abattement_rate: number;
}

export interface TaxCalculationResult {
  // Données d'entrée
  salaire_brut_annuel: number;
  salaire_imposable: number;
  revenu_foncier_net: number;
  loyers_percus_total: number;
  charges_foncieres_total: number;
  travaux_deja_effectues?: number;
  versement_PER_deductible?: number;
  regime_foncier: 'reel' | 'micro';
  autofill_from_db?: boolean;

  // IR pour les deux scénarios
  IR_sans_foncier: number;
  IR_avec_foncier: number;

  // Prélèvements sociaux
  PS_foncier: number;

  // Totaux
  total_sans_foncier: number;
  total_avec_foncier: number;
  delta_impot: number;

  // Bénéfice net
  benefice_net: number;
  benefice_brut: number;
  total_charges: number;

  // Taux effectifs
  taux_effectif_sans_foncier: number;
  taux_effectif_avec_foncier: number;
}

export interface AutofillData {
  loyers_percus_total: number;
  charges_foncieres_total: number;
}
