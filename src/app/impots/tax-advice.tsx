import { Card } from '@/components/ui/card'
import { TaxData, FinancialData } from './types'

interface TaxAdviceProps {
  currentTaxData: TaxData
  projectedTaxData: TaxData
  financialData: FinancialData
}

interface Advice {
  icon: string
  title: string
  description: string
  impact: 'positive' | 'negative' | 'neutral'
}

export function TaxAdvice({ currentTaxData, projectedTaxData, financialData }: TaxAdviceProps) {
  const advice: Advice[] = []

  // Analyse des données pour générer des conseils
  const generateAdvice = () => {
    const totalIncome = financialData.currentSalary + financialData.projectedSalary

    // Conseil sur le PER
    const maxPerDeduction = totalIncome * 0.1
    const totalPer = financialData.currentPer + financialData.projectedPer
    if (totalPer < maxPerDeduction) {
      advice.push({
        icon: 'piggy-bank',
        title: 'Optimisation PER',
        description: `Vous pouvez encore verser ${Math.round(maxPerDeduction - totalPer)}€ sur votre PER pour optimiser votre fiscalité.`,
        impact: 'positive'
      })
    }

    // Conseil sur les charges déductibles
    const totalCharges = financialData.currentCharges + financialData.projectedCharges
    const totalRentalIncome = financialData.currentRentalIncome + financialData.projectedRentalIncome
    if (totalCharges < totalRentalIncome * 0.3) {
      advice.push({
        icon: 'receipt',
        title: 'Charges déductibles',
        description: 'Vos charges semblent faibles par rapport à vos revenus fonciers. Vérifiez que vous avez bien déclaré toutes vos charges déductibles.',
        impact: 'neutral'
      })
    }

    // Conseil sur l'évolution de l'impôt
    const taxDifference = projectedTaxData.tax - currentTaxData.tax
    if (taxDifference > 1000) {
      advice.push({
        icon: 'chart-line',
        title: 'Évolution significative',
        description: `Votre impôt devrait augmenter de ${Math.round(taxDifference)}€ d'ici la fin de l'année. Pensez à anticiper cette hausse.`,
        impact: 'negative'
      })
    }

    // Conseil sur le quotient familial
    if (financialData.situation === 'single' && financialData.children > 0) {
      advice.push({
        icon: 'users',
        title: 'Situation familiale',
        description: "En tant que parent isolé, vous bénéficiez d'une demi-part supplémentaire. Vérifiez que votre situation est bien prise en compte.",
        impact: 'positive'
      })
    }

    // Conseil sur les tranches
    const effectiveRateDiff = projectedTaxData.effectiveRate - currentTaxData.effectiveRate
    if (effectiveRateDiff > 5) {
      advice.push({
        icon: 'alert-triangle',
        title: 'Changement de tranche',
        description: "Attention, vous risquez de changer de tranche d'imposition. Cela peut avoir un impact significatif sur votre taux effectif.",
        impact: 'negative'
      })
    }
  }

  generateAdvice()

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Conseils fiscaux</h3>
      <div className="space-y-4">
        {advice.map((item, index) => (
          <div key={index} className="flex items-start">
            <div className={`mr-3 mt-1 ${
              item.impact === 'positive' ? 'text-green-500' :
              item.impact === 'negative' ? 'text-red-500' :
              'text-gray-500'
            }`}>
              <i className={`fas fa-${item.icon}`}></i>
            </div>
            <div>
              <h4 className="font-medium">{item.title}</h4>
              <p className="text-sm text-gray-600">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
