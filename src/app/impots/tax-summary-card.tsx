import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { TaxSummaryData, TaxEstimationData, TaxProjectionData } from './types'
import { motion } from 'framer-motion'
import { AnimatedCard } from '@/components/ui/animated'

interface TaxSummaryCardProps {
  title: string
  icon: string
  data: TaxSummaryData | TaxEstimationData | TaxProjectionData
}

export function TaxSummaryCard({ title, icon, data }: TaxSummaryCardProps) {
  function renderContent() {
    if ('annualIncome' in data) {
      const rentalIncomeTaxable = (data as TaxSummaryData).rentalIncome - (data as TaxSummaryData).rentalCharges
      return (
        <>
          <motion.div 
            className="mb-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <p className="text-sm text-gray-500 mb-1">Revenus salariés</p>
            <p className="text-xl font-semibold">{formatCurrency(data.annualIncome)}</p>
          </motion.div>
          <motion.div 
            className="mb-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <p className="text-sm text-gray-500 mb-1">Revenus fonciers imposables</p>
            <p className="text-xl font-semibold">{formatCurrency(rentalIncomeTaxable)}</p>
            <div className="mt-2 text-xs text-gray-400 space-y-1">
              <p>Revenus bruts : {formatCurrency((data as TaxSummaryData).rentalIncome)}</p>
              <p>Charges : {formatCurrency((data as TaxSummaryData).rentalCharges)}</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <p className="text-sm text-gray-500 mb-1">Versements PER</p>
            <p className="text-xl font-semibold">{formatCurrency(data.savings)}</p>
          </motion.div>
        </>
      )
    }

    if ('estimatedTax' in data) {
      return (
        <>
          <motion.div 
            className="mb-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <p className="text-sm text-gray-500 mb-1">Impôt estimé</p>
            <p className="text-xl font-semibold">{formatCurrency(data.estimatedTax)}</p>
          </motion.div>
          <motion.div 
            className="mb-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <p className="text-sm text-gray-500 mb-1">Revenu imposable</p>
            <p className="text-xl font-semibold">{formatCurrency(data.taxableIncome)}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <p className="text-sm text-gray-500 mb-1">Taux effectif</p>
            <p className="text-xl font-semibold">{data.effectiveRate}%</p>
          </motion.div>
        </>
      )
    }

    if ('projectedTax' in data) {
      const differenceClass = data.difference > 0 ? 'text-red-600' : 'text-green-600'
      return (
        <>
          <motion.div 
            className="mb-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <p className="text-sm text-gray-500 mb-1">Impôt projeté</p>
            <p className="text-xl font-semibold">{formatCurrency(data.projectedTax)}</p>
          </motion.div>
          <motion.div 
            className="mb-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <p className="text-sm text-gray-500 mb-1">Différence</p>
            <p className={`text-xl font-semibold ${differenceClass}`}>
              {data.difference > 0 ? '+' : ''}{formatCurrency(data.difference)}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <p className="text-sm text-gray-500 mb-1">Taux projeté</p>
            <p className="text-xl font-semibold">{data.projectedRate}%</p>
          </motion.div>
        </>
      )
    }

    return null
  }

  // Icônes SVG pour remplacer Font Awesome
  const getIcon = () => {
    switch (icon) {
      case 'wallet':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
            <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
          </svg>
        )
      case 'calculator':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zm1-4a1 1 0 100 2h.01a1 1 0 100-2H7zm2 1a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm4-4a1 1 0 100 2h.01a1 1 0 100-2H13zM9 9a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zM7 8a1 1 0 000 2h.01a1 1 0 000-2H7z" clipRule="evenodd" />
          </svg>
        )
      case 'chart-line':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <Card className="p-6 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center mb-6">
        <motion.div 
          className="mr-3"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {getIcon()}
        </motion.div>
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      </div>
      {renderContent()}
    </Card>
  )
}
