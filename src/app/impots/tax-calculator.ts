import { TaxData } from './types'

interface TaxBracket {
  min: number
  max: number | null
  rate: number
}

const TAX_BRACKETS_2025: TaxBracket[] = [
  { min: 0, max: 11294, rate: 0 },
  { min: 11295, max: 28797, rate: 0.11 },
  { min: 28798, max: 82341, rate: 0.30 },
  { min: 82342, max: 177106, rate: 0.41 },
  { min: 177107, max: null, rate: 0.45 }
]

function calculateTaxForBracket(income: number, bracket: TaxBracket): number {
  const min = Math.max(0, income - bracket.min)
  const max = bracket.max ? Math.min(min, bracket.max - bracket.min) : min
  return max * bracket.rate
}

function calculateDecote(tax: number): number {
  const singleDecoteThreshold = 1840
  const decoteBase = 833

  if (tax <= singleDecoteThreshold) {
    return Math.max(0, decoteBase - (tax * 0.4525))
  }

  return 0
}

export type { TaxBracket }

const calculateTax = (
  annualSalary: number,
  rentalIncome: number,
  rentalCharges: number,
  per: number,
  children: number,
  situation: 'single' | 'couple' | 'family'
): TaxData => {
  // 1. Calcul du revenu imposable
  const perDeduction = Math.min(per * 0.9, annualSalary * 0.1) // 90% du PER déductible, plafonné à 10% des revenus
  const rentalIncomeTaxable = rentalIncome - rentalCharges // Revenus fonciers imposables = revenus bruts - charges
  const taxableIncome = annualSalary - perDeduction + rentalIncomeTaxable

  // 2. Calcul du quotient familial
  let parts = 1
  if (situation === 'couple') parts = 2
  if (situation === 'family') parts = 2 + (children * 0.5)

  // 3. Division du revenu par le nombre de parts
  const taxableIncomePerPart = taxableIncome / parts

  // 4. Calcul de l'impôt par part
  let taxPerPart = 0
  for (const bracket of TAX_BRACKETS_2025) {
    taxPerPart += calculateTaxForBracket(taxableIncomePerPart, bracket)
  }

  // 5. Multiplication par le nombre de parts
  let tax = taxPerPart * parts

  // 6. Plafonnement des effets du quotient familial
  const maxBenefitPerHalfPart = 1678 // Plafond 2025
  const basicTax = calculateTaxForBracket(taxableIncome, { min: 0, max: null, rate: 0.30 })
  const familyBenefit = basicTax - tax
  const maxBenefit = maxBenefitPerHalfPart * (parts - 1) * 2
  if (familyBenefit > maxBenefit) {
    tax = basicTax - maxBenefit
  }

  // 7. Réductions spécifiques
  // Décote
  const decote = calculateDecote(tax)
  tax = Math.max(0, tax - decote)

  return {
    tax: Math.round(tax),
    taxableIncome: Math.round(taxableIncome),
    effectiveRate: taxableIncome > 0 ? Math.round((tax / taxableIncome) * 100) : 0
  }
}

export default calculateTax
