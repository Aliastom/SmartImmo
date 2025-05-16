'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  ComposedChart,
  Area
} from 'recharts'
import { addMonths, format, differenceInMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

interface LoanChartProps {
  amount: number
  interestRate: number
  insuranceRate?: number | null
  startDate: string
  endDate?: string | null
  monthlyPayment?: number | null
  remainingCapital?: number | null
  paymentDay?: number | null
}

export function LoanChart({ 
  amount, 
  interestRate, 
  insuranceRate,
  startDate, 
  endDate, 
  monthlyPayment, 
  remainingCapital,
  paymentDay
}: LoanChartProps) {
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    // Calculer les données du graphique
    generateChartData()
  }, [amount, interestRate, insuranceRate, startDate, endDate, monthlyPayment, remainingCapital, paymentDay])

  const generateChartData = () => {
    // Si les données essentielles sont manquantes, ne pas générer le graphique
    if (!amount || !interestRate || !startDate || !monthlyPayment) {
      setChartData([])
      return
    }

    const data = []
    const monthlyInterestRate = interestRate / 100 / 12
    const monthlyInsuranceRate = (insuranceRate || 0) / 100 / 12
    
    // Déterminer le capital initial en fonction de la date de début
    const startDateObj = new Date(startDate)
    // Utiliser une date de référence fixe pour 2025 (16 avril 2025)
    const referenceDate = new Date('2025-04-16')
    let initialCapital = remainingCapital || amount
    
    // Si le capital restant est fourni, l'utiliser comme point de départ
    // Sinon, calculer le capital restant à la date actuelle
    if (!remainingCapital && startDateObj <= referenceDate) {
      // Nombre de mois écoulés depuis le début du prêt
      const monthsElapsed = (referenceDate.getFullYear() - startDateObj.getFullYear()) * 12 + 
                           (referenceDate.getMonth() - startDateObj.getMonth())
      
      // Pour chaque mois écoulé, calculer le remboursement du capital
      let currentCapital = amount
      for (let i = 0; i < monthsElapsed; i++) {
        // Calculer les intérêts du mois
        const monthlyInterest = currentCapital * monthlyInterestRate
        
        // Calculer l'assurance du mois
        const monthlyInsurance = amount * monthlyInsuranceRate
        
        // Calculer le remboursement du capital
        const principalPayment = monthlyPayment - monthlyInterest - monthlyInsurance
        
        // Mettre à jour le capital restant
        currentCapital = Math.max(0, currentCapital - principalPayment)
      }
      
      initialCapital = currentCapital
    }
    
    // Utiliser la date de référence comme point de départ pour le graphique
    let currentDateForChart = new Date(referenceDate)
    let currentCapital = initialCapital
    
    // Déterminer la date de fin si elle n'est pas fournie
    let loanEndDate
    if (endDate) {
      loanEndDate = new Date(endDate)
    } else {
      // Calculer la durée approximative du prêt restant
      // Soustraire l'assurance du paiement mensuel pour le calcul
      const monthlyPaymentWithoutInsurance = monthlyPayment - (amount * monthlyInsuranceRate)
      const numberOfMonths = Math.ceil(
        Math.log(monthlyPaymentWithoutInsurance / (monthlyPaymentWithoutInsurance - currentCapital * monthlyInterestRate)) / 
        Math.log(1 + monthlyInterestRate)
      )
      loanEndDate = new Date(currentDateForChart)
      loanEndDate.setMonth(loanEndDate.getMonth() + numberOfMonths)
    }

    // Limiter à 30 ans maximum pour éviter les erreurs de calcul
    const maxEndDate = new Date(currentDateForChart)
    maxEndDate.setFullYear(maxEndDate.getFullYear() + 30)
    if (loanEndDate > maxEndDate) {
      loanEndDate = maxEndDate
    }

    // Générer les données mensuelles à partir de la date actuelle
    const totalMonths = Math.max(1, Math.floor((loanEndDate.getTime() - currentDateForChart.getTime()) / (30 * 24 * 60 * 60 * 1000)))
    
    // Ajouter le point de départ
    data.push({
      date: format(currentDateForChart, 'MM/yyyy'),
      capital: currentCapital,
      intérêts: 0,
      assurance: 0,
      principal: 0
    })

    for (let i = 1; i <= totalMonths; i++) {
      // Calculer les intérêts du mois
      const monthlyInterest = currentCapital * monthlyInterestRate
      
      // Calculer l'assurance du mois
      const monthlyInsurance = amount * monthlyInsuranceRate
      
      // Calculer le remboursement du capital
      const principalPayment = monthlyPayment - monthlyInterest - monthlyInsurance
      
      // Mettre à jour le capital restant
      currentCapital = Math.max(0, currentCapital - principalPayment)
      
      // Avancer d'un mois
      currentDateForChart = addMonths(currentDateForChart, 1)
      
      // Ajouter les données au graphique
      data.push({
        date: format(currentDateForChart, 'MM/yyyy'),
        capital: Math.round(currentCapital * 100) / 100,
        intérêts: Math.round(monthlyInterest * 100) / 100,
        assurance: Math.round(monthlyInsurance * 100) / 100,
        principal: Math.round(principalPayment * 100) / 100
      })

      // Si le capital est remboursé, arrêter
      if (currentCapital <= 0) break
    }

    // Limiter le nombre de points pour une meilleure lisibilité
    const filteredData = filterDataPoints(data, 24)
    setChartData(filteredData)
  }

  // Fonction pour réduire le nombre de points sur le graphique
  const filterDataPoints = (data: any[], maxPoints: number) => {
    if (data.length <= maxPoints) return data
    
    const step = Math.ceil(data.length / maxPoints)
    return data.filter((_, index) => index % step === 0 || index === data.length - 1)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  if (chartData.length === 0) {
    return null
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Évolution du capital restant dû</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                yAxisId="left"
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
                domain={[0, 'auto']}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => `${value}€`}
                tick={{ fontSize: 12 }}
                domain={[0, 'auto']}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="capital" 
                name="Capital restant" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 6 }}
              />
              <Bar
                yAxisId="right"
                dataKey="intérêts" 
                name="Intérêts" 
                fill="#ef4444" 
                barSize={20}
              />
              {insuranceRate && insuranceRate > 0 && (
                <Bar
                  yAxisId="right"
                  dataKey="assurance" 
                  name="Assurance" 
                  fill="#f97316" 
                  barSize={20}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>
            {paymentDay 
              ? `Chaque ${paymentDay} du mois, votre capital restant diminue de ${formatCurrency((monthlyPayment || 0) - ((remainingCapital || amount) * (interestRate / 100 / 12)) - (amount * ((insuranceRate || 0) / 100 / 12)))}.`
              : 'Définissez un jour de paiement mensuel pour suivre l\'évolution de votre capital restant.'}
          </p>
          <p className="mt-2">
            Mensualité totale : {formatCurrency(monthlyPayment || 0)} (dont {formatCurrency((remainingCapital || amount) * (interestRate / 100 / 12))} d'intérêts 
            {insuranceRate && insuranceRate > 0 ? ` et ${formatCurrency(amount * (insuranceRate / 100 / 12))} d'assurance` : ''})
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
