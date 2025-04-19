export interface PropertyRegime {
  id: string;
  name: string;
  location_type: string | null;
  rental_type: string | null;
  revenue_threshold: string | null;
  flat_deduction: string | null;
  real_expenses_deduction: boolean;
  property_amortization: boolean;
  capital_gain_duration: string | null;
  accounting_type: string | null;
  advantages: string | null;
  disadvantages: string | null;
  created_at: string;
  updated_at: string;
}

export const propertyRegimeLabels = {
  name: "Nom du statut/régime",
  location_type: "Type de bien",
  rental_type: "Type de location",
  revenue_threshold: "Seuil de revenus",
  flat_deduction: "Abattement forfaitaire",
  real_expenses_deduction: "Déduction charges réelles",
  property_amortization: "Amortissement du bien",
  capital_gain_duration: "Durabilité sur plus-value",
  accounting_type: "Comptabilité",
  advantages: "Avantages",
  disadvantages: "Inconvénients"
};

export const propertyRegimeOptions = [
  { value: 'non-meublee', label: 'Non meublée' },
  { value: 'lmnp-micro-bic', label: 'LMNP - Micro-BIC' },
  { value: 'lmnp-reel', label: 'LMNP - Réel' },
  { value: 'lmp', label: 'LMP' },
  { value: 'de-a-pro', label: 'De à Pro' },
  { value: 'scpi', label: 'SCPI' },
  { value: 'pinel', label: 'Pinel' },
  { value: 'malraux', label: 'Malraux' },
  { value: 'monuments-historiques', label: 'Monuments historiques / Déficit foncier' }
];
