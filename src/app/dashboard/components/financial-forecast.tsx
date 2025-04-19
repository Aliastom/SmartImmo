'use client'

import { motion } from 'framer-motion'

type FinancialForecastProps = {
  stats: {
    monthlyIncome: number
    potentialMonthlyIncome: number
    totalExpenses: number
    potentialMonthlyExpenses: number
    netProfit: number
    potentialNetProfit: number
    occupancyRate: number
  }
}

export function FinancialForecast({ stats }: FinancialForecastProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Calculer les différences entre réel et potentiel
  const incomeDifference = stats.potentialMonthlyIncome - stats.monthlyIncome
  const expenseDifference = stats.potentialMonthlyExpenses - stats.totalExpenses
  const profitDifference = stats.potentialNetProfit - stats.netProfit

  // Formater les différences avec signe + ou -
  const formatDifference = (diff: number) => {
    const prefix = diff >= 0 ? '+' : ''
    return `${prefix}${formatCurrency(diff)}`
  }

  // Déterminer la couleur en fonction de la valeur
  const getDifferenceColor = (diff: number, isProfit = false) => {
    if (isProfit) {
      return diff >= 0 ? 'text-green-600' : 'text-red-600'
    }
    return diff <= 0 ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-500">Revenus mensuels</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500">Actuel</p>
            <p className="text-xl font-bold">{formatCurrency(stats.monthlyIncome)}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500">Potentiel</p>
            <p className="text-xl font-bold">{formatCurrency(stats.potentialMonthlyIncome)}</p>
            <p className={`text-xs ${getDifferenceColor(incomeDifference)}`}>
              {formatDifference(incomeDifference)}
            </p>
            <p className="text-xs text-gray-500 mt-1 italic">
              Calculé avec tous les biens loués au loyer défini
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-500">Dépenses mensuelles</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500">Actuel</p>
            <p className="text-xl font-bold">{formatCurrency(stats.totalExpenses)}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500">Potentiel</p>
            <p className="text-xl font-bold">{formatCurrency(stats.potentialMonthlyExpenses)}</p>
            <p className={`text-xs ${getDifferenceColor(expenseDifference)}`}>
              {formatDifference(expenseDifference)}
            </p>
            <p className="text-xs text-gray-500 mt-1 italic">
              Inclut charges fixes, emprunts et provisions pour travaux (5%)
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-500">Bénéfice net</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500">Actuel</p>
            <p className="text-xl font-bold">{formatCurrency(stats.netProfit)}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-gray-500">Potentiel</p>
            <p className="text-xl font-bold">{formatCurrency(stats.potentialNetProfit)}</p>
            <p className={`text-xs ${getDifferenceColor(profitDifference, true)}`}>
              {formatDifference(profitDifference)}
            </p>
            <p className="text-xs text-gray-500 mt-1 italic">
              Revenus potentiels moins dépenses potentielles
            </p>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-700">
            {stats.occupancyRate < 100 
              ? `Avec un taux d'occupation de 100% (actuellement ${Math.round(stats.occupancyRate)}%), 
                 votre bénéfice net mensuel pourrait augmenter de ${formatCurrency(profitDifference)}.`
              : `Félicitations ! Votre taux d'occupation est de 100%. Vous maximisez déjà vos revenus potentiels.`
            }
          </p>
        </div>
      </div>
    </div>
  )
}
