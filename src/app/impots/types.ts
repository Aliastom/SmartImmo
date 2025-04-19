export interface TaxData {
  tax: number
  taxableIncome: number
  effectiveRate: number
}

export interface FinancialData {
  // Revenus salariés
  currentSalary: number
  projectedSalary: number

  // Revenus fonciers
  currentRentalIncome: number
  projectedRentalIncome: number
  
  // Charges foncières déductibles
  currentCharges: number
  projectedCharges: number
  
  // Détail des charges foncières
  currentPropertyTax: number      // Taxe foncière
  projectedPropertyTax: number
  currentMaintenance: number      // Travaux d'entretien
  projectedMaintenance: number
  currentInsurance: number        // Assurance
  projectedInsurance: number
  currentLoanInterest: number     // Intérêts d'emprunt
  projectedLoanInterest: number
  currentManagementFees: number   // Frais de gestion
  projectedManagementFees: number
  
  // Épargne retraite
  currentPer: number
  projectedPer: number

  // Situation fiscale
  children: number
  situation: 'single' | 'couple' | 'family'
}

export interface TaxSummaryData {
  annualIncome: number
  rentalIncome: number
  rentalCharges: number
  savings: number
}

export interface TaxEstimationData {
  estimatedTax: number
  effectiveRate: number
  taxableIncome: number
  socialTax: number           // Prélèvements sociaux (17.2%)
  totalTax: number           // Impôt sur le revenu + prélèvements sociaux
}

export interface TaxProjectionData {
  projectedTax: number
  difference: number
  projectedRate: number
  projectedSocialTax: number
  projectedTotalTax: number
}

export type IconType = 'wallet' | 'calculator' | 'chart-line'
